-- ============================================================
-- Crooked Rumor — Client Center (client database + work delivery log)
-- Run once in the Supabase SQL editor (Project > SQL Editor > New query).
-- Safe to re-run: every statement is guarded. Does not modify any
-- existing table.
--
-- Same access model as the other cr_* tables: RLS on, no policies, so only
-- the server (service role, behind the CR admin login) can read or write.
-- ============================================================

create extension if not exists "pgcrypto";

-- Clients you add by hand, plus private notes on clients that came in
-- through bookings. Booking clients are matched by lowercase email.
create table if not exists public.cr_clients (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  phone text not null default '',
  instagram text not null default '',
  company text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per "deliver finished work" email.
create table if not exists public.cr_deliveries (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  client_name text not null default '',
  booking_id uuid references public.cr_bookings(id) on delete set null,
  booking_ref text not null default '',
  subject text not null default '',
  message text not null default '',
  links jsonb not null default '[]'::jsonb,
  status text not null default 'sent' check (status in ('sent','failed')),
  error text not null default '',
  email_id text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_cr_deliveries_email on public.cr_deliveries(lower(client_email), created_at desc);
create index if not exists idx_cr_deliveries_created on public.cr_deliveries(created_at desc);

alter table public.cr_clients enable row level security;
alter table public.cr_deliveries enable row level security;
