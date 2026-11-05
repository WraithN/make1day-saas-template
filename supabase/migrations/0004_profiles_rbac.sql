-- ShipKit — profiles RBAC + editable fields
-- Run AFTER 0001_init.sql (and 0002_rag.sql / 0003_licenses.sql if used).
--
-- Adds:
--   * display_name / company   — user-editable profile fields
--   * role                     — real RBAC: 'admin' | 'staff' | 'member'
--   * updated_at               — touch helper
--   * RLS so only admins/staff can list every profile (privacy-safe: a plain
--     member can NOT read other members' emails), plus a self-update policy
--     that forbids a member from escalating their own role.
--   * is_staff_or_admin()      — SECURITY DEFINER helper used by the policy.

-- ── New columns ─────────────────────────────────────────────
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists company text;
alter table public.profiles add column if not exists role text not null default 'member'
  check (role in ('admin', 'staff', 'member'));
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- Keep full_name populated for backwards-compatible reads.
drop function if exists public.handle_new_user() cascade;
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, display_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'full_name',
    'member'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── RBAC helper ────────────────────────────────────────────
-- True when the calling auth user is an admin or staff member.
-- SECURITY DEFINER so the RLS policy can read profiles without recursing.
create or replace function public.is_staff_or_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'staff')
  );
$$;

-- ── RLS: admins/staff may read ALL profiles (for the user directory) ──
alter table public.profiles enable row level security;

drop policy if exists "profiles staff read all" on public.profiles;
create policy "profiles staff read all"
  on public.profiles for select
  using (public.is_staff_or_admin());

-- Self-update: a user may change their own row, but the WITH CHECK clause
-- pins `role` to its CURRENT committed value, so a member cannot escalate
-- themselves to admin via a direct API call. Role changes go through the
-- service-role admin endpoint only.
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
  );

-- ── updated_at maintenance ────────────────────────────────
create or replace function public.touch_profile_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_profile_updated_at();
