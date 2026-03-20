# ORCA — Setup & Deployment Guide

## Quick Start

### 1. Install Dependencies
```bash
cd orca-app
npm install
```

### 2. Set Up Supabase
1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `database-schema.sql`
3. Go to **Settings > API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service role key → `SUPABASE_SERVICE_ROLE_KEY`
4. Go to **Authentication > Providers** and enable **Email** provider
5. Copy your keys into `.env.local`

### 3. Set Up Stripe (Optional — for premium subscriptions)
1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Create a Product with a monthly Price for ORCA Premium
3. Copy your keys into `.env.local`:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PREMIUM_PRICE_ID`
4. Set up a webhook endpoint pointing to `/api/stripe/webhook`
5. Copy the webhook signing secret → `STRIPE_WEBHOOK_SECRET`

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

### Option A: One-Click Deploy
1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Add all environment variables from `.env.local`
5. Deploy!

### Option B: Vercel CLI
```bash
npm i -g vercel
vercel --prod
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server only) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | Stripe public key |
| `STRIPE_SECRET_KEY` | No | Stripe secret key (server only) |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret |
| `STRIPE_PREMIUM_PRICE_ID` | No | Stripe price ID for premium plan |
| `NEXT_PUBLIC_APP_URL` | Yes | Your app URL (http://localhost:3000 for dev) |

---

## Project Structure

```
orca-app/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── layout.tsx                  # Root layout
│   │   ├── auth/
│   │   │   ├── login/page.tsx          # Sign in
│   │   │   └── signup/page.tsx         # Create account
│   │   ├── onboarding/page.tsx         # 5-step setup wizard
│   │   ├── (app)/                      # Authenticated routes
│   │   │   ├── layout.tsx              # App shell (top bar + bottom nav)
│   │   │   ├── dashboard/page.tsx      # Balance Book home
│   │   │   ├── check-spitter/page.tsx  # Income splitting
│   │   │   ├── bill-boss/page.tsx      # Bill management
│   │   │   ├── expense-core/page.tsx   # Expense tracking
│   │   │   ├── pay-track/page.tsx      # Income sources
│   │   │   ├── savings/page.tsx        # Savings goals
│   │   │   ├── stack-circle/page.tsx   # Group savings (premium)
│   │   │   ├── credit-score/page.tsx   # Credit dashboard
│   │   │   ├── insights/page.tsx       # AI insights
│   │   │   ├── notifications/page.tsx  # Notifications
│   │   │   └── settings/
│   │   │       ├── page.tsx            # Main settings
│   │   │       ├── security/page.tsx   # 2FA management
│   │   │       └── subscription/page.tsx # Plan management
│   │   └── api/
│   │       ├── auth/callback/route.ts  # OAuth callback
│   │       └── stripe/
│   │           ├── checkout/route.ts   # Create checkout session
│   │           └── webhook/route.ts    # Handle Stripe events
│   ├── components/
│   │   ├── ui/                         # Reusable UI primitives
│   │   ├── layout/                     # App shell components
│   │   ├── dashboard/                  # Dashboard widgets
│   │   ├── check-spitter/             # Split visualization
│   │   └── stack-circle/              # Group components
│   ├── lib/
│   │   ├── calculations/              # Financial math engine
│   │   ├── supabase/                  # Database & auth
│   │   ├── stripe/                    # Payments
│   │   ├── types.ts                   # TypeScript types
│   │   ├── constants.ts              # App constants
│   │   └── utils.ts                  # Helpers
│   └── middleware.ts                  # Auth route protection
├── public/                            # Static assets & logos
├── database-schema.sql               # Full Supabase schema
├── tailwind.config.ts                # ORCA theme config
└── package.json
```

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom ORCA theme
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Payments**: Stripe (subscriptions)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Charts**: SVG-based (built-in)
- **Hosting**: Vercel

---

## Features

### Free Tier
- Manual budgeting & equal split mode
- Basic bill tracking & reminders
- 1 savings goal
- Top insight

### Premium ($X/month)
- All 3 split modes (Equal, Due-Date Aware, Priority First)
- Unlimited savings goals
- Stack Circle group savings
- Full AI insights
- Credit score dashboard
- Rent Reporter (credit bureau reporting)
- Category analysis

### Founding Users (First 500)
- 40 days free premium trial
- Founding member badge
