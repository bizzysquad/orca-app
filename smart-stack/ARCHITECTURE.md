# ORCA — Architecture & Implementation Guide

## App Overview

ORCA is a premium paycheck-based financial command center that helps users split income, stay ahead of bills, control spending, build savings with friends, report rent to credit bureaus, and improve their credit score with AI-powered insights.

### New in v2
- **Rent Reporter** — Report rent payments to all 3 credit bureaus to build credit history
- **Credit Score Dashboard** — Visual score tracking with factor breakdown and score simulator
- **AI Credit Insights** — Personalized, prioritized credit improvement recommendations
- **Dark/Light Mode** — Full theme system with gold/black luxury palette (dark) and warm gold/white (light)
- **Rebranded to ORCA** — Premium gold + black identity matching the logo

---

## Recommended Production Folder Structure

```
smart-stack/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Landing / auth
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── reset-password/page.tsx
│   ├── onboarding/page.tsx
│   ├── dashboard/page.tsx       # Balance Book
│   ├── pay-track/page.tsx
│   ├── bill-boss/page.tsx
│   ├── expense-core/page.tsx
│   ├── check-spitter/page.tsx
│   ├── savings/page.tsx
│   ├── stack-circle/
│   │   ├── page.tsx             # Groups list
│   │   └── [groupId]/page.tsx   # Single group
│   ├── insights/page.tsx
│   ├── notifications/page.tsx
│   └── settings/
│       ├── page.tsx
│       ├── security/page.tsx    # 2FA management
│       └── subscription/page.tsx
├── components/
│   ├── ui/                      # Reusable primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Toggle.tsx
│   │   ├── Modal.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── Badge.tsx
│   │   ├── TabBar.tsx
│   │   └── EmptyState.tsx
│   ├── layout/
│   │   ├── TopBar.tsx
│   │   ├── BottomNav.tsx
│   │   └── AppShell.tsx
│   ├── dashboard/
│   │   ├── HealthScore.tsx
│   │   ├── SafeToSpend.tsx
│   │   ├── UpcomingBills.tsx
│   │   └── QuickActions.tsx
│   ├── check-spitter/
│   │   ├── SplitModeSelector.tsx
│   │   ├── SplitVisual.tsx
│   │   └── BillBreakdown.tsx
│   ├── stack-circle/
│   │   ├── GroupCard.tsx
│   │   ├── MemberList.tsx
│   │   └── ActivityFeed.tsx
│   └── premium/
│       ├── PremiumBanner.tsx
│       ├── TrialBanner.tsx
│       └── PaywallModal.tsx
├── lib/
│   ├── calculations/
│   │   ├── income.ts            # Income normalization
│   │   ├── bills.ts             # Bill reserves & due-date logic
│   │   ├── allocations.ts       # Weekly allocation engine
│   │   ├── safe-to-spend.ts     # STS calculations
│   │   ├── savings.ts           # Goal tracking & forecasting
│   │   ├── insights.ts          # Rules-based insights engine
│   │   └── health.ts            # Budget health scoring
│   ├── supabase/
│   │   ├── client.ts            # Supabase client init
│   │   ├── auth.ts              # Auth helpers
│   │   ├── queries.ts           # Database queries
│   │   └── realtime.ts          # Realtime subscriptions
│   ├── stripe/
│   │   ├── client.ts            # Stripe setup
│   │   └── webhooks.ts          # Webhook handlers
│   ├── plaid/                   # FUTURE: Plaid integration
│   │   ├── client.ts
│   │   └── link.ts
│   ├── notifications/
│   │   ├── in-app.ts
│   │   ├── push.ts              # FUTURE: Push notifications
│   │   └── email.ts             # FUTURE: Email notifications
│   ├── constants.ts
│   ├── types.ts                 # TypeScript type definitions
│   └── utils.ts                 # Formatting, date helpers
├── hooks/
│   ├── useAuth.ts
│   ├── useBudget.ts
│   ├── useBills.ts
│   ├── useIncome.ts
│   ├── useSavings.ts
│   ├── useGroups.ts
│   ├── useNotifications.ts
│   └── usePremium.ts
├── styles/
│   └── globals.css              # Tailwind config + custom tokens
├── public/
│   └── icons/
├── database-schema.sql
├── tailwind.config.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## Tech Stack (Production)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 14+ (App Router) | React Server Components + Client |
| Language | TypeScript | End-to-end type safety |
| Styling | Tailwind CSS | Design tokens via config |
| Backend | Supabase | Auth, DB, Realtime, Storage |
| Database | PostgreSQL (via Supabase) | See database-schema.sql |
| Auth | Supabase Auth | Email/password + 2FA via TOTP |
| Payments | Stripe | Subscriptions + webhooks |
| Bank Sync | Plaid (future) | Architected, not implemented |
| Notifications | Supabase Realtime + future push | In-app first |
| Hosting | Vercel | Auto-deploy from Git |

---

## Core Calculation Engine

### Income Normalization
All income and bill amounts are normalized to weekly equivalents:
- Weekly: amount
- Biweekly: amount / 2
- Semimonthly: (amount × 24) / 52
- Monthly: (amount × 12) / 52

### Three Split Modes

**1. Equal Split** — Divides all monthly obligations equally across 4.33 weeks.

**2. Due-Date Aware** — If a bill is due before the next payday, reserves the full amount from the current paycheck instead of the standard weekly portion.

**3. Priority First** — Allocates income in strict priority order: Housing > Food > Transport > Utilities > Insurance > Debt > Savings > Non-essential. Shows shortfall warnings if income can't cover everything.

### Safe-to-Spend
```
Weekly STS = Weekly Income - Bill Reserves - Savings Contributions
Daily STS  = Weekly STS / 7
Shortfall  = max(0, (Bills + Savings) - Income)
```

### Budget Health Score
- 90 = Healthy (>25% flexible spending)
- 70 = Fair (10-25% flexible)
- 50 = Tight (<10% flexible)
- 25 = At Risk (shortfall detected)

---

## Authentication & 2FA Flow

### Sign-up Flow
1. User enters name, email, password
2. Email verification sent (Supabase handles this)
3. User verifies email → redirected to onboarding
4. Check founding user count → assign trial if <500

### 2FA Setup Flow
1. User enables 2FA in Settings > Security
2. Choose method: Email OTP or Authenticator App
3. Email OTP: Supabase sends code → user verifies
4. Authenticator: Generate TOTP secret → display QR → user verifies code
5. Store method preference in user profile
6. Generate backup codes (stored encrypted)

### 2FA Challenge Points
- Login (always, when enabled)
- Password change
- Account deletion
- Subscription management

---

## Premium & Trial Logic

### First 500 Users
```sql
-- Check founding eligibility
SELECT COUNT(*) FROM users WHERE is_founding_user = true;
-- If < 500, new user gets:
-- is_founding_user = true
-- trial_start_at = NOW()
-- trial_end_at = NOW() + INTERVAL '40 days'
-- subscription_status = 'trial'
-- premium_status = true
```

### Feature Gating

| Feature | Free | Premium |
|---------|------|---------|
| Manual budgeting | Yes | Yes |
| Basic weekly split | Yes | Yes |
| Bill reminders | Basic | Smart |
| Savings goals | 1 | Unlimited |
| Check Spitter modes | Equal only | All 3 |
| Smart Insights | Top 1 | All |
| Stack Circle | No | Yes |
| Category analysis | No | Yes |
| Bank sync (future) | No | Yes |

### Stripe Integration Points
```typescript
// In lib/stripe/client.ts
// STRIPE INTEGRATION: Initialize Stripe with your publishable key
// Create checkout session for premium subscription
// Handle webhook events: customer.subscription.created/updated/deleted
// Sync subscription status back to Supabase user record
```

---

## Plaid-Ready Architecture

The data model includes `linked_accounts` table with fields for:
- `plaid_access_token` (encrypted)
- `plaid_item_id`
- `institution_name`
- `account_type`, `account_mask`

Integration points marked in code with comments:
```
// PLAID INTEGRATION POINT: Add Plaid Link button here
// PLAID INTEGRATION POINT: Fetch transactions and auto-categorize
// PLAID INTEGRATION POINT: Sync balances for smart alerts
```

---

## Notification Architecture

### In-App (MVP)
- Stored in `notifications` table
- Queried on app load and via Supabase Realtime
- Badge count shown on bell icon

### Push (Future)
```
// PUSH NOTIFICATION POINT: Register service worker
// PUSH NOTIFICATION POINT: Request permission
// PUSH NOTIFICATION POINT: Send via Firebase Cloud Messaging or OneSignal
```

### Email (Future)
```
// EMAIL NOTIFICATION POINT: Use Supabase Edge Functions + Resend/SendGrid
// Trigger on: bill_due_soon, overdue_bill, weekly_summary, group_milestone
```

### Smart Alert Types
- `bill_due_before_payday` — Bill due before next check
- `low_reserve_warning` — Not enough set aside for upcoming bill
- `projected_shortage` — Income won't cover obligations
- `overdue_bill` — Past due date, unpaid
- `overspending_risk` — Category spending above target
- `savings_behind` — Behind on savings goal pace
- `group_milestone` — Group reached percentage milestone

---

## Key Reusable Functions

| Function | Purpose |
|----------|---------|
| `frequencyToWeekly(amount, freq)` | Convert any frequency to weekly |
| `frequencyToMonthly(amount, freq)` | Convert any frequency to monthly |
| `calculateWeeklyIncome(sources)` | Total weekly income from all sources |
| `calculateWeeklyBillReserve(bills)` | Standard weekly bill reserve |
| `calculateDueDateAwareReserve(bills, nextPayday)` | Adjusted reserves based on due dates |
| `calculatePriorityFirstReserve(bills, income)` | Priority-ordered allocation |
| `calculateWeeklyAllocation(...)` | Full weekly budget calculation |
| `calculateBudgetHealth(allocation)` | Score and label budget health |
| `generateInsights(...)` | Rules-based smart suggestions |
| `formatCurrency(amount)` | Format as $X,XXX.XX |
| `daysUntil(date)` | Days between now and target date |
| `percentage(current, target)` | Safe percentage calculation |

---

## Sample Seed Data

The app includes a full demo dataset accessible via "Try Demo" on the login screen:
- 2 income sources (job + freelance)
- 7 bills across categories
- 4 recent expenses
- 2 savings goals
- 1 Stack Circle group with 4 members and activity feed
- 2 notifications

This lets users explore every feature immediately.

---

## Next Steps for Production

1. **Set up Supabase project** — Create tables from `database-schema.sql`
2. **Configure Supabase Auth** — Enable email provider, set up TOTP
3. **Deploy Next.js to Vercel** — Connect to Supabase via env vars
4. **Add Stripe** — Create product/price, set up webhooks
5. **Implement RLS policies** — Row-level security on all tables
6. **Add Plaid** — When ready for bank sync phase
7. **Push notifications** — Service worker + FCM integration
8. **Email notifications** — Edge functions for scheduled alerts
9. **Analytics** — Track onboarding completion, feature usage, conversion
10. **App Store** — Wrap with Capacitor/Expo for iOS/Android
