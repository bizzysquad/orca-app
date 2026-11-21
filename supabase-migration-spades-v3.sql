-- Spades HQ v3: event types, team limits, scheduled starts, per team bid
-- control, best of N series, and deletable test events.
-- Only adds columns and replaces one trigger function. Safe to re-run.

-- events
alter table sp_tournaments add column if not exists event_type text not null default 'tournament';
alter table sp_tournaments add column if not exists is_test boolean not null default false;
alter table sp_tournaments add column if not exists team_limit int;
alter table sp_tournaments add column if not exists auto_start boolean not null default false;
update sp_tournaments set team_limit = capacity where team_limit is null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'sp_tournaments_event_type_chk') then
    alter table sp_tournaments add constraint sp_tournaments_event_type_chk
      check (event_type in ('tournament','small','exhibition','series','custom','test'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sp_tournaments_team_limit_chk') then
    alter table sp_tournaments add constraint sp_tournaments_team_limit_chk check (team_limit is null or team_limit between 2 and 64);
  end if;
end $$;

-- teams choose who enters bids
alter table sp_teams add column if not exists bid_control text not null default 'captain';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'sp_teams_bid_control_chk') then
    alter table sp_teams add constraint sp_teams_bid_control_chk check (bid_control in ('captain','individual'));
  end if;
end $$;

-- scheduled start + series scoring
alter table sp_matches add column if not exists scheduled_at timestamptz;
alter table sp_matches add column if not exists games_a int not null default 0;
alter table sp_matches add column if not exists games_b int not null default 0;
alter table sp_matches add column if not exists current_game int not null default 1;
alter table sp_hands add column if not exists game_number int not null default 1;
create index if not exists sp_matches_scheduled on sp_matches (tournament_id, status, scheduled_at);

-- The audit log stays append only for real events. Test events can be
-- deleted completely, so their audit rows may be removed.
create or replace function sp_audit_immutable() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and exists (select 1 from sp_tournaments t where t.id = old.tournament_id and t.is_test) then
    return old;
  end if;
  raise exception 'sp_audit is append only';
end $$;
revoke all on function sp_audit_immutable() from anon, authenticated;
