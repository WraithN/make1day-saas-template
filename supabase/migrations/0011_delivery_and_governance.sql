-- Delivery, rate limiting and data-governance tables for the hosted backend.
-- Mirrors the SQLite SCHEMA in lib/sqlite.ts. Apply with the Supabase SQL
-- editor / CLI before enabling production mail delivery.
--
-- These tables are operator data, never end-user readable: RLS is enabled and
-- only the service role (server-side) may touch them.

create table if not exists public.mail_outbox (
  id              uuid primary key default gen_random_uuid(),
  dedupe_key      text unique,
  recipient       text not null,
  subject         text not null,
  html            text not null,
  text_body       text not null,
  template        text,
  lang            text,
  status          text not null default 'pending',
  attempts        integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_mail_outbox_due
  on public.mail_outbox (status, next_attempt_at);

create table if not exists public.rate_limits (
  bucket     text primary key,
  window_key text not null,
  used       integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.consent_events (
  id         uuid primary key default gen_random_uuid(),
  subject    text not null,
  kind       text not null,
  policy     text not null,
  detail     text,
  created_at timestamptz not null default now()
);
create index if not exists idx_consent_subject
  on public.consent_events (subject);

create table if not exists public.delivery_events (
  id         uuid primary key default gen_random_uuid(),
  jti        text,
  email_hash text,
  kind       text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_delivery_created
  on public.delivery_events (created_at desc);

create table if not exists public.error_events (
  id         uuid primary key default gen_random_uuid(),
  level      text not null,
  message    text not null,
  context    text,
  created_at timestamptz not null default now()
);
create index if not exists idx_error_created
  on public.error_events (created_at desc);

alter table public.mail_outbox enable row level security;
alter table public.rate_limits enable row level security;
alter table public.consent_events enable row level security;
alter table public.delivery_events enable row level security;
alter table public.error_events enable row level security;

-- Atomic, cross-instance rate limiting. The advisory lock serialises callers
-- for the same bucket; the window key flips on a fixed time boundary.
create or replace function public.consume_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_ms bigint
)
returns table (allowed boolean, remaining integer, retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now_ms bigint := (extract(epoch from now()) * 1000)::bigint;
  v_start_ms bigint := (v_now_ms / p_window_ms) * p_window_ms;
  v_reset timestamptz := to_timestamp((v_start_ms + p_window_ms) / 1000.0);
  v_key_text text := v_start_ms::text;
  v_used integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext(p_bucket));
  select used into v_used
    from public.rate_limits
   where bucket = p_bucket and window_key = v_key_text;
  if not found then v_used := 0; end if;

  if v_used >= p_limit then
    return query select
      false,
      0,
      greatest(1, ceil(extract(epoch from (v_reset - now())))::integer);
    return;
  end if;

  insert into public.rate_limits (bucket, window_key, used, updated_at)
  values (p_bucket, v_key_text, v_used + 1, now())
  on conflict (bucket) do update set
    window_key = excluded.window_key,
    used = excluded.used,
    updated_at = now();

  return query select
    true,
    greatest(0, p_limit - v_used - 1),
    greatest(1, ceil(extract(epoch from (v_reset - now())))::integer);
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, bigint) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, bigint) to service_role;
