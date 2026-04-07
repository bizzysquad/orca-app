# ORCA Production Launch Audit & Deployment Checklist

**Date:** March 24, 2026
**Status:** Pre-Production Audit Complete
**TypeScript Build:** Clean (0 errors)

---

## Executive Summary

ORCA has solid infrastructure in place — Supabase auth, database query functions, Stripe client scaffolding, and a well-typed data layer. However, **every app page currently renders hardcoded demo data** via `getDemoData()` instead of fetching real user data from the database. The admin panel operates entirely on local component state. No user modifications (bills, goals, settings) persist to the database.

The app is **functionally a prototype** despite having production-ready auth and a prepared database layer. Below is every issue, its fix, risk level, and a deployment checklist.

---

## SECTION 1: CRITICAL ISSUES (Must Fix Before Launch)

### 1.1 All Pages Use Demo Data Instead of Real Database

**Files affected:**
- `src/app/(app)/dashboard/page.tsx` — `getDemoData()`
- `src/app/(app)/bill-boss/page.tsx` — `getDemoData()`
- `src/app/(app)/smart-stack/page.tsx` — `getDemoData()`
- `src/app/(app)/stack-circle/page.tsx` — `getDemoData()`
- `src/app/(app)/weekly-split/page.tsx` — `getDemoData()`
- `src/app/(app)/settings/page.tsx` — `getDemoData()`

**Fix:** Replace every `getDemoData()` call with a real data fetch. The infrastructure already exists:
- `src/lib/supabase/data.ts` has `loadUserData()` ready to use
- `src/lib/supabase/queries.ts` has individual CRUD functions prepared

**Implementation pattern:**
```tsx
// Before (demo):
const data = useMemo(() => getDemoData(), [])

// After (real):
const [data, setData] = useState<OrcaData | null>(null)
useEffect(() => {
  loadUserData().then(setData)
}, [])
```

Each page needs loading states and error handling for null data.

**Risk:** HIGH — Without this, every user sees the same fake data.

---

### 1.2 No Database Writes from UI

**Problem:** All `useState` modifications (adding bills, editing goals, changing settings) exist only in React state and are lost on refresh.

**Files affected:** Every `(app)` page that allows user edits.

**Fix:** After every state mutation, call the corresponding Supabase write function:
- `saveUserData()` in `src/lib/supabase/data.ts` (bulk save)
- Or individual functions from `src/lib/supabase/queries.ts`:
  - `upsertBill()`, `deleteBill()`
  - `upsertIncomeSource()`, `deleteIncomeSource()`
  - `upsertSavingsGoal()`, `deleteSavingsGoal()`
  - `upsertExpense()`, `deleteExpense()`
  - `updateUserProfile()`

**Risk:** HIGH — User data evaporates on every page refresh.

---

### 1.3 No Profile Row Created on Signup

**Problem:** `src/app/api/auth/signup/route.ts` creates a Supabase auth user but does **not** insert a row into the `profiles` table. When `loadUserData()` runs, it finds no profile and returns `null`.

**Fix:** Add a post-signup profile insert:
```typescript
// After successful auth.signUp():
await supabase.from('profiles').insert({
  id: data.user.id,
  name: fullName,
  email: email,
  onboarded: false,
  employment_type: 'employed',
  pay_freq: 'biweekly',
  // ... defaults from getNewUserData()
})
```

Alternative: Use a Supabase database trigger (`on auth.users insert → create profile`).

**Risk:** HIGH — New signups get a blank/broken experience.

---

### 1.4 Admin Password Hardcoded in Source

**File:** `src/app/api/admin/auth/route.ts`

**Current code:**
```typescript
const ADMIN_PASSWORD = 'ORCA2026'
const ADMIN_TOKEN = 'orca-admin-session-2026'
```

**Fix:**
- Move to environment variables: `ADMIN_PASSWORD=...` in `.env.local`
- Generate a unique session token per login (use `crypto.randomUUID()`)
- Store active admin sessions in Supabase or memory cache with expiry
- Add rate limiting to prevent brute force

**Risk:** HIGH — Anyone reading source code gets admin access.

---

### 1.5 Admin Controls Don't Persist

**Problem:** The entire admin panel (user management, subscription controls, branding, messaging) operates on local `useState` with hardcoded `DEMO_USERS` array. No admin action writes to the database.

**Key non-functional admin features:**
- Grant/revoke premium status
- Extend/reset trial periods
- User suspension
- Branding/theme changes
- Messaging templates
- Feature flags
- Audit logging

**Fix:** Create admin API routes that write to Supabase:
- `POST /api/admin/users/[id]/status` — update user plan/status
- `POST /api/admin/config` — save app configuration
- `GET /api/admin/users` — list real users from `profiles` table
- `POST /api/admin/features` — toggle feature flags

**Risk:** HIGH — Admin panel is purely decorative.

