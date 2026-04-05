/**
 * Smart Stack Budgeting App - Database Schema
 * PostgreSQL / Supabase Compatible
 * Created: 2026-03-18
 *
 * This schema defines the complete data model for Smart Stack, a comprehensive
 * budgeting application with multi-user support, savings goals, group collaborations,
 * and financial integrations via Plaid and Stripe.
 */

-- ============================================================================
-- ENUMS (Custom Types)
-- ============================================================================

CREATE TYPE subscription_status_enum AS ENUM ('free', 'trial', 'premium', 'cancelled');
CREATE TYPE two_factor_method_enum AS ENUM ('email', 'authenticator', 'none');
CREATE TYPE frequency_enum AS ENUM ('weekly', 'biweekly', 'semimonthly', 'monthly');
CREATE TYPE pay_frequency_enum AS ENUM ('weekly', 'biweekly', 'semimonthly', 'monthly');
CREATE TYPE bill_status_enum AS ENUM ('upcoming', 'due', 'paid', 'partial', 'overdue');
CREATE TYPE contribution_type_enum AS ENUM ('fixed', 'percentage', 'leftover');
CREATE TYPE split_mode_enum AS ENUM ('equal', 'due_date_aware', 'priority_first');
CREATE TYPE notification_type_enum AS ENUM (
  'bill_due',
  'income_received',
  'savings_milestone',
  'low_balance',
  'group_contribution',
  'group_update',
  'payment_success',
  'payment_failed',
  'subscription_renewal',
  'weekly_summary'
);
CREATE TYPE group_member_role_enum AS ENUM ('owner', 'admin', 'member');
CREATE TYPE group_activity_type_enum AS ENUM ('contribution', 'milestone', 'join', 'message', 'celebration');
CREATE TYPE account_type_enum AS ENUM ('checking', 'savings', 'credit', 'investment', 'loan', 'other');

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,

  -- Onboarding & Trial
  onboarding_complete BOOLEAN DEFAULT FALSE,
  is_founding_user BOOLEAN DEFAULT FALSE,
  trial_start_at TIMESTAMP WITH TIME ZONE,
  trial_end_at TIMESTAMP WITH TIME ZONE,

  -- Subscription Management
  subscription_status subscription_status_enum DEFAULT 'free',
  premium_status BOOLEAN DEFAULT FALSE,

  -- Two-Factor Authentication
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_method two_factor_method_enum DEFAULT 'none',
  two_factor_secret VARCHAR(255),
  backup_codes_enabled BOOLEAN DEFAULT FALSE,
  backup_codes JSONB, -- Stores encrypted backup codes as JSON array

  -- Pay Frequency Configuration
  pay_frequency pay_frequency_enum DEFAULT 'biweekly',
  next_payday DATE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription_status ON users(subscription_status);
CREATE INDEX idx_users_created_at ON users(created_at);

COMMENT ON TABLE users IS 'Core user accounts with authentication, subscription, and 2FA configuration';
COMMENT ON COLUMN users.backup_codes IS 'Stores backup codes for account recovery, encrypted at application layer';
COMMENT ON COLUMN users.two_factor_secret IS 'TOTP secret for authenticator apps, encrypted at application layer';

-- RLS POLICY TEMPLATE:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY users_select_own ON users FOR SELECT USING (auth.uid() = id);
-- CREATE POLICY users_update_own ON users FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- INCOME SOURCES TABLE
-- ============================================================================

CREATE TABLE income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  source_name VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  frequency frequency_enum NOT NULL,
  next_payment_date DATE NOT NULL,
  recurring BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_income_sources_user_id ON income_sources(user_id);
CREATE INDEX idx_income_sources_is_active ON income_sources(user_id, is_active);
CREATE INDEX idx_income_sources_next_payment_date ON income_sources(user_id, next_payment_date);

COMMENT ON TABLE income_sources IS 'Recurring and one-time income streams for each user (salaries, side gigs, bonuses)';

