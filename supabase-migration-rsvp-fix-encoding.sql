-- ============================================================
-- Fix-up migration #2 for the RSVP module.
-- Run this once in the Supabase SQL editor, after the original
-- supabase-migration-rsvp.sql. Safe to re-run.
--
-- 1. Postgres's encode() function only supports 'base64', 'hex', or
--    'escape' — NOT 'base64url' (that's a Node.js-only encoding name).
--    The original migration mistakenly used 'base64url' as the DEFAULT
--    for rsvp_votes.edit_token and rsvp_tickets.qr_token, which made
--    every insert into those tables fail with:
--      "unrecognized encoding: 'base64url'"
--    Switch both to 'hex' (URL-safe, matches how new tokens are already
--    generated elsewhere in the app code for transfers/reissues).
--
-- 2. New table: rsvp_staff_passwords — lets the Owner change any staff
--    role's shared password from /RSVP/admin/settings without touching
--    env vars or redeploying. Passwords are stored as salted scrypt
--    hashes, never plaintext. A role with no row here still falls back
--    to its RSVP_*_PASSWORD env var.
-- ============================================================

alter table public.rsvp_votes alter column edit_token set default encode(gen_random_bytes(24), 'hex');
alter table public.rsvp_tickets alter column qr_token set default encode(gen_random_bytes(32), 'hex');

create table if not exists public.rsvp_staff_passwords (
  role text primary key check (role in ('owner','event_admin','door_staff','readonly_staff')),
  password_hash text not null,
  updated_at timestamptz not null default now()
);
alter table public.rsvp_staff_passwords enable row level security;
