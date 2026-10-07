create table if not exists public.profiles (
  id text primary key,
  display_name text,
  cash integer not null default 40,
  energy integer not null default 100,
  employed boolean not null default false,
  businesses text[] not null default '{}',
  vehicles text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

alter table public.profiles add column if not exists username text;
alter table public.profiles alter column cash type bigint;
alter table public.profiles add column if not exists economy jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists last_seen timestamptz not null default now();

create table if not exists public.sessions (
  code text primary key,
  host_id text not null,
  status text not null default 'lobby',
  created_at timestamptz not null default now()
);

create table if not exists public.session_members (
  code text not null references public.sessions (code) on delete cascade,
  player_id text not null,
  username text not null,
  cash bigint not null default 40,
  businesses text[] not null default '{}',
  reinforcements integer not null default 0,
  boat boolean not null default false,
  employed boolean not null default false,
  primary key (code, player_id)
);

create table if not exists public.session_holdings (
  code text not null,
  island_id text not null,
  held_by text not null,
  primary key (code, island_id)
);

create table if not exists public.shop_claims (
  id bigint generated always as identity primary key,
  player_id text not null,
  reward_id text not null,
  granted_at timestamptz not null default now()
);

alter table public.sessions enable row level security;
alter table public.session_members enable row level security;
alter table public.session_holdings enable row level security;
alter table public.shop_claims enable row level security;

-- Clerk is the auth provider. Add it as a Supabase third-party auth provider so
-- auth.jwt()->>'sub' is the Clerk user id. The game server writes with the service
-- role, which bypasses these policies. Signed-in players can read their own row.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.jwt() ->> 'sub') = id);

drop policy if exists "read own shop claims" on public.shop_claims;
create policy "read own shop claims"
  on public.shop_claims
  for select
  to authenticated
  using ((select auth.jwt() ->> 'sub') = player_id);
