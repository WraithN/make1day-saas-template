-- make1day — initial schema
-- Run this in the Supabase SQL editor, or via the Supabase CLI:
--   supabase db push   (or paste into Dashboard → SQL Editor)

-- ─────────────────────────────────────────────
-- profiles: 1:1 with auth.users
-- ─────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
  on public.profiles for update
  using (auth.uid() = id);

-- auto-create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- subscriptions: payment-provider ↔ Supabase bridge
-- Provider-agnostic: works with Stripe / Creem / PayPal / Waffo / Lemon Squeezy.
-- ─────────────────────────────────────────────
create table if not exists public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users (id) on delete cascade,
  provider                 text not null default 'stripe', -- stripe | creem | paypal | waffo | lemonsqueezy
  provider_customer_id     text,
  provider_subscription_id text,
  status                   text not null default 'incomplete', -- active | trialing | canceled | past_due | incomplete
  plan                     text,                              -- pro | scale
  current_period_end       timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- One subscription row per (provider, provider subscription id).
create unique index if not exists subscriptions_provider_sub_idx
  on public.subscriptions (provider, provider_subscription_id);

create index if not exists subscriptions_user_idx on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions self read" on public.subscriptions;
create policy "subscriptions self read"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- updated_at maintenance
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_touch on public.subscriptions;
create trigger subscriptions_touch
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();