-- RLS POLICY TEMPLATE:
-- ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY income_sources_user_isolation ON income_sources
--   FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- BILLS TABLE
-- ============================================================================

CREATE TABLE bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  category VARCHAR(100),
  due_date INTEGER CHECK (due_date >= 1 AND due_date <= 31), -- Day of month
  frequency frequency_enum NOT NULL,

  is_essential BOOLEAN DEFAULT TRUE,
  is_fixed BOOLEAN DEFAULT TRUE,
  autopay BOOLEAN DEFAULT FALSE,

  status bill_status_enum DEFAULT 'upcoming',
  paid_amount DECIMAL(12, 2) DEFAULT 0,

  reminder_days_before INTEGER[], -- Array of days before due date to send reminder
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT amount_positive CHECK (amount > 0),
  CONSTRAINT paid_amount_valid CHECK (paid_amount >= 0 AND paid_amount <= amount)
);

CREATE INDEX idx_bills_user_id ON bills(user_id);
CREATE INDEX idx_bills_status ON bills(user_id, status);
CREATE INDEX idx_bills_due_date ON bills(user_id, due_date);
CREATE INDEX idx_bills_is_essential ON bills(user_id, is_essential);

COMMENT ON TABLE bills IS 'Recurring and one-time bills with payment tracking and automation';
COMMENT ON COLUMN bills.due_date IS 'Day of month (1-31) when bill is due; used with frequency for scheduling';
COMMENT ON COLUMN bills.reminder_days_before IS 'Array of integers indicating days before due date to send reminders (e.g. ARRAY[3, 1])';

-- RLS POLICY TEMPLATE:
-- ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY bills_user_isolation ON bills
--   FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- EXPENSES TABLE
-- ============================================================================

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  category VARCHAR(100),
  date DATE NOT NULL,

  is_essential BOOLEAN DEFAULT FALSE,
  is_fixed BOOLEAN DEFAULT FALSE,
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(user_id, date);
CREATE INDEX idx_expenses_category ON expenses(user_id, category);

COMMENT ON TABLE expenses IS 'One-time expenses and transaction history tracking';

-- RLS POLICY TEMPLATE:
-- ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY expenses_user_isolation ON expenses
--   FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- SAVINGS GOALS TABLE
-- ============================================================================

CREATE TABLE savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  target_amount DECIMAL(12, 2) NOT NULL,
  current_amount DECIMAL(12, 2) DEFAULT 0,
  target_date DATE NOT NULL,

  contribution_type contribution_type_enum NOT NULL,
  contribution_value DECIMAL(12, 2) NOT NULL,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT target_amount_positive CHECK (target_amount > 0),
  CONSTRAINT current_amount_non_negative CHECK (current_amount >= 0),
  CONSTRAINT current_not_exceeds_target CHECK (current_amount <= target_amount),
  CONSTRAINT contribution_value_positive CHECK (contribution_value > 0)
);

CREATE INDEX idx_savings_goals_user_id ON savings_goals(user_id);
CREATE INDEX idx_savings_goals_is_active ON savings_goals(user_id, is_active);
CREATE INDEX idx_savings_goals_target_date ON savings_goals(user_id, target_date);

COMMENT ON TABLE savings_goals IS 'Personal savings targets with flexible contribution strategies';
COMMENT ON COLUMN savings_goals.contribution_type IS 'fixed: fixed amount per period, percentage: % of weekly surplus, leftover: all remaining funds';
COMMENT ON COLUMN savings_goals.contribution_value IS 'Value interpreted based on contribution_type (amount, percentage, or ignored for leftover)';

-- RLS POLICY TEMPLATE:
-- ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY savings_goals_user_isolation ON savings_goals
--   FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- WEEKLY ALLOCATIONS TABLE
-- ============================================================================

