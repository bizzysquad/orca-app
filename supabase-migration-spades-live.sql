-- Spades HQ: online tables for "Play a game" with friends. Safe to re-run.
--
-- One row per open table. Rows are temporary: the app deletes a table 30
-- minutes after its match ends, after 6 hours without activity, or when the
-- host closes it. Row level security is on with no policies, so browsers
-- (anon key) can never read the cards; only the server (service role) can.

create table if not exists sp_live_tables (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  version integer not null default 1,
  seats jsonb not null,
  game jsonb,
  settings jsonb not null,
  moved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists sp_live_tables_expires_idx on sp_live_tables (expires_at);

alter table sp_live_tables enable row level security;
