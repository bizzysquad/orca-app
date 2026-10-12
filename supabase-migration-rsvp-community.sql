-- ============================================================
-- DJ Maskoff Events: Community-powered homepage ("The People Decide")
-- Run once in the Supabase SQL editor AFTER supabase-migration-rsvp.sql.
-- Safe to re-run.
--
-- Adds:
--   * idea board fields on rsvp_suggestions (title, category, upvote_count)
--   * rsvp_idea_upvotes: one upvote per visitor per idea
--   * rsvp_events.rsvp_goal: organizer-defined attendance goal for the
--     momentum progress bars on /RSVP
--   * 'artist' and 'venue' poll kinds
-- Same access model as the rest of rsvp_*: RLS on, no anon policies,
-- all reads/writes go through /api/rsvp/** with the service-role key.
-- ============================================================

-- IDEA BOARD FIELDS
alter table public.rsvp_suggestions add column if not exists title text not null default '';
alter table public.rsvp_suggestions add column if not exists category text not null default 'party';
alter table public.rsvp_suggestions add column if not exists upvote_count integer not null default 0;
create index if not exists idx_rsvp_suggestions_upvotes on public.rsvp_suggestions(upvote_count desc);

-- UPVOTES
create table if not exists public.rsvp_idea_upvotes (
  id uuid primary key default uuid_generate_v4(),
  suggestion_id uuid not null references public.rsvp_suggestions(id) on delete cascade,
  voter_key text not null,
  ip_hash text,
  created_at timestamptz not null default now(),
  unique (suggestion_id, voter_key)
);
create index if not exists idx_rsvp_idea_upvotes_voter on public.rsvp_idea_upvotes(voter_key);
create index if not exists idx_rsvp_idea_upvotes_ip on public.rsvp_idea_upvotes(ip_hash, created_at);
alter table public.rsvp_idea_upvotes enable row level security;

-- Keep rsvp_suggestions.upvote_count in sync so the board can sort cheaply
create or replace function public.rsvp_sync_idea_upvote_count() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.rsvp_suggestions set upvote_count = upvote_count + 1 where id = new.suggestion_id;
  elsif tg_op = 'DELETE' then
    update public.rsvp_suggestions set upvote_count = greatest(0, upvote_count - 1) where id = old.suggestion_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_rsvp_idea_upvote_count on public.rsvp_idea_upvotes;
create trigger trg_rsvp_idea_upvote_count
  after insert or delete on public.rsvp_idea_upvotes
  for each row execute function public.rsvp_sync_idea_upvote_count();

-- ATTENDANCE GOAL
alter table public.rsvp_events add column if not exists rsvp_goal integer;

-- POLL KINDS: add artist + venue
alter table public.rsvp_poll_questions drop constraint if exists rsvp_poll_questions_kind_check;
alter table public.rsvp_poll_questions add constraint rsvp_poll_questions_kind_check
  check (kind in ('genre','theme','format','artist','venue','custom'));

-- ============================================================
-- SAVED PRESETS: reusable venues and date/time settings for the event editor
-- kind = 'venue'    data = { venue, address, city, state }
-- kind = 'schedule' data = { start_time: "22:00", end_time: "02:00" }
-- ============================================================
create table if not exists public.rsvp_presets (
  id uuid primary key default uuid_generate_v4(),
  kind text not null check (kind in ('venue','schedule')),
  name text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_rsvp_presets_kind on public.rsvp_presets(kind);
alter table public.rsvp_presets enable row level security;

-- Make the new columns usable immediately
notify pgrst, 'reload schema';
