-- make1day — multi-tenancy scaffolding: organizations + memberships
-- Run AFTER 0006_observability.sql.
--
-- Adds a lightweight org/workspace model that scopes data per tenant:
--   * organizations  — a workspace owned by a user
--   * memberships     — user <-> org link with a per-org role
--   * profiles.org_id — the user's current/active org (denormalised for quick
--     lookups; the authoritative membership list lives in `memberships`).
--
-- RBAC on the global `profiles.role` (admin/staff/member) already exists in
-- 0004; this layer adds *tenancy* on top, not a replacement for it.

-- ── Tables ────────────────────────────────────────────────
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  owner_id    uuid not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.memberships (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  user_id     uuid not null,
  role        text not null default 'member'
                check (role in ('owner', 'admin', 'member')),
  created_at  timestamptz not null default now(),
  unique (org_id, user_id)
);

alter table public.profiles
  add column if not exists org_id uuid references public.organizations(id) on delete set null;

create index if not exists memberships_user_idx on public.memberships(user_id);
create index if not exists memberships_org_idx on public.memberships(org_id);

-- ── RLS ───────────────────────────────────────────────────
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;

-- A user may read an org if they are a member of it.
drop policy if exists "orgs readable by members" on public.organizations;
create policy "orgs readable by members"
  on public.organizations for select
  using (
    exists (
      select 1 from public.memberships m
      where m.org_id = organizations.id and m.user_id = auth.uid()
    )
  );

-- Any signed-in user can create an org (they become owner via the app).
drop policy if exists "orgs creatable by authed" on public.organizations;
create policy "orgs creatable by authed"
  on public.organizations for insert
  with check (auth.uid() is not null and owner_id = auth.uid());

-- Org owners/admins may update their org; members may not.
drop policy if exists "orgs updatable by owners" on public.organizations;
create policy "orgs updatable by owners"
  on public.organizations for update
  using (
    exists (
      select 1 from public.memberships m
      where m.org_id = organizations.id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

-- Members can read memberships of orgs they belong to.
drop policy if exists "memberships readable by org members" on public.memberships;
create policy "memberships readable by org members"
  on public.memberships for select
  using (
    exists (
      select 1 from public.memberships m
      where m.org_id = memberships.org_id and m.user_id = auth.uid()
    )
  );

-- A user can be added as a member (invite accepted) or leave an org.
drop policy if exists "memberships insert self/owner" on public.memberships;
create policy "memberships insert self/owner"
  on public.memberships for insert
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.memberships m
      where m.org_id = memberships.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );
