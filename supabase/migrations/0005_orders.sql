-- ShipKit — orders (provider-agnostic purchase records)
-- Run after 0003_licenses.sql. Every gateway (Stripe / Creem / PayPal / Waffo / Lemon Squeezy)
-- is normalised into this single table so the admin console and the generated
-- template never need gateway-specific code to list or reconcile orders.

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  provider          text not null,                 -- stripe | creem | paypal | waffo | lemonsqueezy
  provider_order_id text not null,                 -- gateway order / subscription / payment id
  customer_email    text,
  plan              text,                          -- buyout | care | pro | scale
  amount            numeric(12,2),                 -- major units, e.g. 49.00
  currency          text,
  status            text not null default 'active',-- active | canceled | past_due | refunded
  created_at        timestamptz not null default now()
);

-- One order row per (provider, provider order id) — idempotent upserts from
-- webhook retries.
create unique index if not exists orders_provider_order_idx
  on public.orders (provider, provider_order_id);
create index if not exists orders_email_idx on public.orders (customer_email);
create index if not exists orders_created_idx on public.orders (created_at desc);

alter table public.orders enable row level security;
-- No policies: only the service-role key (webhook route / admin page) may
-- read or write. Never expose the service-role key to the browser.
