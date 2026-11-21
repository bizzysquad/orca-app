-- Spades HQ: team Ready buttons. Adds two nullable columns; safe to re-run.
alter table sp_matches add column if not exists ready_a_at timestamptz;
alter table sp_matches add column if not exists ready_b_at timestamptz;