CREATE TABLE weekly_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  total_income DECIMAL(12, 2) NOT NULL,
  reserved_for_bills DECIMAL(12, 2) NOT NULL,
  reserved_for_savings DECIMAL(12, 2) NOT NULL,
  safe_to_spend_weekly DECIMAL(12, 2) NOT NULL,
  safe_to_spend_daily DECIMAL(12, 2) NOT NULL,

  shortfall_amount DECIMAL(12, 2) DEFAULT 0,
  split_mode split_mode_enum DEFAULT 'equal',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT total_income_non_negative CHECK (total_income >= 0),
  CONSTRAINT reserved_for_bills_non_negative CHECK (reserved_for_bills >= 0),
  CONSTRAINT reserved_for_savings_non_negative CHECK (reserved_for_savings >= 0),
  CONSTRAINT safe_to_spend_non_negative CHECK (safe_to_spend_weekly >= 0),
  CONSTRAINT safe_to_spend_daily_non_negative CHECK (safe_to_spend_daily >= 0),
  CONSTRAINT period_valid CHECK (period_start < period_end)
);

CREATE INDEX idx_weekly_allocations_user_id ON weekly_allocations(user_id);
CREATE INDEX idx_weekly_allocations_period ON weekly_allocations(user_id, period_start, period_end);

COMMENT ON TABLE weekly_allocations IS 'Weekly cash flow calculations and spending allocations';
COMMENT ON COLUMN weekly_allocations.split_mode IS 'Strategy for splitting available funds: equal across days, aware of bill due dates, or priority-based';
COMMENT ON COLUMN weekly_allocations.shortfall_amount IS 'Positive value if bills exceed income for the period';

-- RLS POLICY TEMPLATE:
-- ALTER TABLE weekly_allocations ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY weekly_allocations_user_isolation ON weekly_allocations
--   FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  type notification_type_enum NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,

  read_status BOOLEAN DEFAULT FALSE,
  action_url VARCHAR(500),

  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT scheduled_before_sent CHECK (scheduled_at IS NULL OR sent_at IS NULL OR scheduled_at <= sent_at)
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_status ON notifications(user_id, read_status);
CREATE INDEX idx_notifications_sent_at ON notifications(user_id, sent_at DESC);
CREATE INDEX idx_notifications_type ON notifications(user_id, type);

COMMENT ON TABLE notifications IS 'In-app and email notifications for bills, income, milestones, and updates';
COMMENT ON COLUMN notifications.scheduled_at IS 'When the notification was scheduled to be sent';
COMMENT ON COLUMN notifications.sent_at IS 'When the notification was actually delivered';

-- RLS POLICY TEMPLATE:
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY notifications_user_isolation ON notifications
--   FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- GROUPS TABLE (Collaborative Savings Goals)
-- ============================================================================

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  group_name VARCHAR(255) NOT NULL,
  goal_name VARCHAR(255) NOT NULL,
  target_amount DECIMAL(12, 2) NOT NULL,
  target_date DATE NOT NULL,
  current_amount DECIMAL(12, 2) DEFAULT 0,

  invite_code VARCHAR(16) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT target_amount_positive CHECK (target_amount > 0),
  CONSTRAINT current_amount_non_negative CHECK (current_amount >= 0),
  CONSTRAINT current_not_exceeds_target CHECK (current_amount <= target_amount)
);

CREATE INDEX idx_groups_owner_user_id ON groups(owner_user_id);
CREATE INDEX idx_groups_invite_code ON groups(invite_code);
CREATE INDEX idx_groups_is_active ON groups(is_active);

COMMENT ON TABLE groups IS 'Collaborative savings goals with shared tracking and contributions';
COMMENT ON COLUMN groups.invite_code IS 'Shareable code for members to join the group; generated as random string';

-- RLS POLICY TEMPLATE:
-- ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY groups_owner_full_access ON groups
--   FOR ALL USING (auth.uid() = owner_user_id);
-- CREATE POLICY groups_members_read_write ON groups
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM group_members
--       WHERE group_id = groups.id AND user_id = auth.uid()
--     )
--   );

-- ============================================================================
-- GROUP MEMBERS TABLE
-- ============================================================================

CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  role group_member_role_enum NOT NULL DEFAULT 'member',
  weekly_contribution_target DECIMAL(12, 2),

  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_group_member UNIQUE (group_id, user_id),
  CONSTRAINT contribution_target_positive CHECK (weekly_contribution_target IS NULL OR weekly_contribution_target > 0)
);

CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_members_role ON group_members(group_id, role);

COMMENT ON TABLE group_members IS 'Membership tracking for collaborative savings groups';

-- RLS POLICY TEMPLATE:
-- ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY group_members_user_isolation ON group_members
--   FOR ALL USING (
--     auth.uid() = user_id OR
--     EXISTS (
--       SELECT 1 FROM groups WHERE id = group_id AND owner_user_id = auth.uid()
--     )
--   );

-- ============================================================================
-- GROUP CONTRIBUTIONS TABLE
-- ============================================================================

CREATE TABLE group_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  amount DECIMAL(12, 2) NOT NULL,
  contribution_date DATE NOT NULL,
  note TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT amount_positive CHECK (amount > 0),
  CONSTRAINT valid_member CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_contributions.group_id
      AND user_id = group_contributions.user_id
    )
  )
);

CREATE INDEX idx_group_contributions_group_id ON group_contributions(group_id);
CREATE INDEX idx_group_contributions_user_id ON group_contributions(user_id);
CREATE INDEX idx_group_contributions_contribution_date ON group_contributions(group_id, contribution_date);

COMMENT ON TABLE group_contributions IS 'Records of contributions made by members toward group savings goals';

-- RLS POLICY TEMPLATE:
-- ALTER TABLE group_contributions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY group_contributions_user_isolation ON group_contributions
--   FOR ALL USING (
--     auth.uid() = user_id OR
--     EXISTS (
--       SELECT 1 FROM group_members
--       WHERE group_id = group_contributions.group_id
--       AND user_id = auth.uid()
--     )
--   );

-- ============================================================================
-- GROUP ACTIVITY TABLE
-- ============================================================================

CREATE TABLE group_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  type group_activity_type_enum NOT NULL,
  message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_member CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_activity.group_id
      AND user_id = group_activity.user_id
    )
  )
);

CREATE INDEX idx_group_activity_group_id ON group_activity(group_id);
CREATE INDEX idx_group_activity_user_id ON group_activity(user_id);
CREATE INDEX idx_group_activity_created_at ON group_activity(group_id, created_at DESC);
CREATE INDEX idx_group_activity_type ON group_activity(group_id, type);

COMMENT ON TABLE group_activity IS 'Activity feed for group collaborations (contributions, milestones, messages, celebrations)';

-- RLS POLICY TEMPLATE:
-- ALTER TABLE group_activity ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY group_activity_user_isolation ON group_activity
--   FOR ALL USING (
--     EXISTS (
--       SELECT 1 FROM group_members
--       WHERE group_id = group_activity.group_id
--       AND user_id = auth.uid()
--     )
--   );

-- ============================================================================
-- LINKED ACCOUNTS TABLE (Plaid Integration)
-- ============================================================================

/**
 * PLAID INTEGRATION NOTES:
 * - plaid_access_token: Encrypted token returned by Plaid after link auth
 * - plaid_item_id: Unique identifier for the linked institution
 * - Tokens should be encrypted at the application layer before storage
 * - Use Plaid API to fetch real-time balances, transactions, and account details
 * - Recommended refresh schedule: daily or on-demand for real-time sync
 * - Handle token refresh via Plaid's Item refresh endpoint
 */

CREATE TABLE linked_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  institution_name VARCHAR(255) NOT NULL,
  account_type account_type_enum,
  account_mask VARCHAR(10), -- Last 4 digits of account number

  plaid_access_token VARCHAR(500), -- Encrypted at application layer
  plaid_item_id VARCHAR(255) UNIQUE, -- Unique per item, nullable for manual accounts

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_linked_accounts_user_id ON linked_accounts(user_id);
CREATE INDEX idx_linked_accounts_plaid_item_id ON linked_accounts(plaid_item_id);
CREATE INDEX idx_linked_accounts_is_active ON linked_accounts(user_id, is_active);

