-- ============================================================
-- ORCA Financial Command Center — Supabase Database Schema
-- Shared backend for both the HTML app and Next.js web app
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null default '',
  email text not null default '',
  pay_freq text not null default 'biweekly',
  pay_cycle text not null default 'standard',
  pay_rate text not null default '18',
  hours_per_day text not null default '8',
  next_pay text not null default '',
  credit_score integer not null default 648,
  utilization integer not null default 34,
  on_time integer not null default 94,
  acct_age numeric not null default 2.5,
  inquiries integer not null default 3,
  total_debt numeric not null default 4200,
  credit_limit numeric not null default 12000,
  score_history jsonb not null default '[]'::jsonb,
  split_mode text not null default 'equal',
  onboarded boolean not null default false,
  admin_config jsonb not null default '{"appName":"ORCA","tagline":"Your Money. Commanded.","logoUrl":null,"goldColor":"#d4a843"}'::jsonb,
  theme text not null default 'dark',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- INCOME SOURCES
-- ============================================================
create table public.income_sources (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  amount numeric not null default 0,
  freq text not null default 'biweekly',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- BILLS
-- ============================================================
create table public.bills (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  amount numeric not null default 0,
  cat text not null default 'Other',
  due text not null,
  freq text not null default 'monthly',
  status text not null default 'upcoming',
  alloc jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- EXPENSES
-- ============================================================
create table public.expenses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  amount numeric not null default 0,
  cat text not null default 'Misc',
  date text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- SAVINGS GOALS
-- ============================================================
create table public.savings_goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  target numeric not null default 0,
  current numeric not null default 0,
  date text not null,
  c_type text not null default 'fixed',
  c_val numeric not null default 0,
  active boolean not null default true,
  plaid_account_id text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- GROUPS (Stack Circle)
-- ============================================================
create table public.groups (
  id uuid primary key default uuid_generate_v4(),
  created_by uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  goal text not null default '',
  target numeric not null default 0,
  current numeric not null default 0,
  date text not null,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table public.group_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  role text not null default 'member',
  target numeric not null default 0,
  contrib numeric not null default 0,
  balance numeric not null default 0
);

create table public.group_activity (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references public.groups(id) on delete cascade not null,
  user_name text not null,
  msg text not null,
  date text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- RENT REPORTING
-- ============================================================
create table public.rent_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  month text not null,
  amount numeric not null default 0,
  status text not null default 'upcoming',
  reported boolean not null default false,
  r_date text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null default 'info',
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROOMMATES
-- ============================================================
create table public.roommate_config (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  enabled boolean not null default true,
  total_rent numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.roommate_utilities (
  id uuid primary key default uuid_generate_v4(),
  config_id uuid references public.roommate_config(id) on delete cascade not null,
  name text not null,
  amount numeric not null default 0,
  split text not null default 'equal'
);

create table public.roommate_members (
  id uuid primary key default uuid_generate_v4(),
  config_id uuid references public.roommate_config(id) on delete cascade not null,
  name text not null,
  share integer not null default 0,
  paid_rent boolean not null default false,
  paid_utilities boolean not null default false
);

create table public.roommate_history (
  id uuid primary key default uuid_generate_v4(),
  config_id uuid references public.roommate_config(id) on delete cascade not null,
  month text not null,
  all_paid boolean not null default false
);

-- ============================================================
-- PLAID CONNECTION (metadata only — tokens stored server-side)
-- ============================================================
create table public.plaid_connections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  connected boolean not null default false,
  accounts jsonb not null default '[]'::jsonb,
  last_sync text,
  checking_balance numeric not null default 0,
  savings_balance numeric not null default 0,
  credit_used numeric not null default 0,
  credit_limit_plaid numeric not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- DATA SYNC TRACKING
-- Tracks last sync timestamp per user per client
-- Used to resolve conflicts between HTML app and web app
-- ============================================================
create table public.sync_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  client_type text not null, -- 'html_app' or 'web_app'
  last_sync timestamptz not null default now(),
  data_hash text, -- optional hash for conflict detection
  unique(user_id, client_type)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Every user can only access their own data
-- ============================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.income_sources enable row level security;
alter table public.bills enable row level security;
alter table public.expenses enable row level security;
alter table public.savings_goals enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_activity enable row level security;
alter table public.rent_entries enable row level security;
alter table public.notifications enable row level security;
alter table public.roommate_config enable row level security;
alter table public.roommate_utilities enable row level security;
alter table public.roommate_members enable row level security;
alter table public.roommate_history enable row level security;
alter table public.plaid_connections enable row level security;
alter table public.sync_log enable row level security;

-- Profiles: users can read/update their own
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Income sources: own data only
create policy "Own income sources" on public.income_sources for all using (auth.uid() = user_id);

-- Bills: own data only
create policy "Own bills" on public.bills for all using (auth.uid() = user_id);

-- Expenses: own data only
create policy "Own expenses" on public.expenses for all using (auth.uid() = user_id);

-- Savings goals: own data only
create policy "Own savings goals" on public.savings_goals for all using (auth.uid() = user_id);

-- Groups: creator + members can access
create policy "Group creator access" on public.groups for all using (auth.uid() = created_by);
create policy "Group members can view" on public.group_members for select using (auth.uid() = user_id or exists (select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid()));
create policy "Group members manage" on public.group_members for all using (exists (select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid()));
create policy "Group activity view" on public.group_activity for select using (exists (select 1 from public.group_members gm where gm.group_id = group_activity.group_id and gm.user_id = auth.uid()));
create policy "Group activity insert" on public.group_activity for insert with check (exists (select 1 from public.group_members gm where gm.group_id = group_activity.group_id and gm.user_id = auth.uid()));

-- Rent entries: own data only
create policy "Own rent entries" on public.rent_entries for all using (auth.uid() = user_id);

-- Notifications: own data only
create policy "Own notifications" on public.notifications for all using (auth.uid() = user_id);

-- Roommate config: own data only
create policy "Own roommate config" on public.roommate_config for all using (auth.uid() = user_id);
create policy "Own roommate utilities" on public.roommate_utilities for all using (exists (select 1 from public.roommate_config rc where rc.id = config_id and rc.user_id = auth.uid()));
create policy "Own roommate members" on public.roommate_members for all using (exists (select 1 from public.roommate_config rc where rc.id = config_id and rc.user_id = auth.uid()));
create policy "Own roommate history" on public.roommate_history for all using (exists (select 1 from public.roommate_config rc where rc.id = config_id and rc.user_id = auth.uid()));

-- Plaid connections: own data only
create policy "Own plaid connection" on public.plaid_connections for all using (auth.uid() = user_id);

-- Sync log: own data only
create policy "Own sync log" on public.sync_log for all using (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: Auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.email, '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- TRIGGER: Updated_at timestamp
-- ============================================================
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();
