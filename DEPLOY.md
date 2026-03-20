# ORCA Deployment Guide

## Status: Code Complete, Ready to Deploy

All code has been written, tested for TypeScript errors (0 errors), and committed locally. The app runs in **demo mode** — no Supabase or Stripe accounts needed to see the full UI.

---

## Step 1: Push Code to GitHub

Your GitHub repo is ready at: https://github.com/bizzysquad/orca-app

Open a terminal in this folder and run:

```bash
git push -u origin main --force
```

> If prompted for credentials, use your GitHub username and a Personal Access Token (not your password).
> Create a token at: https://github.com/settings/tokens → Generate new token → Select "repo" scope.

---

## Step 2: Deploy to Vercel

1. Go to https://vercel.com/new
2. Click **"Continue with GitHub"** and sign in
3. Find and select **orca-app** from your repos
4. Click **Deploy** — Vercel auto-detects Next.js
5. Wait for the build to complete (~2-3 minutes)

That's it! The app will work in demo mode without any environment variables.

---

## Step 3 (Optional): Connect Supabase for Real Auth

If you want real user accounts and data persistence:

1. Create a Supabase project at https://supabase.com
2. In Vercel → Project Settings → Environment Variables, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
3. Run the database schema: copy `database-schema.sql` into Supabase SQL Editor
4. Redeploy on Vercel

---

## What's Built

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | /dashboard | Welcome, Safe to Spend, allocations, Plaid accounts, credit score, bills, goals |
| Smart Stack | /smart-stack | Budget (3 tabs), Savings goals, Credit score simulator |
| Bill Boss | /bill-boss | Bill tracking, split payments, rent reporter |
| Stack Circle | /stack-circle | Group savings, roommate expenses |
| Settings | /settings | Profile, appearance, Plaid connection, privacy |
| Admin | /admin | Branding customization |

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- Recharts
- Lucide Icons
- Dark luxury theme (gold on black)
