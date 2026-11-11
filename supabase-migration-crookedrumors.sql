-- ============================================================
-- Crooked Rumors — website content, bookings, and payments
-- Run once in the Supabase SQL editor (Project > SQL Editor > New query).
-- Safe to re-run: every statement is guarded.
--
-- Access model (same as rsvp_*): RLS on, no policies for anon/authenticated,
-- so the browser can never touch these tables directly. Everything goes
-- through /api/crookedrumors/** with the service-role key.
-- ============================================================

create extension if not exists "pgcrypto";

-- The whole editable site (content, packages, add-ons, promos, portfolio)
-- as one JSON document. Row id 'main'.
create table if not exists public.cr_site (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.cr_bookings (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  token text not null unique,
  kind text not null default 'package' check (kind in ('package','custom')),
  status text not null default 'pending_payment'
    check (status in ('quote_requested','quoted','pending_payment','deposit_paid','paid','scheduled','in_production','delivered','completed','cancelled')),
  package_id text,
  package_name text,
  category_name text,
  items jsonb not null default '[]'::jsonb,
  custom_requests jsonb not null default '[]'::jsonb,
  client_name text not null,
  client_email text not null,
  client_phone text not null default '',
  client_instagram text not null default '',
  company text not null default '',
  project_date date,
  project_time text not null default '',
  location text not null default '',
  details text not null default '',
  budget text not null default '',
  referral text not null default '',
  subtotal_cents integer not null default 0,
  discount_cents integer not null default 0,
  total_cents integer not null default 0,
  deposit_cents integer not null default 0,
  amount_paid_cents integer not null default 0,
  promo_code text,
  payment_choice text check (payment_choice in ('deposit','full')),
  turnaround text not null default '',
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_cr_bookings_created on public.cr_bookings(created_at desc);
create index if not exists idx_cr_bookings_status on public.cr_bookings(status);

-- One row per completed Stripe Checkout. The unique session id is what makes
-- payment recording idempotent (webhook + success page can both report it).
create table if not exists public.cr_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.cr_bookings(id) on delete cascade,
  stripe_session_id text not null unique,
  stripe_payment_intent text not null default '',
  amount_cents integer not null default 0,
  kind text not null default 'payment',
  created_at timestamptz not null default now()
);
create index if not exists idx_cr_payments_booking on public.cr_payments(booking_id);

alter table public.cr_site enable row level security;
alter table public.cr_bookings enable row level security;
alter table public.cr_payments enable row level security;