COMMENT ON TABLE linked_accounts IS 'Bank and financial accounts linked via Plaid for transaction syncing';
COMMENT ON COLUMN linked_accounts.plaid_access_token IS 'Encrypted Plaid access token for API calls; ALWAYS encrypt before storage';
COMMENT ON COLUMN linked_accounts.plaid_item_id IS 'Unique identifier from Plaid API; use for token refresh and account updates';

-- RLS POLICY TEMPLATE:
-- ALTER TABLE linked_accounts ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY linked_accounts_user_isolation ON linked_accounts
--   FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- SUBSCRIPTIONS TABLE (Stripe Integration)
-- ============================================================================

/**
 * STRIPE INTEGRATION NOTES:
 * - stripe_customer_id: Customer object ID created in Stripe (format: cus_xxx)
 * - stripe_subscription_id: Subscription object ID (format: sub_xxx)
 * - plan_type: Maps to Stripe price ID or custom plan identifier
 * - Status values: active, past_due, canceled, unpaid, incomplete
 * - Use webhooks for subscription events (payment_intent.succeeded, customer.subscription.updated, etc.)
 * - Recommended webhook events:
 *   - invoice.payment_succeeded
 *   - invoice.payment_failed
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.upcoming
 * - Sync subscription status via webhook handler to keep data consistent
 */

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  stripe_customer_id VARCHAR(255) UNIQUE NOT NULL, -- Format: cus_xxx
  stripe_subscription_id VARCHAR(255) UNIQUE, -- Format: sub_xxx, nullable for free users

  plan_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL, -- active, past_due, canceled, unpaid, incomplete, trialing

  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

COMMENT ON TABLE subscriptions IS 'Stripe subscription records synchronized via webhooks';
COMMENT ON COLUMN subscriptions.stripe_customer_id IS 'Stripe customer ID (cus_xxx format); created during initial checkout';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe subscription ID (sub_xxx format); null for free tier users';
COMMENT ON COLUMN subscriptions.plan_type IS 'Plan identifier (e.g., ''premium-monthly'', ''premium-annual''); must match Stripe price IDs';
COMMENT ON COLUMN subscriptions.status IS 'Synced from Stripe webhooks: active, past_due, canceled, unpaid, incomplete, trialing';

-- RLS POLICY TEMPLATE:
-- ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY subscriptions_user_isolation ON subscriptions
--   FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- INDEXES FOR COMMON QUERIES
-- ============================================================================

-- Query: Get all bills due in next N days
CREATE INDEX idx_bills_next_due ON bills(user_id, due_date, status)
WHERE is_active = TRUE AND status IN ('upcoming', 'due', 'overdue');

-- Query: Get all active income sources
CREATE INDEX idx_income_active_by_user ON income_sources(user_id, is_active, next_payment_date)
WHERE is_active = TRUE;

-- Query: Get unread notifications
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_status)
WHERE read_status = FALSE;

-- Query: Get active savings goals with progress
CREATE INDEX idx_savings_progress ON savings_goals(user_id, is_active, target_date)
WHERE is_active = TRUE;

-- Query: Get all group memberships for a user
CREATE INDEX idx_group_members_by_user ON group_members(user_id, role);

-- Query: Get contributions to a group with member info
CREATE INDEX idx_group_contributions_with_member ON group_contributions(group_id, contribution_date DESC);

-- ============================================================================
-- INTEGRITY CONSTRAINTS & TRIGGERS
-- ============================================================================

