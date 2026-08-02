-- ============================================================
-- DJ Maskoff Events — RSVP, Voting & Ticketing System
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / OR REPLACE.
--
-- Access model: every rsvp_* table has RLS enabled with NO policies for the
-- anon/authenticated roles. That means the public browser client can never
-- read or write these tables directly — all access (public pages included)
-- goes through Next.js API routes using the service-role key, which bypasses
-- RLS. This matches the existing api/dj/* and api/bizzyplug/* pattern in
-- this codebase and keeps attendee PII, ticket tokens, and vote data fully
-- server-controlled.
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- EVENTS
-- ============================================================
create table if not exists public.rsvp_events (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name text not null,
  flyer_url text,
  description text not null default '',
  venue text not null default '',
  address text not null default '',
  city text not null default '',
  state text not null default '',
  age_requirement text not null default '',
  dress_code text not null default '',
  start_time timestamptz,
  end_time timestamptz,
  music_genres text[] not null default '{}',
  performer_info text not null default '',
  rsvp_capacity integer,
  ticket_capacity integer,
  ticket_price_cents integer not null default 0,
  is_paid boolean not null default false,
  stripe_config jsonb not null default '{}'::jsonb,
  refund_policy text not null default '',
  contact_email text not null default 'maskoffdadj@gmail.com',
  status text not null default 'draft'
    check (status in ('draft','collecting_interest','voting_open','date_selected','rsvp_open','tickets_on_sale','sold_out','completed','cancelled')),
  vote_visibility text not null default 'public'
    check (vote_visibility in ('public','hidden_until_voted','admin_only')),
  custom_rsvp_questions jsonb not null default '[]'::jsonb,
  faqs jsonb not null default '[]'::jsonb,
  policies text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_rsvp_events_status on public.rsvp_events(status);
create index if not exists idx_rsvp_events_slug on public.rsvp_events(slug);

-- ============================================================
-- PROPOSED DATES (voting)
-- ============================================================
create table if not exists public.rsvp_proposed_dates (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.rsvp_events(id) on delete cascade,
  label text not null,
  date date not null,
  sort_order integer not null default 0,
  is_winner boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_rsvp_proposed_dates_event on public.rsvp_proposed_dates(event_id);

-- ============================================================
-- POLLS (genre / theme / format)
-- ============================================================
create table if not exists public.rsvp_poll_questions (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.rsvp_events(id) on delete cascade,
  kind text not null check (kind in ('genre','theme','format','custom')),
  question text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_rsvp_poll_questions_event on public.rsvp_poll_questions(event_id);

create table if not exists public.rsvp_poll_options (
  id uuid primary key default uuid_generate_v4(),
  poll_question_id uuid not null references public.rsvp_poll_questions(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_rsvp_poll_options_question on public.rsvp_poll_options(poll_question_id);

-- ============================================================
-- VOTES
-- date votes: date_id set, poll_option_id null
-- poll votes: poll_option_id set, date_id null
-- ============================================================
create table if not exists public.rsvp_votes (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.rsvp_events(id) on delete cascade,
  date_id uuid references public.rsvp_proposed_dates(id) on delete cascade,
  poll_question_id uuid references public.rsvp_poll_questions(id) on delete cascade,
  poll_option_id uuid references public.rsvp_poll_options(id) on delete cascade,
  voter_name text not null,
  voter_email text not null,
  guest_count integer not null default 0,
  wants_updates boolean not null default false,
  ip_hash text,
  session_token text,
  edit_token text not null unique default encode(gen_random_bytes(24), 'base64url'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (date_id is not null and poll_option_id is null and poll_question_id is null) or
    (date_id is null and poll_option_id is not null and poll_question_id is not null)
  )
);
create index if not exists idx_rsvp_votes_event on public.rsvp_votes(event_id);
create index if not exists idx_rsvp_votes_edit_token on public.rsvp_votes(edit_token);
create index if not exists idx_rsvp_votes_ip_hash on public.rsvp_votes(event_id, ip_hash, created_at);
-- One date vote per person per event ("which weekend works best" is single-choice)
create unique index if not exists uq_rsvp_votes_date_per_email on public.rsvp_votes(event_id, voter_email) where date_id is not null;
-- One vote per poll QUESTION per person (not per option — a person picks one genre, not several)
create unique index if not exists uq_rsvp_votes_poll_per_email on public.rsvp_votes(poll_question_id, voter_email) where poll_question_id is not null;

-- ============================================================
-- SUGGESTIONS
-- ============================================================
create table if not exists public.rsvp_suggestions (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references public.rsvp_events(id) on delete cascade,
  name text not null,
  email text not null,
  event_idea text not null default '',
  preferred_location text not null default '',
  preferred_weekend text not null default '',
  preferred_music text not null default '',
  artist_suggestion text not null default '',
  theme_suggestion text not null default '',
  comments text not null default '',
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_rsvp_suggestions_event on public.rsvp_suggestions(event_id);
create index if not exists idx_rsvp_suggestions_approved on public.rsvp_suggestions(is_approved);

-- ============================================================
-- TICKET TYPES & PROMO CODES
-- ============================================================
create table if not exists public.rsvp_ticket_types (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.rsvp_events(id) on delete cascade,
  name text not null,
  description text not null default '',
  price_cents integer not null default 0,
  quantity_limit integer,
  sold_count integer not null default 0,
  sales_start timestamptz,
  sales_end timestamptz,
  is_complimentary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_rsvp_ticket_types_event on public.rsvp_ticket_types(event_id);

create table if not exists public.rsvp_promo_codes (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.rsvp_events(id) on delete cascade,
  code text not null,
  discount_type text not null default 'percent' check (discount_type in ('percent','amount')),
  discount_value integer not null default 0,
  max_uses integer,
  used_count integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique(event_id, code)
);
create index if not exists idx_rsvp_promo_codes_event on public.rsvp_promo_codes(event_id);

-- ============================================================
-- ORDERS
-- ============================================================
create table if not exists public.rsvp_orders (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.rsvp_events(id) on delete cascade,
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text not null default '',
  stripe_session_id text,
  stripe_payment_intent_id text,
  amount_cents integer not null default 0,
  status text not null default 'pending'
    check (status in ('pending','paid','refunded','cancelled','free')),
  promo_code_id uuid references public.rsvp_promo_codes(id),
  answers jsonb not null default '{}'::jsonb,
  marketing_opt_in boolean not null default false,
  agreed_to_policies boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_rsvp_orders_event on public.rsvp_orders(event_id);
create index if not exists idx_rsvp_orders_stripe_session on public.rsvp_orders(stripe_session_id);
create index if not exists idx_rsvp_orders_email on public.rsvp_orders(buyer_email);

-- ============================================================
-- TICKETS
-- qr_token is a cryptographically random, non-sequential, unguessable
-- identifier. It is the ONLY thing encoded in the QR code —
-- no PII, no payment data, no predictable database id.
-- ============================================================
create table if not exists public.rsvp_tickets (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.rsvp_orders(id) on delete cascade,
  event_id uuid not null references public.rsvp_events(id) on delete cascade,
  ticket_type_id uuid references public.rsvp_ticket_types(id),
  qr_token text not null unique default encode(gen_random_bytes(32), 'base64url'),
  verification_code text not null default lpad((floor(random() * 1000000))::text, 6, '0'),
  ticket_number text not null unique,
  holder_name text not null,
  holder_email text not null default '',
  guest_names text[] not null default '{}',
  status text not null default 'valid'
    check (status in ('valid','checked_in','invalid','cancelled','refunded','transferred','expired','flagged')),
  checked_in_at timestamptz,
  checked_in_by text,
  flagged_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_rsvp_tickets_order on public.rsvp_tickets(order_id);
create index if not exists idx_rsvp_tickets_event on public.rsvp_tickets(event_id);
create index if not exists idx_rsvp_tickets_qr_token on public.rsvp_tickets(qr_token);
create index if not exists idx_rsvp_tickets_status on public.rsvp_tickets(status);

create table if not exists public.rsvp_ticket_transfers (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid not null references public.rsvp_tickets(id) on delete cascade,
  old_token text not null,
  new_token text not null,
  from_name text not null,
  from_email text not null,
  to_name text not null,
  to_email text not null,
  transferred_at timestamptz not null default now()
);
create index if not exists idx_rsvp_ticket_transfers_ticket on public.rsvp_ticket_transfers(ticket_id);

create table if not exists public.rsvp_checkins (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid not null references public.rsvp_tickets(id) on delete cascade,
  staff_name text not null,
  staff_role text not null,
  action text not null check (action in ('check_in','reverse','reject','door_note')),
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_rsvp_checkins_ticket on public.rsvp_checkins(ticket_id);

-- ============================================================
-- WAITLIST
-- ============================================================
create table if not exists public.rsvp_waitlist (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.rsvp_events(id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null default '',
  party_size integer not null default 1,
  status text not null default 'waiting' check (status in ('waiting','promoted','declined','expired')),
  promoted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_rsvp_waitlist_event on public.rsvp_waitlist(event_id);

-- ============================================================
-- EMAIL TEMPLATES & LOGS
-- ============================================================
create table if not exists public.rsvp_email_templates (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  label text not null,
  subject text not null default '',
  preview_text text not null default '',
  heading text not null default '',
  body_html text not null default '',
  button_text text not null default '',
  button_url_pattern text not null default '',
  footer text not null default '',
  is_transactional boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.rsvp_email_logs (
  id uuid primary key default uuid_generate_v4(),
  template_key text not null,
  event_id uuid references public.rsvp_events(id) on delete cascade,
  recipient text not null,
  resend_message_id text,
  status text not null default 'scheduled'
    check (status in ('scheduled','sent','delivered','opened','clicked','bounced','failed')),
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_rsvp_email_logs_event on public.rsvp_email_logs(event_id);
create index if not exists idx_rsvp_email_logs_message on public.rsvp_email_logs(resend_message_id);
create index if not exists idx_rsvp_email_logs_recipient on public.rsvp_email_logs(recipient);

-- Marketing unsubscribes (transactional email is never suppressed by this list)
create table if not exists public.rsvp_unsubscribes (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- ============================================================
-- STAFF SESSIONS & AUDIT LOG
-- Staff auth is a shared password per role (Owner / Event Administrator /
-- Door Staff / Read-Only Staff) checked against env vars — this table just
-- records the display name typed at login so audit entries are attributable
-- to a person even though the password itself is shared.
-- ============================================================
create table if not exists public.rsvp_staff_sessions (
  id uuid primary key default uuid_generate_v4(),
  role text not null check (role in ('owner','event_admin','door_staff','readonly_staff')),
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.rsvp_audit_log (
  id uuid primary key default uuid_generate_v4(),
  actor_role text not null,
  actor_name text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_rsvp_audit_log_entity on public.rsvp_audit_log(entity_type, entity_id);
create index if not exists idx_rsvp_audit_log_created on public.rsvp_audit_log(created_at desc);

-- ============================================================
-- PAGE VISIT TRACKING (lightweight, for analytics)
-- ============================================================
create table if not exists public.rsvp_page_visits (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references public.rsvp_events(id) on delete cascade,
  path text not null,
  referrer text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_rsvp_page_visits_event on public.rsvp_page_visits(event_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- Enabled with zero anon/authenticated policies -> only the service-role
-- key (used exclusively by src/app/api/rsvp/** route handlers) can read or
-- write these tables. See note at top of file.
-- ============================================================
alter table public.rsvp_events enable row level security;
alter table public.rsvp_proposed_dates enable row level security;
alter table public.rsvp_poll_questions enable row level security;
alter table public.rsvp_poll_options enable row level security;
alter table public.rsvp_votes enable row level security;
alter table public.rsvp_suggestions enable row level security;
alter table public.rsvp_ticket_types enable row level security;
alter table public.rsvp_promo_codes enable row level security;
alter table public.rsvp_orders enable row level security;
alter table public.rsvp_tickets enable row level security;
alter table public.rsvp_ticket_transfers enable row level security;
alter table public.rsvp_checkins enable row level security;
alter table public.rsvp_waitlist enable row level security;
alter table public.rsvp_email_templates enable row level security;
alter table public.rsvp_email_logs enable row level security;
alter table public.rsvp_unsubscribes enable row level security;
alter table public.rsvp_staff_sessions enable row level security;
alter table public.rsvp_audit_log enable row level security;
alter table public.rsvp_page_visits enable row level security;

-- ============================================================
-- SEED: default email templates (editable afterwards from /RSVP/admin/emails)
-- ============================================================
insert into public.rsvp_email_templates (key, label, subject, heading, body_html, button_text, button_url_pattern, is_transactional)
values
  ('vote_confirmation', 'Vote Confirmation', 'Your vote is in for {{event_name}}', 'Thanks for voting!', 'We''ve recorded your vote for {{event_name}}. Want to change it later? Use your secure link below.', 'Update My Vote', '{{manage_url}}', true),
  ('voting_reminder', 'Voting Reminder', 'Last call to vote on {{event_name}}', 'Voting closes soon', 'The poll for {{event_name}} closes soon — make sure your voice is counted.', 'Vote Now', '{{event_url}}', false),
  ('date_announcement', 'Winning Date Announcement', '{{event_name}} — the date is locked in!', 'It''s official', 'The votes are in! {{event_name}} is happening on {{event_date}}.', 'View Event', '{{event_url}}', false),
  ('event_confirmed', 'Event Officially Confirmed', '{{event_name}} is confirmed', 'See you there', 'Full details for {{event_name}} are now live.', 'View Details', '{{event_url}}', false),
  ('rsvp_confirmation', 'RSVP Confirmation', 'You''re on the list for {{event_name}}', 'RSVP Confirmed', 'Your RSVP for {{event_name}} is confirmed.', 'View My RSVP', '{{ticket_url}}', true),
  ('payment_confirmation', 'Payment Confirmation', 'Payment received for {{event_name}}', 'Payment Confirmed', 'We''ve received your payment for {{event_name}}.', 'View Receipt', '{{ticket_url}}', true),
  ('digital_invitation', 'Digital Invitation Delivery', 'Your ticket for {{event_name}}', 'Your Pass Is Ready', 'Here''s your personalized digital invitation for {{event_name}}.', 'View My Pass', '{{ticket_url}}', true),
  ('event_reminder', 'Upcoming Event Reminder', '{{event_name}} is almost here', 'See You Soon', 'Just a reminder — {{event_name}} is coming up.', 'View Event', '{{event_url}}', false),
  ('venue_details', 'Venue Details', 'Venue info for {{event_name}}', 'Where To Go', 'Here are the venue details for {{event_name}}.', 'Get Directions', '{{event_url}}', false),
  ('parking_instructions', 'Parking Instructions', 'Parking info for {{event_name}}', 'Parking Info', 'Here''s where to park for {{event_name}}.', 'View Event', '{{event_url}}', false),
  ('event_update', 'Event Update', 'Update: {{event_name}}', 'Important Update', 'There''s an update regarding {{event_name}}.', 'View Details', '{{event_url}}', true),
  ('ticket_transfer', 'Ticket Transfer', 'A ticket for {{event_name}} was transferred to you', 'You''ve Got a Ticket', '{{from_name}} transferred a ticket for {{event_name}} to you.', 'View My Pass', '{{ticket_url}}', true),
  ('waitlist_confirmation', 'Waitlist Confirmation', 'You''re on the waitlist for {{event_name}}', 'Waitlist Confirmed', 'You''ve been added to the waitlist for {{event_name}}.', 'View Event', '{{event_url}}', true),
  ('waitlist_promotion', 'Waitlist Promotion', 'A spot opened up for {{event_name}}!', 'You''re In!', 'A spot opened up and you''ve been promoted from the waitlist for {{event_name}}.', 'Claim My Spot', '{{event_url}}', true),
  ('event_cancellation', 'Event Cancellation', '{{event_name}} has been cancelled', 'Event Cancelled', 'We''re sorry to say {{event_name}} has been cancelled.', 'Learn More', '{{event_url}}', true),
  ('refund_confirmation', 'Refund Confirmation', 'Refund processed for {{event_name}}', 'Refund Confirmed', 'Your refund for {{event_name}} has been processed.', 'View Details', '{{event_url}}', true),
  ('thank_you', 'Thank You For Attending', 'Thanks for coming to {{event_name}}', 'Thanks For Coming', 'Thanks for being part of {{event_name}}!', 'See Photos', '{{event_url}}', false),
  ('post_event_survey', 'Post-Event Survey', 'Tell us about {{event_name}}', 'How Was It?', 'We''d love your feedback on {{event_name}}.', 'Take Survey', '{{event_url}}', false),
  ('future_announcement', 'Future Event Announcement', 'What''s next from DJ Maskoff Events', 'Coming Up', 'Here''s what''s coming up next.', 'See Upcoming Events', '{{event_url}}', false),
  ('email_verification', 'Email Verification', 'Confirm your email', 'Verify Your Email', 'Please confirm your email address.', 'Verify Email', '{{event_url}}', true)
on conflict (key) do nothing;
