# ORCA — Complete Feature & Layout Specification

**App Name:** ORCA (Organize Resources Control Assets)
**Tagline:** Financial Command Center
**Type:** Single-file HTML React 18 app (Babel standalone transpilation via CDN), with Supabase cloud sync and localStorage offline-first persistence
**Design Language:** Premium luxury fintech — gold (#d4a843) + black palette, Inter font, glass morphism (backdrop-filter blur), layered shadows, gradient buttons, shimmer/glow animations

---

## GLOBAL ARCHITECTURE

### Tech Stack
- React 18 via CDN (production UMD build)
- Babel standalone for in-browser JSX transpilation
- Supabase JS SDK via CDN (optional cloud sync)
- Google Fonts: Inter (weights 400–900)
- No build step — runs directly from a single HTML file

### Responsive Layout
- **Mobile (<768px):** Top bar + scrollable content + fixed bottom nav (5 tabs)
- **Desktop (≥768px):** Fixed left sidebar (220px) + centered main content (max 720px) + sticky top bar
- Layout detected via `useWindowWidth()` hook with resize listener

### Theme System
- Dark mode (default) and Light mode via React Context (`TC = createContext`)
- **Dark:** Background #09090b, cards #18181b, borders #27272a, text #fafafa
- **Light:** Background #fafaf9, cards #ffffff, borders #e4e4e0, text #18181b
- Shared gold accent (#d4a843 dark / #b8860b light)
- Glass properties: `cardGlass`, `navGlass` with backdrop-filter blur
- Layered shadows: `shadow` (subtle) and `shadowL` (elevated)
- Theme persists via localStorage

### Navigation Items
1. 🏠 **Home** (Dashboard)
2. 📊 **Smart Stack** (Budget / Savings / Credit tabs)
3. 📄 **Bill Boss** (Bill management)
4. 👥 **Stack Circle** (Group Savings / Roommates tabs)
5. ⚙️ **Settings**
6. 🔧 **Admin** (Desktop sidebar only — hidden from mobile bottom nav)

### Data Persistence
- **localStorage:** All app data saved immediately on every change (offline-first)
- **Supabase Cloud Sync:** When configured, data syncs to Supabase with 3-second debounce. Cloud data loads on login, merges with local data. Sync log tracks last sync per client type.
- **Theme & Admin Config:** Separately persisted to localStorage

### Shared UI Components
- **Card:** Rounded 18px, backdrop blur 12px, border, shadow, cubic-bezier transition. Optionally clickable (role="button").
- **Btn:** Variants: primary (gold gradient), secondary (background + border), ok (green gradient), bad (red background), ghost (transparent). Sizes: sm/md/lg. Supports `full` width, `dis` disabled, `ariaLabel`.
- **Inp:** Labeled input with uppercase label, focus glow ring (gold outline), prefix support (e.g., "$"), max length, sanitized input.
- **Sel:** Styled select dropdown with custom appearance.
- **PBar:** Progress bar with gradient fill, glow shadow, optional label showing amount + percentage.
- **Badge:** Pill-shaped tag with color + transparent background + border.
- **Modal:** Bottom sheet (slides up) with drag handle pill, backdrop blur overlay, close button. Max 85vh height, scrollable.
- **Hdr:** Section header with title (18px bold), optional subtitle, optional action button.
- **DonutChart:** SVG donut chart with configurable slices, hole size. Used for paycheck visualization.

---

## PAGE 1: AUTH SCREEN (Login/Signup)

### Layout
- Full-screen centered, dark gradient background (`linear-gradient(180deg, bg 0%, #0d0d0d 100%)`)
- Max width 400px
- ORCA logo (110×110, rounded 24px, gold box shadow)
- App name "ORCA" (42px, weight 900, gold, letter-spacing -1.5)
- Subtitle "Organize Resources Control Assets" (13px, gold, letter-spacing 3)
- "Financial Command Center" below (12px, muted)

### Auth Modes

**When Supabase IS configured:**
- Google OAuth button (🌐 "Continue with Google")
- Apple OAuth button (🍎 "Continue with Apple")
- Divider line with "or"
- "Sign In with Email" button (primary) → opens email/password form
- "Create Account" button (secondary) → opens signup form
- "Skip · Try Demo" link at bottom
- Info box: "Secured with Supabase Auth · Cloud synced"

**When Supabase is NOT configured:**
- Simulated OAuth buttons: Google (🌐), Apple (🍎), Microsoft (⬛) — each triggers a simulated OIDC flow
- Divider line with "or"
- "Sign In with Password" (if account exists) OR "Create Password" (new user)
- "Skip · Try Demo" link
- Info box: "Secured with OAuth 2.0 + OpenID Connect"

**Supabase Email Login view:** Email input + Password input → "Sign In" button. Error display. Back link.

**Supabase Signup view:** Email input + Password input (min 6 chars) → "Create Account" button. Error display. Back link.

**Password Login view (offline):** Password input → "Unlock" button. Error display. Back link.

**Create Password view (offline):** Create password + Confirm password → "Set Password & Enter". Min 4 chars, must match.

**OAuth Loading view:** Pulsing lock icon 🔒, "Connecting to {provider}...", "Authenticating via OpenID Connect"

**Version footer:** "v2.0 · Cloud synced" or "v2.0 · Offline mode"

---

## PAGE 2: DASHBOARD (Home)

### Layout
- Padding 16px horizontal, 20px top, 100px bottom (nav clearance)
- All cards stack vertically

### Sections (top to bottom)

**1. Welcome Message**
- "Welcome back, {firstName}" (20px, weight 900, gold)
- "Here's your financial snapshot" (13px, muted)

**2. Safe to Spend + Next Pay (side by side)**
- **Safe to Spend** (flex 1.2): Gold gradient background, "Safe to Spend" label, large amount (32px, weight 900), "~$X/day" below
- **Next Pay** (flex 1): Gold background tint, "Next Pay" label, paycheck amount (24px, weight 900, gold), date + "Xd" countdown

**3. Allocated Card (full width)**
- Background tint: green if surplus ≥ 0, red if deficit
- "Allocated" label, large total amount (28px), "Bills + Savings + Spending" subtitle
- Amount = bills per check + savings per check + recent spending total
- Color-coded border based on ratio (green ≤70%, yellow ≤90%, red >90%)

**4. Plaid Linked Accounts (conditional)**
- **If connected:** "Linked Accounts" header with "Manage" button → Settings. Three side-by-side cards: Checking (green), Savings (gold), Credit Used (red with limit)
- **If not connected:** Compact PlaidConnect prompt card — 🔗 icon, "Link Your Bank", "Connect via Plaid for real account data", "Connect Bank Account" button

**5. Credit Score Card (clickable → Smart Stack Credit tab)**
- Left: circular score display (64px circle, score number centered, colored by range)
- Right: "Credit Score" title, range label (Exceptional/Very Good/Good/Fair/Poor), progress bar
- Clicking navigates to Smart Stack > Credit tab

**6. Upcoming Bills (top 3)**
- Header: "Upcoming Bills" with "See All" ghost button → Bill Boss
- Each bill: name, category · due date · days until due, amount in gold

**7. Stack Circle Group Stats (if group exists)**
- Header: "Stack Circle" with "See All" ghost button → Stack Circle
- Gold-tinted card with group name, member count, invite code, amount/target, progress bar, percentage
- Member contribution mini bars at bottom (horizontal bar per member, gold fill)

**8. Savings Goals (top 2)**
- Header: "Savings Goals" with "See All" ghost button → Smart Stack Savings tab
- Each goal: name, percentage, progress bar, current/target amounts

---

## PAGE 3: SMART STACK

### Tab Bar
- Sticky below header (top: 56px), 3 tabs: **Budget** | **Savings** | **Credit**
- Active tab: gold bottom border (3px), gold text
- Inactive: transparent border, muted text

### Tab 1: BUDGET

**Section A: Weekly Safe to Spend**
- Gold-tinted card, centered. "Weekly Safe to Spend" label, large amount (36px), daily amount

**Section B: Income / Expense Ratio**
- Card with "Income / Expense Ratio" title + health badge (Healthy/Tight/Over Budget)
- Paycheck amount (green) vs Allocated amount (red)
- Full-width progress bar (colored by ratio)
- "Remaining: $X" or "Deficit: $X" with "X% used"

**Section C: Check Projection Calendar**
- Header: "Check Projection" with subtitle (locked vs editable state)
- **Pay Frequency Toggle:** Two buttons — "Weekly" | "Bi-Weekly". Disabled when locked.
- **Hourly Rate Input + Total Hours Display:** Side by side. Input for $/hr (disabled when locked). Gold badge showing total hours worked.
- **Helper text:** "Tap a day to toggle work/off. Long-press or tap the hours badge to set custom hours"
- **Calendar Grid:** 7-column grid (Sun–Mon headers). Each day is a square button:
  - Working day: green background tint, green border, day number, tappable hours badge (e.g., "8h")
  - Off day: red-tinted (weekends) or transparent, red "X"
  - Today: bold gold border
  - Tapping toggles work/off. Tapping hours badge opens mini popup (absolute positioned, gold border) with number input for custom hours (step 0.5, 0–24 range, Enter to close).
  - All interactions disabled when locked.
- **Legend:** "Working" (green swatch) and "Off" (red swatch)
- **Stats Row:** Three centered values — Days Working (green), Extra Off (red), Total Hours (gold)
- **Projected Check Card:** Green or red background based on vs base. "Projected Check (Locked)" label, large amount (32px), difference from normal, hourly breakdown
- **Lock In / Edit Button:** "Lock In (Enter)" primary button when unlocked. "Edit Schedule" secondary when locked. Lock saves payRate + payFreq to user data.

**Section D: Check Splitter**
- Header: "Check Splitter" with subtitle showing paycheck amount
- Each item: colored square swatch, name, type icon+label (📄 Bill / 🎯 Goal / 🛒 Expenses), amount (gold), percentage, mini progress bar
- Auto-calculated from user's actual bills, savings goals, and spending. Percentages normalized to 100%.
- Footer: "Auto-calculated from your bills, savings goals & spending"

**Section E: Paycheck History**
- Header with subtitle (reflects locked vs unlocked state)
- 8 entries: 4 past (paid ✓), 1 next (highlighted gold with "Next" badge), 3 future
- Past checks use base amount. Next check uses projected amount (reflects schedule changes). Future uses base.
- Next check row: gold background tint, bold, shows +/- difference. If locked shows "(Locked)" badge.

### Tab 2: SAVINGS

**Total Saved Card:** Green-tinted, centered. "Total Saved" label, sum of all goals (36px, green).

**Create Goal Form:**
- Dropdown: goal name preset (Emergency Fund, Vacation, Moving Fund, Car Fund, Holiday Fund, Custom)
- Side-by-side: Target amount + Current amount inputs
- Weekly Amount input
- "Create Goal" button

**Your Goals List:**
Each goal card:
- Name + percentage display
- Progress bar
- Current / Target amounts
- **Add Money:** inline number input + "+ Add" button (adds to current, caps at target)
- Active/Paused toggle button + Delete button
- Paused goals shown at 50% opacity

### Tab 3: CREDIT

**Score Display Card:** Large score (48px), range label, colored by range (Exceptional green → Poor red), progress bar (300–850 scale).

**Score History Chart:** SVG line chart with gold polyline, dots at each data point, score labels above, month labels below. 6 months of data.

**Credit Factors:** 5 factor cards:
1. Payment History (weight 35%, value/100)
2. Utilization (weight 30%, value/100 — green ≤30%, yellow ≤50%, red >50%)
3. Account Age (weight 15%, value/30 years)
4. Credit Mix (weight 10%, value/100)
5. Inquiries (weight 10%, inverse — lower is better)
Each: name, weight, value/max, colored progress bar.

**Score Simulator:**
- "Simulated Score" display (colored: green if higher, red if lower, gold if same)
- Points difference shown
- Utilization slider (0–100%)
- On-Time Payments slider (0–100%)
- Score recalculates reactively based on slider values

**AI Insights & Tips:** 6 cards sorted by priority:
1. Credit Utilization (good/bad based on threshold)
2. Payment History advice
3. Rent Reporting status
4. Hard Inquiries count
5. AI Tip: Debt Snowball
6. AI Tip: 50/30/20 Rule
Each: icon, title, message, colored by type (bad/warn/ok/info)

---

## PAGE 4: BILL BOSS

### Layout
- Padding 16px horizontal, 20px top, 100px bottom

### Sections

**Hero Card:** Gold gradient, centered. "Total Monthly Bills" with unpaid total (40px). Below: "Paid" section with paid total (20px).
- Unpaid total accounts for partially-paid split bills (only counts unpaid portions).
- Paid total includes fully paid bills + paid split portions.

**Add Bill Button:** Full width, toggles form visibility.

**Add Bill Form (when open):**
- Bill Name input
- Side-by-side: Amount ($) + Due Date
- Category dropdown (10 categories)
- Custom Category input (appears when "Other" selected)
- "Save Bill" button

**Upcoming Bills List:**
Each card:
- Name, category · due date display
- Amount in gold
- **Split Payment Schedule (when split):** Nested section with "PAYMENT SCHEDULE" header. Each payment: number, date, amount, individual "Pay" button. Paid payments shown crossed out with green ✓. Remaining total at bottom.
- **Action buttons:**
  - "Pay Full" (green) — or "Pay All" if split payments exist
  - "Split" (secondary) — opens split modal
  - "Del" (red) — removes bill

**Paid Bills Section:** Faded cards (50% opacity) with ✓ checkmark, amount, "Undo" button to revert.

**Rent Reporter Section:**
- Header: "Rent Reporter" with subtitle "Build credit from rent payments"
- **If rent bill exists:** Gold-tinted card showing monthly rent amount, reported count badge, "+20-40 pts impact". "Report Current Month" button. History list showing each month with Reported/Pending badges.
- **If no rent bill:** Warning card prompting to add a Rent/Mortgage bill.

**Split Modal:** Bottom sheet. "Split this bill into how many payments?" — 3 buttons: 2/3/4 payments. "Apply Split" button. Splits amount equally across weekly intervals.

---

## PAGE 5: STACK CIRCLE

### Tab Bar
- 2 tabs: **Group Savings** | **Roommates**
- Same styling as Smart Stack tabs

### Tab 1: GROUP SAVINGS

**Group Overview Card (if group exists):**
- Gold-gradient tinted card, centered
- Group name (14px, bold, gold), total saved (32px, gold), target + percentage, progress bar, invite code

**If no group:** Empty state with 👥 icon, "No Groups Yet" heading, description, "Create Group" button.

**Add Money Card:**
- "Add Money to Group" title
- Amount input ($) + "Add" button
- Adds to user's contribution, updates group total and activity

**Members List:**
Each member card:
- Name, contributed amount, balance
- Role badge (coordinator/member)

**Activity Feed (latest 5):**
Each entry: 📍 icon, message, date

### Tab 2: ROOMMATES

**Monthly Overview Card:**
- Gold-gradient tinted, centered
- "Total Monthly Housing" label (uppercase), large combined total (36px, gold)
- Breakdown: "Rent: $X" and "Utilities: $X"
- "All Paid This Month" badge (green) when all members have paid both

**Rent Section:**
- Header: "Rent" with "Edit" toggle button
- **Display mode:** Card showing "Monthly Rent" label + amount (20px, gold)
- **Edit mode:** Input for monthly rent + "Save Rent" button

**Shared Utilities Section:**
- Header: "Shared Utilities" with "+ Add" toggle button
- **Add form:** Side-by-side Name input + Amount input + "Add" button
- **Utility list:** Each card: name, amount (gold), ✕ remove button

**Roommates Section:**
- Header: "Roommates" with "+ Add" toggle button
- **Add form:** Name input + "Add" button. Auto-redistributes share % equally across all members.
- **Each member card:**
  - Name (15px, bold), "Share: X% · Owes $X/mo"
  - "Paid" (green) or "Pending" (yellow) badge based on both rent + utilities status
  - Green border/background when fully paid
  - Side-by-side breakdown: Rent share + Utilities share (each in rounded bgS box)
  - Two toggle buttons: "Mark Rent Paid" / "✓ Rent Paid" and "Mark Utils Paid" / "✓ Utils Paid"
  - For non-"You" members: Share % number input + "Remove" button

**Split Summary Card (when 2+ members):**
- "Split Summary" title
- Each member: name + total share (green ✓ if fully paid)
- Divider, then Total line (gold, weight 900)

---

## PAGE 6: SETTINGS

### Layout
- Padding 16px horizontal, 20px top, 100px bottom

### Sections

**Profile Card:** Name (14px bold) + email (13px muted).

**Appearance:** "Dark" and "Light" side-by-side buttons. Active button uses primary variant.

**Personal Info:** Editable Name + Email inputs. Changes update user data (and sync).

**Linked Accounts (Plaid):**
- **If connected:** Green "Bank Connected" card showing account count, last sync date, all accounts with masked numbers and balances. "Disconnect" button.
- **If not connected:** Dashed-border card with 🔗 icon, "Link Your Bank", description, "Connect Bank Account" button.
- If connected, additional card with privacy explanation about Plaid encryption and sandbox mode.

**Plaid Connect Flow (when linking):**
Full-screen overlay modal:
1. **Bank Selection:** 2×3 grid of banks (Chase, Bank of America, Wells Fargo, Ally Bank, Capital One, Citi). Each: icon + name. "Cancel" button.
2. **Credentials:** Bank name, "Sandbox mode — no real credentials needed", pre-filled username/password display, security note, "Connect" + "Back" buttons.
3. **Loading:** Pulsing 🔗 icon, "Connecting to {bank}...", "Fetching accounts, balances & transactions"
4. **Success:** ✅ icon, "Bank Connected!", account count, all accounts listed with balances, Checking/Savings badges, "Done" button.
5. **Error:** ❌ icon, error message, "Try Again" + "Cancel" buttons.

**Cloud Sync Status:**
- **If Supabase configured:** Green dot + "Connected to Cloud" + description about cross-device sync.
- **If not configured:** Yellow dot + "Offline Mode" + description about local-only storage.

**Privacy & Data:**
- Privacy statement (GDPR/CCPA, no third-party sharing, encrypted in transit)
- "Reset All Data" button (red) → Confirmation: "Are you sure? This will erase all your data." with "Yes, Reset" + "Cancel"

**Sign Out:** Full-width red "Sign Out" button. Signs out of Supabase (if configured) and clears app state.

---

## PAGE 7: ADMIN PANEL (Desktop only)

### Layout
- Same padding as Settings
- Only accessible via desktop sidebar

### Sections

**Info Card:** Gold-tinted. "Changes apply instantly. Use this panel to swap the logo, app name, tagline, and accent color without editing code."

**Branding Form:**
- App Name input (max 20 chars)
- Tagline input (max 60 chars)
- Logo URL input (max 500 chars, or leave blank for default)
- Accent Color: native color picker + hex code display

**Preview Card:** Shows current logo (with fallback), app name in chosen color, tagline.

**Save Changes button + "Back to App" secondary button.**
- "Saved!" confirmation flashes for 2 seconds after save.
- Config persists to localStorage.

---

## GLOBAL CSS ANIMATIONS

- `slideUp`: translateY(40px) → 0, opacity 0 → 1 (modals)
- `fadeIn`: opacity 0 → 1 (overlays)
- `pulse`: opacity 1 → 0.6 → 1 (loading states)
- `shimmer`: background-position -200% → 200% (skeleton loaders)
- `glow`: box-shadow 8px → 20px gold (accent elements)

## GLOBAL CSS ENHANCEMENTS

- Scrollbar: 5px gold gradient thumb, transparent track
- Focus-visible: 2px solid gold outline, 2px offset
- Button hover: brightness(1.08)
- Button active: scale(0.97)
- Number input spinners hidden (webkit + moz)
- Select custom appearance removed

---

## DATA MODEL

### User Profile
```
name, email, onboarded, payFreq (weekly|biweekly|semimonthly|monthly),
payCycle (standard|offset|1st_15th|last_day), payRate (hourly $),
hoursPerDay (default hours), nextPay (date string),
creditScore, utilization, onTime, acctAge, inquiries,
totalDebt, creditLimit, scoreHistory[{m, s}]
```

### Income Sources
```
[{id, name, amount, freq, active}]
```

### Bills
```
[{id, name, amount, cat, due, freq, status (upcoming|paid), alloc[{id, date, amount, paid}]}]
```

### Expenses
```
[{id, name, amount, cat, date}]
```

### Savings Goals
```
[{id, name, target, current, date, cType (fixed|percent), cVal, active}]
```

### Groups
```
[{id, name, goal, target, current, date, code,
  members[{id, name, role, target, contrib, balance}],
  activity[{id, user, msg, date}]}]
```

### Rent Entries
```
[{id, month, amount, status, reported, rDate}]
```

### Notifications
```
[{id, type, title, body, read}]
```

### Roommates
```
{enabled, totalRent, utilities[{id, name, amount, split}],
 members[{id, name, share (%), paidRent, paidUtilities}],
 history[{id, month, allPaid}]}
```

### Plaid (when connected)
```
{connected, accounts[{...}], lastSync, checkingBalance, savingsBalance, creditUsed, creditLimit}
```

### Admin Config
```
{appName, tagline, logoUrl, goldColor}
```

---

## KEY CALCULATIONS

- **Safe to Spend:** Weekly income − weekly bill reserve − weekly savings contributions
- **Paycheck Amount:** Weekly income × frequency multiplier (weekly×1, biweekly×2, etc.)
- **Check Projection:** Total hours worked × hourly rate (or salary fallback: days worked × daily rate)
- **Base Check:** Normal work days × default hours × hourly rate
- **Income/Expense Ratio:** (Bills per check + Savings per check + Recent spending) / Paycheck × 100
- **Credit Simulator:** Base score ± utilization delta (0.8/0.6 per %) ± on-time delta (1.5/2.0 per %)
- **Roommate Shares:** Member share % × total rent for rent portion; Member share % × total utilities for utility portion
