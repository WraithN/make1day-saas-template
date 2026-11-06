-- ShipKit — traffic funnel events
-- Run AFTER 0006_observability.sql.
--
-- The `pageviews` table from 0006 only counts hits per path. It cannot answer
-- "how many visitors bounced?", "what share clicked the CTA?" or "how many
-- became paying customers?" — those need discrete, session-attributed
-- events.
--
-- This table stores one row per event:
--   kind = 'view'       a page view
--   kind = 'cta'        a click on an element marked data-cta
--   kind = 'checkout'   the visitor started a checkout
--   kind = 'conversion' the visitor downloaded a template or paid
--
-- Privacy: visitor_id / session_id are random opaque tokens (no IP, no user
-- agent, no personal data). referrer holds only the host name.

create table if not exists public.traffic_events (
  id         uuid primary key default gen_random_uuid(),
  visitor_id text        not null,
  session_id text        not null,
  kind       text        not null,
  path       text,
  label      text,
  referrer   text,
  email      text,
  created_at timestamptz not null default now(),
  constraint traffic_events_kind_check
    check (kind in ('view', 'cta', 'checkout', 'conversion'))
);

create index if not exists idx_traffic_events_created
  on public.traffic_events (created_at desc);
create index if not exists idx_traffic_events_session
  on public.traffic_events (session_id);
create index if not exists idx_traffic_events_visitor
  on public.traffic_events (visitor_id);
create index if not exists idx_traffic_events_kind
  on public.traffic_events (kind);
create index if not exists idx_traffic_events_email
  on public.traffic_events (email);

-- Service role writes; the anon key never touches this table (no RLS needed
-- because there is no client path — only the server route writes/reads).
