-- Product-scoped identities: one Supabase project may host several products
-- (each deployment sets PRODUCT_ID, default 'default'). The same auth user
-- then holds one profile row per product; consoles, RBAC and the admin user
-- directory filter by product so tenants never see each other's roles.
-- No other table references profiles, so widening the primary key is safe.
-- The signup trigger keeps inserting a bootstrap row with the column
-- default; the application upserts its own product row on first sign-in.

alter table public.profiles
  add column if not exists product text not null default 'default';

alter table public.profiles drop constraint if exists profiles_pkey;
alter table public.profiles add primary key (id, product);

create index if not exists profiles_product_idx on public.profiles (product);

comment on column public.profiles.product is
  'Deployment product id (PRODUCT_ID env). Isolates users/roles per product sharing one Supabase project.';
