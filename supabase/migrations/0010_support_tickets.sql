-- ShipKit — support tickets (Supabase mirror of lib/sqlite.ts SCHEMA).
-- Run AFTER 0004_profiles_rbac.sql: the operator SELECT policy reuses the
-- public.is_staff_or_admin() SECURITY DEFINER helper defined there.
--
-- RLS contract:
--   * a signed-in user may read ONLY their own tickets (by user_id, or by the
--     email claim for anonymous-submitted tickets that were later claimed);
--   * an admin / staff (operator) may read ALL tickets;
--   * there are deliberately NO insert / update / delete policies for the
--     anon or authenticated roles. ALL writes go through the service-role
--     client in lib/tickets.ts, which bypasses RLS. This keeps status changes
--     behind the operator guard in the API route instead of allowing a direct
--     client-side PATCH.

create table if not exists public.support_tickets (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  subject    text not null,
  message    text not null,
  status     text not null default 'open'
               check (status in ('open', 'answered', 'closed')),
  user_id    uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_tickets_created
  on public.support_tickets (created_at desc);
create index if not exists idx_support_tickets_user
  on public.support_tickets (user_id);
create index if not exists idx_support_tickets_email
  on public.support_tickets (email);

alter table public.support_tickets enable row level security;

-- A signed-in user sees their own rows. The email comparison also covers a
-- ticket submitted anonymously and later matched to this account's address.
drop policy if exists "support_tickets owner read" on public.support_tickets;
create policy "support_tickets owner read"
  on public.support_tickets for select
  to authenticated
  using (
    user_id = auth.uid()
    or email = (auth.jwt() ->> 'email')
  );

-- Operators (admin / staff profiles) may read every ticket.
drop policy if exists "support_tickets operator read all" on public.support_tickets;
create policy "support_tickets operator read all"
  on public.support_tickets for select
  to authenticated
  using (public.is_staff_or_admin());

-- Keep updated_at honest on any service-role update.
create or replace function public.touch_support_ticket_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists support_tickets_touch on public.support_tickets;
create trigger support_tickets_touch
  before update on public.support_tickets
  for each row execute function public.touch_support_ticket_updated_at();

comment on table public.support_tickets is
  'Support/contact submissions from /support. Written only through the service-role client (lib/tickets.ts); read via RLS by owner or operator.';
