-- ============================================================================
-- Spades HQ (orcafin.app/spades) : tournament management schema
-- Safe to run more than once. Creates new sp_* tables only; touches nothing
-- that already exists in the ORCA database.
--
-- Security model: every sp_* table has Row Level Security ON with NO
-- policies, and anon/authenticated grants are revoked. Browsers can never
-- read or write these tables directly. All access goes through the Next.js
-- API routes under /api/spades/*, which use the service role key on the
-- server and enforce tournament, match and table scoped permissions in
-- src/lib/spades/service.ts.
-- ============================================================================

create extension if not exists pgcrypto;

-- ─── tournaments ────────────────────────────────────────────────────────────
create table if not exists sp_tournaments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,59}$'),
  name text not null check (char_length(name) between 1 and 120),
  subtitle text,
  venue text,
  address text,
  timezone text not null default 'America/New_York',
  starts_at timestamptz,
  ends_at timestamptz,
  schedule_note text,
  award text,
  status text not null default 'draft' check (status in ('draft','registration','locked','live','completed','archived')),
  capacity int not null default 8 check (capacity in (2,4,8,16,32,64)),
  registration_open boolean not null default false,
  waitlist_enabled boolean not null default true,
  roster_locked boolean not null default false,
  bracket_published boolean not null default false,
  is_featured boolean not null default false,
  champion_team_id uuid,
  rules jsonb not null default '{}'::jsonb,
  pulse text not null default gen_random_uuid()::text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists sp_tournaments_one_featured on sp_tournaments (is_featured) where is_featured;

-- ─── teams + players ────────────────────────────────────────────────────────
create table if not exists sp_teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references sp_tournaments(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 40),
  name_key text not null,
  status text not null default 'pending' check (status in ('pending','approved','waitlist','rejected')),
  seed int check (seed is null or seed between 1 and 64),
  contact text,
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tournament_id, name_key),
  unique (id, tournament_id)
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'sp_tournaments_champion_fk') then
    alter table sp_tournaments add constraint sp_tournaments_champion_fk
      foreign key (champion_team_id) references sp_teams(id) on delete set null;
  end if;
end $$;

create table if not exists sp_players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references sp_tournaments(id) on delete restrict,
  team_id uuid not null,
  seat smallint not null check (seat in (1,2)),
  display_name text not null check (char_length(display_name) between 1 and 40),
  name_key text not null,
  is_captain boolean not null default false,
  contact text,
  created_at timestamptz not null default now(),
  foreign key (team_id, tournament_id) references sp_teams(id, tournament_id) on delete cascade,
  -- one person can only be on one team per tournament
  unique (tournament_id, name_key),
  unique (team_id, seat)
);
create unique index if not exists sp_players_one_captain on sp_players (team_id) where is_captain;

-- ─── staff + tables ─────────────────────────────────────────────────────────
create table if not exists sp_staff (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references sp_tournaments(id) on delete restrict,
  display_name text not null check (char_length(display_name) between 1 and 40),
  role text not null check (role in ('director','supervisor')),
  active boolean not null default true,
  contact text,
  created_at timestamptz not null default now()
);
create index if not exists sp_staff_tournament on sp_staff (tournament_id);

create table if not exists sp_tables (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references sp_tournaments(id) on delete restrict,
  number int not null check (number between 1 and 64),
  label text,
  supervisor_id uuid references sp_staff(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tournament_id, number)
);

-- ─── matches ────────────────────────────────────────────────────────────────
create table if not exists sp_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references sp_tournaments(id) on delete restrict,
  round int not null check (round between 1 and 6),
  slot int not null check (slot >= 0),
  team_a_id uuid,
  team_b_id uuid,
  table_id uuid references sp_tables(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','ready','live','paused','completed','final')),
  winner_team_id uuid references sp_teams(id) on delete restrict,
  result_kind text check (result_kind is null or result_kind in ('played','forfeit','dq','bye')),
  result_note text,
  target int not null check (target between 10 and 2000),
  time_limit_min int not null default 0 check (time_limit_min between 0 and 600),
  rules jsonb,                       -- rule snapshot taken when the match starts
  started_at timestamptz,
  paused_at timestamptz,
  paused_ms bigint not null default 0 check (paused_ms >= 0),
  completed_at timestamptz,
  completion_verified_by text,
  finalized_at timestamptz,
  score_a int not null default 0,    -- cached; recomputed from verified hands
  score_b int not null default 0,
  bags_a int not null default 0,
  bags_b int not null default 0,
  hands_verified int not null default 0,
  version int not null default 1,
  created_at timestamptz not null default now(),
  unique (tournament_id, round, slot),
  foreign key (team_a_id, tournament_id) references sp_teams(id, tournament_id) on delete restrict,
  foreign key (team_b_id, tournament_id) references sp_teams(id, tournament_id) on delete restrict,
  check (team_a_id is null or team_b_id is null or team_a_id <> team_b_id),
  check (winner_team_id is null or winner_team_id = team_a_id or winner_team_id = team_b_id),
  check (status not in ('live','paused','completed') or (team_a_id is not null and team_b_id is not null and started_at is not null)),
  check (status <> 'final' or winner_team_id is not null)
);
create index if not exists sp_matches_tournament on sp_matches (tournament_id, round, slot);
create index if not exists sp_matches_table on sp_matches (table_id);

-- ─── hands ──────────────────────────────────────────────────────────────────
create table if not exists sp_hands (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references sp_tournaments(id) on delete restrict,
  match_id uuid not null references sp_matches(id) on delete restrict,
  hand_number int not null check (hand_number >= 1),
  status text not null default 'bidding' check (status in ('bidding','playing','review','disputed','verified','void')),
  dealer_pos smallint not null check (dealer_pos between 0 and 3),
  is_tiebreak boolean not null default false,
  bids_locked_at timestamptz,
  books_a smallint check (books_a between 0 and 13),
  books_b smallint check (books_b between 0 and 13),
  renege_team_id uuid references sp_teams(id) on delete restrict,
  ruling text,
  verified_at timestamptz,
  version int not null default 1,
  created_at timestamptz not null default now(),
  unique (match_id, hand_number),
  check ((books_a is null and books_b is null) or (books_a + books_b = 13)),
  check (status <> 'verified' or (books_a is not null and bids_locked_at is not null))
);
-- Only one hand can be open per match at a time.
create unique index if not exists sp_hands_one_open on sp_hands (match_id) where status in ('bidding','playing','review','disputed');
create index if not exists sp_hands_tournament on sp_hands (tournament_id);

create table if not exists sp_bids (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references sp_tournaments(id) on delete restrict,
  match_id uuid not null references sp_matches(id) on delete restrict,
  hand_id uuid not null references sp_hands(id) on delete restrict,
  player_id uuid not null references sp_players(id) on delete restrict,
  team_id uuid not null references sp_teams(id) on delete restrict,
  bid smallint not null check (bid between 0 and 13),
  entered_by_kind text not null,
  entered_by_id uuid,
  entered_by_name text,
  active boolean not null default true,
  superseded_at timestamptz,
  created_at timestamptz not null default now()
);
-- One live bid per player per hand; superseded bids stay as history.
create unique index if not exists sp_bids_one_active on sp_bids (hand_id, player_id) where active;
create index if not exists sp_bids_match on sp_bids (match_id) where active;

create table if not exists sp_book_reports (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references sp_tournaments(id) on delete restrict,
  match_id uuid not null references sp_matches(id) on delete restrict,
  hand_id uuid not null references sp_hands(id) on delete restrict,
  team_id uuid not null references sp_teams(id) on delete restrict,
  books_a smallint not null check (books_a between 0 and 13),
  books_b smallint not null check (books_b between 0 and 13),
  reporter_kind text not null,
  reporter_id uuid,
  reporter_name text,
  active boolean not null default true,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  check (books_a + books_b = 13)
);
create unique index if not exists sp_reports_one_active on sp_book_reports (hand_id, team_id) where active;

create table if not exists sp_hand_approvals (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references sp_tournaments(id) on delete restrict,
  match_id uuid not null references sp_matches(id) on delete restrict,
  hand_id uuid not null references sp_hands(id) on delete cascade,
  team_id uuid not null references sp_teams(id) on delete restrict,
  approver_kind text not null,
  approver_id uuid,
  approver_name text,
  created_at timestamptz not null default now(),
  unique (hand_id, team_id)
);

-- Derived per hand scoring rows. Rebuilt from verified hands on every change.
create table if not exists sp_score_ledger (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references sp_tournaments(id) on delete restrict,
  match_id uuid not null references sp_matches(id) on delete cascade,
  hand_id uuid not null references sp_hands(id) on delete cascade,
  hand_number int not null,
  team_id uuid not null references sp_teams(id) on delete restrict,
  bid smallint not null,
  books smallint not null,
  made boolean not null,
  renege boolean not null default false,
  points int not null,
  bags_earned int not null,
  bag_penalty int not null,
  total_after int not null,
  bags_after int not null,
  created_at timestamptz not null default now(),
  unique (hand_id, team_id)
);
create index if not exists sp_ledger_tournament on sp_score_ledger (tournament_id, match_id);

-- ─── disputes + audit ───────────────────────────────────────────────────────
create table if not exists sp_disputes (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references sp_tournaments(id) on delete restrict,
  match_id uuid not null references sp_matches(id) on delete restrict,
  hand_id uuid references sp_hands(id) on delete restrict,
  kind text not null check (kind in ('report_mismatch','renege','other','correction_request','director_request','forfeit_report')),
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  raised_by_kind text not null,
  raised_by_id uuid,
  raised_by_name text,
  reason text not null check (char_length(reason) between 1 and 500),
  resolution text,
  resolved_by_name text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check (status = 'open' or resolution is not null)
);
create unique index if not exists sp_disputes_one_mismatch on sp_disputes (hand_id, kind) where status = 'open' and kind = 'report_mismatch';
create index if not exists sp_disputes_tournament on sp_disputes (tournament_id, status);

create table if not exists sp_audit (
  id bigint generated always as identity primary key,
  tournament_id uuid references sp_tournaments(id) on delete restrict,
  match_id uuid,
  hand_id uuid,
  actor_kind text not null,
  actor_id uuid,
  actor_name text,
  actor_role text,
  action text not null,
  before jsonb,
  after jsonb,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists sp_audit_tournament on sp_audit (tournament_id, id desc);
create index if not exists sp_audit_hand on sp_audit (hand_id);

create or replace function sp_audit_immutable() returns trigger language plpgsql as $$
begin
  raise exception 'sp_audit is append only';
end $$;
drop trigger if exists sp_audit_no_change on sp_audit;
create trigger sp_audit_no_change before update or delete on sp_audit
  for each row execute function sp_audit_immutable();

-- ─── access ─────────────────────────────────────────────────────────────────
create table if not exists sp_invitations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references sp_tournaments(id) on delete restrict,
  kind text not null check (kind in ('player','staff')),
  player_id uuid references sp_players(id) on delete cascade,
  staff_id uuid references sp_staff(id) on delete cascade,
  token_hash text not null unique,   -- sha256 only; the raw token is never stored
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check ((kind = 'player' and player_id is not null and staff_id is null) or (kind = 'staff' and staff_id is not null and player_id is null))
);
create index if not exists sp_invitations_player on sp_invitations (player_id);
create index if not exists sp_invitations_staff on sp_invitations (staff_id);

create table if not exists sp_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  kind text not null check (kind in ('owner','staff','player')),
  tournament_id uuid references sp_tournaments(id) on delete cascade,
  player_id uuid references sp_players(id) on delete cascade,
  staff_id uuid references sp_staff(id) on delete cascade,
  invitation_id uuid references sp_invitations(id) on delete set null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists sp_sessions_player on sp_sessions (player_id);
create index if not exists sp_sessions_staff on sp_sessions (staff_id);

create table if not exists sp_auth_attempts (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null,
  kind text not null,
  created_at timestamptz not null default now()
);
create index if not exists sp_auth_attempts_lookup on sp_auth_attempts (key_hash, kind, created_at);

-- ─── lock down: RLS on, no policies, no anon/authenticated grants ───────────
do $$
declare t text;
begin
  foreach t in array array['sp_tournaments','sp_teams','sp_players','sp_staff','sp_tables','sp_matches','sp_hands',
    'sp_bids','sp_book_reports','sp_hand_approvals','sp_score_ledger','sp_disputes','sp_audit','sp_invitations',
    'sp_sessions','sp_auth_attempts']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on table %I from anon, authenticated', t);
  end loop;
end $$;
revoke all on function sp_audit_immutable() from anon, authenticated;

-- ─── inaugural event ────────────────────────────────────────────────────────
insert into sp_tournaments (slug, name, subtitle, venue, address, timezone, starts_at, ends_at, schedule_note, award,
  status, capacity, registration_open, waitlist_enabled, is_featured, rules)
values (
  'dj-maskoff-rnb-spades-2026',
  'DJ Maskoff Presents R&B Spades Tournament',
  'Joker Spades. Doubles. Single elimination.',
  'Korner Pocket',
  '8508 Capital Blvd, Raleigh, NC',
  'America/New_York',
  '2026-11-21 20:00:00-05',
  '2026-11-22 02:00:00-05',
  'Registration 8:00 to 8:30 PM. First deal 8:45 PM.',
  'Championship trophy',
  'registration', 8, true, true,
  not exists (select 1 from sp_tournaments where is_featured),
  '{"biddingMode":"individual","bidOrder":"simultaneous","minTeamBid":4,"maxBid":13,"nilAllowed":false,"blindNilAllowed":false,
    "pointsPerBook":10,"bagValue":1,"bagLimit":10,"bagPenalty":100,"initialBags":0,"targetDefault":250,"targetFinal":350,
    "timeDefaultMin":50,"timeFinalMin":70,"requireCaptainApproval":true,"renegePolicy":"lose_bid_award_opponent"}'::jsonb
)
on conflict (slug) do nothing;

insert into sp_tables (tournament_id, number)
select t.id, n from sp_tournaments t cross join generate_series(1, 4) as n
where t.slug = 'dj-maskoff-rnb-spades-2026'
on conflict (tournament_id, number) do nothing;
