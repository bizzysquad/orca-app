-- ============================================================
-- DJ Maskoff Events: Event Perks (drink discounts, freebies, etc.)
-- Run once in the Supabase SQL editor AFTER supabase-migration-rsvp.sql.
-- Safe to re-run.
--
--   rsvp_perks             what the organizer offers, with limits
--   rsvp_perk_grants       per-guest records: the separate perk QR codes
--                          (delivery = 'separate') and organizer voids
--   rsvp_perk_redemptions  every scan-and-redeem, for limits + analytics
-- Same access model as the rest of rsvp_*: RLS on, no anon policies.
-- ============================================================

create table if not exists public.rsvp_perks (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.rsvp_events(id) on delete cascade,
  name text not null,
  description text not null default '',
  delivery text not null default 'ticket' check (delivery in ('ticket','separate')),
  uses_per_guest integer default 1,          -- null = unlimited; multiplied by party size
  total_cap integer,                         -- null = no cap
  valid_from timestamptz,
  valid_until timestamptz,
  eligibility text not null default 'all' check (eligibility in ('all','first_n','checked_in')),
  first_n integer,
  is_paused boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_rsvp_perks_event on public.rsvp_perks(event_id);

create table if not exists public.rsvp_perk_grants (
  id uuid primary key default uuid_generate_v4(),
  perk_id uuid not null references public.rsvp_perks(id) on delete cascade,
  ticket_id uuid not null references public.rsvp_tickets(id) on delete cascade,
  code_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  voided boolean not null default false,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (perk_id, ticket_id)
);
create index if not exists idx_rsvp_perk_grants_ticket on public.rsvp_perk_grants(ticket_id);

create table if not exists public.rsvp_perk_redemptions (
  id uuid primary key default uuid_generate_v4(),
  perk_id uuid not null references public.rsvp_perks(id) on delete cascade,
  ticket_id uuid not null references public.rsvp_tickets(id) on delete cascade,
  event_id uuid not null references public.rsvp_events(id) on delete cascade,
  staff_name text not null default '',
  staff_role text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_rsvp_perk_redemptions_perk on public.rsvp_perk_redemptions(perk_id);
create index if not exists idx_rsvp_perk_redemptions_ticket on public.rsvp_perk_redemptions(ticket_id);
create index if not exists idx_rsvp_perk_redemptions_event on public.rsvp_perk_redemptions(event_id, created_at);

alter table public.rsvp_perks enable row level security;
alter table public.rsvp_perk_grants enable row level security;
alter table public.rsvp_perk_redemptions enable row level security;

insert into public.rsvp_email_templates (key, label, subject, heading, body_html, button_text, button_url_pattern, is_transactional)
values (
  'perk_delivery', 'Perk Delivery', 'Your perk for {{event_name}}: {{perk_name}}', '{{perk_name}}',
  'You unlocked a perk for {{event_name}}. {{perk_description}} Show the QR code at the bar or to any staff member to redeem it.',
  'View My Perk', '{{perk_url}}', true
)
on conflict (key) do nothing;

notify pgrst, 'reload schema';
