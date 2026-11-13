-- Inngest workflow runs (skill: workflow / canvas). Service-role only:
-- rows are written by the pipeline functions and read by the admin canvas.
create table if not exists workflow_runs (
  id         text primary key,
  pipeline   text not null,
  status     text not null default 'queued',
  steps      jsonb not null default '[]',
  input      jsonb not null default '{}',
  output_url text,
  error      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_workflow_runs_created on workflow_runs(created_at desc);
alter table workflow_runs enable row level security;
