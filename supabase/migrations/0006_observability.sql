-- make1day — observability: durable pageview counters
-- Run AFTER 0005_orders.sql.
--
-- The marketing site records first-party, privacy-friendly pageview counts
-- (no personal data). In serverless / multi-instance deployments a local
-- JSON file is not durable (ephemeral FS, no shared state), so this table
-- backs the counter when a Supabase (service-role) connection is available.
-- lib/stats.ts falls back to .data/site-stats.json only when no service role
-- is configured (local dev).

create table if not exists public.pageviews (
  path        text primary key,
  count       bigint not null default 0,
  updated_at  timestamptz not null default now()
);

-- Service role writes; the anon key never touches this table (no RLS needed
-- because there is no client path — only the server route writes/reads).

-- Atomic per-path increment so concurrent serverless invocations never lose
-- counts (a plain upsert with count:1 would clobber). Called by lib/stats.ts.
create or replace function public.increment_pageview(p_path text)
returns void
language plpgsql
as $$
begin
  insert into public.pageviews (path, count, updated_at)
  values (p_path, 1, now())
  on conflict (path)
  do update set count = public.pageviews.count + 1, updated_at = now();
end;
$$;
