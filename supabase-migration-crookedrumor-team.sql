-- ============================================================
-- Crooked Rumor — "Join the Team" applications
-- Run once in the Supabase SQL editor (Project > SQL Editor > New query).
-- Safe to re-run: every statement is guarded. Does not touch cr_site,
-- cr_bookings, or cr_payments.
--
-- Access model (same as the other cr_* tables): RLS on, no policies for
-- anon/authenticated, so applicant details can never be read from the
-- browser. Everything goes through /api/crookedrumors/** with the
-- service-role key, and the admin endpoints require the CR admin session.
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists public.cr_applications (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'new'
    check (status in ('new','under_review','contacted','accepted','declined')),
  full_name text not null,
  email text not null,
  social_handle text not null default '',
  location text not null,
  skills text[] not null default '{}',
  skills_other text not null default '',
  about text not null default '',
  contribution text not null,
  portfolio_url text not null default '',
  unpaid_openness text not null
    check (unpaid_openness in ('yes','depends','paid_only')),
  acknowledged boolean not null default false,
  admin_notes text not null default '',
  -- Salted SHA-256 of the submitter IP (never the raw IP), used only for
  -- rate limiting.
  ip_hash text not null default '',
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_cr_applications_created on public.cr_applications(created_at desc);
create index if not exists idx_cr_applications_status on public.cr_applications(status);
create index if not exists idx_cr_applications_ip on public.cr_applications(ip_hash, created_at desc);
create index if not exists idx_cr_applications_email on public.cr_applications(lower(email), created_at desc);

alter table public.cr_applications enable row level security;
