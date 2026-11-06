-- ShipKit — AI chat usage quota (per user, per UTC day)
-- Run AFTER 0008_traffic_funnel.sql.
--
-- The AI endpoint only checked "is the caller logged in and subscribed".
-- A paying Care customer could therefore call the model in an endless loop
-- and burn through the whole LLM bill in one afternoon. This table tracks how
-- many AI calls each user has made on the current UTC day; the budget itself
-- is configured with AI_MESSAGES_PER_DAY (default 50).
--
-- Storage mirrors the rest of ShipKit: this table is the Supabase half of the
-- dual backend. Without SUPABASE_SERVICE_ROLE_KEY, lib/ai-usage.ts uses the
-- local SQLite database instead (lib/sqlite.ts → ai_usage).
--
-- Privacy: user_id is the Supabase auth user id (a uuid). Nothing else is
-- stored — no prompt text, no token counts, no IP.

create table if not exists public.ai_usage (
  user_id text primary key,
  day     text        not null,
  used    integer     not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_day
  on public.ai_usage (day);

alter table public.ai_usage enable row level security;
-- No policies: only the service-role key (the AI route / admin page) may read
-- or write. Never expose the service-role key to the browser.

-- Atomic quota consumption so two requests that arrive at the same time can
-- never both take the last remaining slot. Called by lib/ai-usage.ts.
--
-- The row is locked with FOR UPDATE before it is read, so the read / compare
-- / increment sequence is serialised. A row whose day differs from p_day
-- belongs to an earlier UTC day and starts over at zero.
--
-- Returns a jsonb object: { "used": <count>, "allowed": <bool> }.
create or replace function public.consume_ai_usage(
  p_user_id text,
  p_day     text,
  p_limit   integer
)
returns jsonb
language plpgsql
as $$
declare
  v_row     public.ai_usage%rowtype;
  v_used    integer;
  v_allowed boolean := false;
begin
  -- Make sure the row exists so it can be locked below.
  insert into public.ai_usage (user_id, day, used, updated_at)
  values (p_user_id, p_day, 0, now())
  on conflict (user_id) do nothing;

  select * into v_row
  from public.ai_usage
  where user_id = p_user_id
  for update;

  if v_row.day <> p_day then
    -- A new UTC day: the counter resets.
    v_used := 0;
  else
    v_used := greatest(v_row.used, 0);
  end if;

  if v_used < p_limit then
    v_used := v_used + 1;
    v_allowed := true;
  end if;

  update public.ai_usage
     set used = v_used, day = p_day, updated_at = now()
   where user_id = p_user_id;

  return jsonb_build_object('used', v_used, 'allowed', v_allowed);
end;
$$;
