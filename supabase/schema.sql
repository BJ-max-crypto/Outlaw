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