/**
 * RECOMMENDED APPLICATION-LAYER TRIGGERS:
 *
 * 1. Update users.updated_at on any modification:
 *    - Trigger on INSERT/UPDATE on users table
 *
 * 2. Sync group current_amount when contributions are added:
 *    - Trigger on INSERT on group_contributions
 *    - Sum all contributions and update groups.current_amount
 *
 * 3. Validate bill status transitions:
 *    - Trigger on UPDATE on bills table
 *    - Ensure: upcoming -> due -> paid (or partial -> paid)
 *    - Prevent: paid -> upcoming or similar invalid transitions
 *
 * 4. Archive old weekly allocations:
 *    - Trigger or scheduled job to soft-delete allocations older than N months
 *    - Or create archive table for historical data
 *
 * 5. Auto-generate weekly allocations:
 *    - Scheduled job to run weekly
 *    - Calculate allocations based on income_sources and bills
 *    - Insert new row in weekly_allocations
 *
 * 6. Sync subscription status with users table:
 *    - Trigger on UPDATE on subscriptions
 *    - Update users.subscription_status and premium_status based on subscription.status
 *
 * 7. Validate group member removal constraints:
 *    - Prevent owner removal unless transferring ownership first
 *    - Trigger on DELETE on group_members
 *
 * 8. Notify on payment status changes:
 *    - Trigger on bills status UPDATE
 *    - Insert notification record when bill becomes 'due' or 'overdue'
 */

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

/**
 * VIEW: User Dashboard Summary
 * Returns aggregated financial snapshot for each user
 */
CREATE VIEW user_dashboard_summary AS
SELECT
  u.id,
  u.name,
  u.email,
  COUNT(DISTINCT i.id) as active_income_sources,
  COALESCE(SUM(i.amount), 0) as total_monthly_income,
  COUNT(DISTINCT b.id) as total_bills,
  COUNT(DISTINCT b.id) FILTER (WHERE b.status IN ('due', 'overdue')) as overdue_bills,
  COALESCE(SUM(b.amount) FILTER (WHERE b.status IN ('due', 'overdue')), 0) as total_overdue_amount,
  COUNT(DISTINCT sg.id) as active_savings_goals,
  COALESCE(SUM(sg.current_amount), 0) as total_savings_accumulated,
  COALESCE(SUM(sg.target_amount), 0) as total_savings_target,
  COUNT(DISTINCT gm.id) as group_memberships,
  u.subscription_status,
  u.updated_at
FROM users u
LEFT JOIN income_sources i ON u.id = i.user_id AND i.is_active = TRUE
LEFT JOIN bills b ON u.id = b.user_id
LEFT JOIN savings_goals sg ON u.id = sg.user_id AND sg.is_active = TRUE
LEFT JOIN group_members gm ON u.id = gm.user_id
GROUP BY u.id, u.name, u.email, u.subscription_status, u.updated_at;

COMMENT ON VIEW user_dashboard_summary IS 'Dashboard snapshot with income, bills, savings, and group data';

/**
 * VIEW: Weekly Forecast
 * Shows cash flow forecast for current and next week
 */
CREATE VIEW weekly_forecast AS
SELECT
  u.id as user_id,
  wa.period_start,
  wa.period_end,
  wa.total_income,
  wa.reserved_for_bills,
  wa.reserved_for_savings,
  wa.safe_to_spend_weekly,
  wa.safe_to_spend_daily,
  wa.shortfall_amount,
  CASE
    WHEN wa.shortfall_amount > 0 THEN 'SHORTFALL'
    WHEN wa.safe_to_spend_weekly < 0 THEN 'NEGATIVE'
    WHEN wa.safe_to_spend_weekly < (wa.total_income * 0.1) THEN 'LOW'
    ELSE 'HEALTHY'
  END as cash_flow_status
FROM users u
JOIN weekly_allocations wa ON u.id = wa.user_id
ORDER BY u.id, wa.period_start DESC;

COMMENT ON VIEW weekly_forecast IS 'Cash flow forecast and spending allocation overview';

/**
 * VIEW: Group Progress
 * Tracks group savings goal progress by member
 */
CREATE VIEW group_progress AS
SELECT
  g.id as group_id,
  g.group_name,
  g.goal_name,
  g.target_amount,
  g.current_amount,
  ROUND(100.0 * g.current_amount / g.target_amount, 2) as progress_percentage,
  g.target_date,
  DATE_TRUNC('day', g.target_date - CURRENT_DATE)::TEXT as days_remaining,
  gm.user_id,
  u.name as member_name,
  gm.role,
  COALESCE(SUM(gc.amount), 0) as member_total_contributions,
  COUNT(gc.id) as member_contribution_count