---

## SECTION 2: HIGH PRIORITY ISSUES

### 2.1 Stripe Not Configured

**File:** `src/lib/stripe/client.ts`

**Current state:** Client library imported, but:
- All env vars empty (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, etc.)
- No `/api/stripe/checkout` route exists (referenced but missing)
- No webhook handler for payment events
- No subscription table in database

**Fix:**
1. Create Stripe account and add keys to `.env.local`
2. Create `/api/stripe/checkout/route.ts` — create checkout sessions
3. Create `/api/stripe/webhook/route.ts` — handle payment events
4. Add `subscriptions` table to Supabase (user_id, plan, status, stripe_customer_id, current_period_end)
5. Enforce plan limits in app logic

**Risk:** HIGH — No revenue collection possible.

---

### 2.2 No Subscription/Plan Enforcement

**Problem:** Plan tiers are defined in the admin UI but never checked:
- Trial: 25 to-do items, 5 grocery lists, 10 meetings, 10 notes
- Premium: 100/20/50/50 respectively
- Founding: Unlimited

**Fix:** Add middleware or utility function that checks user's plan before allowing CRUD:
```typescript
export async function checkPlanLimit(userId: string, resource: string): Promise<boolean> {
  const profile = await getUserProfile(userId)
  const limits = PLAN_LIMITS[profile.plan]
  const count = await getResourceCount(userId, resource)
  return count < limits[resource]
}
```

**Risk:** HIGH — All users get unlimited access regardless of plan.

---

### 2.3 No Email Verification Enforcement

**Problem:** Signup sends a verification email, but unverified users can still access the app (middleware only checks for auth session, not email confirmation).

**Fix:** Add email verification check in middleware:
```typescript
const { data: { user } } = await supabase.auth.getUser()
if (user && !user.email_confirmed_at && !publicRoutes.includes(pathname)) {
  return NextResponse.redirect('/auth/verify-email')
}
```

**Risk:** MEDIUM-HIGH — Fake email signups can access the full app.

---

### 2.4 Missing Database Tables

**Tables referenced in code but may not exist in Supabase:**
- `subscriptions` — needed for plan management
- `admin_config` — needed for app settings persistence
- `feature_flags` — needed for admin toggle features
- `groups` — referenced but empty in loadUserData()
- `audit_log` — needed for admin action tracking
- `invite_links` — needed for Stack Circle invite system

**Fix:** Create migration SQL for each table and run in Supabase dashboard.

**Risk:** MEDIUM-HIGH — Features will error or silently fail.

---

## SECTION 3: MEDIUM PRIORITY ISSUES

### 3.1 Two Duplicate Demo Data Sources

**Files:**
- `src/lib/demo-data.ts` — "Alex Johnson", comprehensive dataset
- `src/lib/seed.ts` — "Demo User", separate dataset

**Fix:** Remove `seed.ts` if unused, or consolidate into one source. Keep `demo-data.ts` only for development/testing with a clear `isDemoMode()` gate.

---

### 3.2 No Rate Limiting on Auth Endpoints

**Endpoints at risk:**
- `/api/auth/signup` — account creation spam
- `/api/auth/login` — brute force attacks
- `/api/auth/phone` — SMS abuse (costs money)
- `/api/admin/auth` — admin brute force

**Fix:** Add rate limiting via `next-rate-limit` or Vercel's built-in edge rate limiting.

---

### 3.3 No Input Validation/Sanitization

**Problem:** Bill amounts, goal targets, and user names are not validated server-side.

**Fix:** Add Zod schemas for all API inputs:
```typescript
const billSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().positive().max(1000000),
  recurrence: z.enum(['weekly', 'monthly', 'yearly', 'custom']),
  // ...
})
```

---

### 3.4 No CSRF Protection

**Fix:** Supabase's cookie-based auth with `sameSite: 'lax'` provides baseline protection. Consider adding a CSRF token for mutation endpoints.

---

### 3.5 No Error Boundaries

**Problem:** If any page component throws, the entire app crashes with a white screen.

**Fix:** Add React Error Boundaries and Next.js `error.tsx` files in each route group.

---

### 3.6 No Logging/Monitoring

**Fix:**
- Add structured logging (e.g., Pino or Winston)
- Connect to error tracking (Sentry, LogRocket)
- Add uptime monitoring (UptimeRobot, Better Uptime)

---

## SECTION 4: LOW PRIORITY / NICE-TO-HAVE

### 4.1 No Offline Support
Currently no service worker or PWA manifest. Users lose access without internet.

### 4.2 No Data Export
Users cannot download their financial data (bills, goals, expenses).

### 4.3 No Two-Factor Authentication
Only password and phone OTP. No TOTP/authenticator app support.

### 4.4 Theme Not Persisted to Database
Dark/light preference lives in component state, not saved to user profile.

