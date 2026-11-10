-- Video studio (face-swap) module: job ledger + monthly credit usage.
-- Consent is recorded per job (consent_at) as the deep-synthesis audit trail;
-- outputs carry provider URLs (customer storage/S3 integration is phase 2).

create table if not exists public.video_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id text not null,
  resolution text not null default '480p',
  aspect text not null default '9:16',
  status text not null default 'queued',
  provider_job_id text,
  status_url text,
  response_url text,
  input_image_url text not null,
  source_video_url text not null,
  output_url text,
  credits integer not null default 1,
  consent_at timestamptz not null default now(),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.video_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null,
  used integer not null default 0,
  primary key (user_id, month)
);

alter table public.video_jobs enable row level security;
alter table public.video_usage enable row level security;

create policy "video jobs are owner-only"
  on public.video_jobs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "video usage is owner-only"
  on public.video_usage for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists video_jobs_user_idx on public.video_jobs (user_id, created_at desc);
create index if not exists video_jobs_provider_idx on public.video_jobs (provider_job_id);
