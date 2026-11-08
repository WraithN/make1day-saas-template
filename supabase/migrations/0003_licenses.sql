-- marketit — license gate + webhook idempotency
-- Run after 0001_init.sql (and 0002_rag.sql if you use RAG).
-- These tables are server-only: the webhook route uses the service-role key.

create table if not exists public.licenses (
  jti         text primary key,
  key         text not null,
  email       text,
  plan        text not null check (plan in ('buyout', 'care')),
  order_id    text,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists licenses_email_idx on public.licenses (email);
create index if not exists licenses_order_idx on public.licenses (order_id);

alter table public.licenses enable row level security;
-- No policies: only the service role (server-side webhook / admin page) can
-- read or write. Never expose the service-role key to the browser.

create table if not exists public.webhook_events (
  event_type   text not null,
  event_id     text not null,
  processed_at timestamptz not null default now(),
  primary key (event_type, event_id)
);

alter table public.webhook_events enable row level security;
-- No policies: deduplication happens server-side only.