### 4.5 No Automated Tests
No unit tests, integration tests, or E2E tests exist.

---

## SECTION 5: SECURITY CHECKLIST

| Item | Status | Action Needed |
|------|--------|---------------|
| Auth tokens in httpOnly cookies | Done | — |
| Passwords hashed (Supabase handles) | Done | — |
| HTTPS enforced | Pending | Configure in deployment |
| Admin password in env vars | NOT DONE | Move from source code |
| Rate limiting on auth | NOT DONE | Add middleware |
| Input validation | NOT DONE | Add Zod schemas |
| SQL injection protection | Done | Supabase client handles parameterization |
| XSS protection | Partial | React escapes by default; audit dangerouslySetInnerHTML usage |
| CSRF protection | Partial | sameSite cookies help; add tokens for mutations |
| Sensitive data in URL params | Clean | None found |
| Environment variables secured | Partial | Stripe keys empty; admin password in source |
| Row-Level Security (RLS) | UNKNOWN | Verify Supabase RLS policies exist for all tables |
| Session expiry | Done | 8hr admin; Supabase handles user sessions |

---

## SECTION 6: DEPLOYMENT CHECKLIST

### Pre-Deploy

- [ ] Replace all `getDemoData()` with real database reads
- [ ] Wire all UI mutations to Supabase writes
- [ ] Create profile row on signup (or via DB trigger)
- [ ] Move admin password to environment variable
- [ ] Configure Stripe keys and create checkout/webhook routes
- [ ] Create missing database tables (subscriptions, admin_config, feature_flags, etc.)
- [ ] Verify Supabase RLS policies on all tables
- [ ] Add error boundaries to all route groups
- [ ] Add rate limiting to auth endpoints
- [ ] Add input validation with Zod

### Environment Setup

- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Set `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] Set `STRIPE_WEBHOOK_SECRET`
- [ ] Set `STRIPE_PREMIUM_PRICE_ID`
- [ ] Set `ADMIN_PASSWORD` (strong, unique)
- [ ] Set `NODE_ENV=production`
- [ ] Configure custom domain DNS

### Database

- [ ] Run all migrations
- [ ] Enable Row-Level Security on every table
- [ ] Create RLS policies: users can only read/write their own rows
- [ ] Test signup flow creates profile
- [ ] Test data loads correctly after signup
- [ ] Verify cascade deletes (user deletion cleans up all related data)

### Testing

- [ ] Test full signup → onboarding → dashboard flow
- [ ] Test bill CRUD (create, read, update, delete) persists
- [ ] Test savings goal CRUD persists
- [ ] Test settings changes persist
- [ ] Test admin login with env var password
- [ ] Test admin actions write to database
- [ ] Test Stripe checkout creates subscription
- [ ] Test Stripe webhook updates user plan
- [ ] Test plan limits are enforced
- [ ] Test email verification flow
- [ ] Test password reset flow
- [ ] Test phone OTP flow

### Monitoring

- [ ] Set up error tracking (Sentry)
- [ ] Set up uptime monitoring
- [ ] Set up database connection monitoring
- [ ] Set up Stripe webhook failure alerts
- [ ] Configure log aggregation

### Launch Day

- [ ] Switch Stripe to live mode
- [ ] Verify production Supabase instance
- [ ] Enable Supabase email templates
- [ ] Test signup on production URL
- [ ] Monitor error rates for first 24 hours
- [ ] Have rollback plan ready (previous deployment)

---

## SECTION 7: RISK MATRIX

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Data loss (no persistence) | Certain | Critical | Wire all pages to Supabase before launch |
| Unauthorized admin access | High | Critical | Move password to env var, add rate limiting |
| Payment failures | Medium | High | Test Stripe integration thoroughly in test mode first |
| Account spam | Medium | Medium | Add rate limiting and email verification |
| Data breach via missing RLS | Medium | Critical | Audit and enable RLS on all tables |
| App crashes (no error boundaries) | Medium | High | Add error.tsx files and React Error Boundaries |
| SMS cost abuse (phone auth) | Low | Medium | Rate limit phone endpoint, add CAPTCHA |

---

## Summary of Work Remaining

**Estimated effort to reach production-ready:**

1. **Wire pages to real data** — 2-3 days (6 pages, loading states, error handling)
2. **Add database persistence** — 2-3 days (save mutations, optimistic updates)
3. **Signup profile creation** — 0.5 day
4. **Stripe integration** — 2-3 days (checkout, webhooks, plan enforcement)
5. **Admin persistence** — 2-3 days (API routes, real user queries)
6. **Security hardening** — 1-2 days (rate limiting, validation, RLS, env vars)
7. **Error handling & monitoring** — 1 day
8. **Testing** — 2-3 days

**Total: ~13-18 days of development work**

The foundation is solid. Auth works, types are clean, Supabase queries are prepared. The primary work is connecting the existing UI to the existing database layer.