FROM groups g
JOIN group_members gm ON g.id = gm.group_id
JOIN users u ON gm.user_id = u.id
LEFT JOIN group_contributions gc ON g.id = gc.group_id AND gm.user_id = gc.user_id
WHERE g.is_active = TRUE
GROUP BY g.id, g.group_name, g.goal_name, g.target_amount, g.current_amount, g.target_date, gm.user_id, u.name, gm.role;

COMMENT ON VIEW group_progress IS 'Member contributions and progress toward group savings goals';

-- ============================================================================
-- DOCUMENTATION & INTEGRATION NOTES
-- ============================================================================

/**
 * AUTHENTICATION & SECURITY:
 * - Use bcrypt or Argon2 for password hashing (stored in password_hash column)
 * - All sensitive fields (passwords, tokens, secrets) must be encrypted at application layer
 * - Enable Row Level Security (RLS) on all user-owned tables
 * - Use Supabase Auth for session management if using Supabase
 *
 * TWO-FACTOR AUTHENTICATION:
 * - two_factor_secret: TOTP secret, encrypted and stored as BASE32 string
 * - Validate TOTP tokens using standard algorithms
 * - backup_codes: Store as encrypted JSON array of 8-character codes
 * - Generate 10 backup codes during 2FA enrollment
 *
 * PLAID INTEGRATION:
 * - Link: Use Plaid Link frontend to obtain access tokens
 * - Transactions: Use /transactions/get endpoint for transaction history
 * - Balances: Use /accounts/get endpoint for real-time balances
 * - Token refresh: Handle via /item/public_token/exchange and refresh flows
 * - Webhook: Implement Plaid webhook to track ITEM_LOGIN_REQUIRED events
 *
 * STRIPE INTEGRATION:
 * - Checkout: Use Stripe Checkout or embedded Stripe Elements
 * - Webhooks: Implement handlers for invoice and subscription events
 * - Customer sync: Create/update Stripe customer on user registration
 * - Subscription updates: Use Stripe API to upgrade/downgrade plans
 * - Billing portal: Use Stripe's hosted billing portal for self-service
 *
 * WEEKLY ALLOCATION CALCULATION:
 * - Run calculation weekly (e.g., every Monday)
 * - Aggregate all active income sources for the week
 * - Calculate all bills due in the period using due_date + frequency
 * - Apply split_mode strategy to distribute safe_to_spend amount
 * - Account for savings goals contributions
 *
 * DATA RETENTION:
 * - Retain expenses indefinitely (for historical analysis)
 * - Archive weekly_allocations older than 24 months
 * - Retain group_contributions and group_activity indefinitely
 * - Delete or obfuscate linked_accounts after account unlink
 * - Handle GDPR/CCPA deletion requests via soft-delete or data export
 *
 * PERFORMANCE NOTES:
 * - Use materialized views for dashboard queries if using complex aggregations
 * - Consider partitioning expenses and group_contributions by user_id or date
 * - Archive historical group_activity to separate table after 12 months
 * - Index on (user_id, created_at DESC) for timeline queries
 */

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

/**
 * INITIAL SETUP CHECKLIST:
 * 1. Create all enums (execute this file from the top)
 * 2. Create all tables with foreign keys and constraints
 * 3. Create all indexes
 * 4. Enable RLS on all tables (using policy templates provided)
 * 5. Create views for dashboards
 * 6. Set up database roles: authenticated, anonymous
 * 7. Create service role with full access for backend
 * 8. Configure Supabase JWT token validation if using Supabase
 * 9. Set up automated backups
 * 10. Test RLS policies with sample data
 *
 * DEPLOYMENT:
 * - Test schema in staging environment first
 * - Use migration tools (Flyway, Liquibase) for production
 * - Backup production database before applying schema changes
 * - Execute in transaction for atomic deployment
 */

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
