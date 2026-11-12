-- Model billing: admin-editable routing, price sheet and a usage ledger
-- consumed by lib/billing.ts and the /admin/models console.
-- RLS mirrors the licenses/orders pattern: no public policies at all, so the
-- table is reachable only through the service-role key (the server).

create table if not exists model_routing (
  lane                      text primary key check (lane in ('chat','embed','video','image','voice')),
  provider                  text not null default '',
  model                     text not null default '',
  fallback_provider         text not null default '',
  fallback_model            text not null default '',
  budget_usd_per_user_month numeric not null default 0,
  updated_at                timestamptz not null default now()
);

create table if not exists model_prices (
  lane              text primary key check (lane in ('chat','embed','video','image','voice')),
  mode              text not null default 'tokens' check (mode in ('tokens','unit')),
  input_usd_per_1k  numeric not null default 0,
  output_usd_per_1k numeric not null default 0,
  unit_usd          numeric not null default 0,
  unit              text not null default '',
  updated_at        timestamptz not null default now()
);

create table if not exists usage_events (
  id           bigint generated always as identity primary key,
  day          date not null,
  user_id      text,
  lane         text not null,
  provider     text not null,
  model        text not null,
  input_units  numeric not null default 0,
  output_units numeric not null default 0,
  cost_usd     numeric not null default 0,
  source       text not null default 'usage',
  created_at   timestamptz not null default now()
);

create index if not exists idx_usage_events_day on usage_events(day);
create index if not exists idx_usage_events_user on usage_events(user_id, day);

alter table model_routing enable row level security;
alter table model_prices  enable row level security;
alter table usage_events  enable row level security;
