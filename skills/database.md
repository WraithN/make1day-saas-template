---
name: database
description: Write Supabase migrations, RLS policies and server-side queries for a ShipKit project.
globs: supabase/**, lib/supabase/admin.ts, .data/**
---

# Skill: Database & RLS (ShipKit)

## Layout
- `supabase/migrations/0001_init.sql` — profiles, subscriptions, base policies.
- `supabase/migrations/0002_rag.sql` — pgvector + `tsvector` generated column + GIN/HNSW indexes + SQL-side RRF function. Only present when the RAG feature was selected.
- `supabase/migrations/0003_licenses.sql` — `licenses` + `webhook_events`. RLS enabled with **no public policies**; only the service role reads/writes.

## Rules
- Migrations are **append-only**. Never edit an applied migration; add `0004_…`.
- Every new table gets `ENABLE ROW LEVEL SECURITY`. A table without RLS exposed through the anon key is a data leak.
- Server-side writes use `SUPABASE_SERVICE_ROLE_KEY` via `lib/supabase/admin.ts`. This key bypasses RLS — never ship it to the browser.
- Prefer `upsert` with a stable conflict key for webhook-driven writes; they are retried.
- `.data/*.json` is a local-dev fallback only. It is **not durable on serverless** (Vercel/Cloudflare). Production must use Supabase.
- Vector columns are `vector(1536)`. Changing `EMBEDDING_DIMENSIONS` requires a new migration and a re-index.

## Query patterns
- Use typed selects and check `error` explicitly; do not silently swallow it (the webhook route historically lost orders this way).
- For hybrid retrieval, call the SQL RRF function from `0002_rag.sql`; CJK tokenization is handled in TypeScript BM25, not by Postgres `to_tsvector`.

## Do / Don't
- DO add indexes for columns used in `WHERE` / `ORDER BY`.
- DO keep `eventType + eventId` unique for idempotency.
- DON'T create client-readable policies on `licenses` or `webhook_events`.
- DON'T store secrets in a table reachable with the anon key.

## Verify
Run migrations in Supabase SQL Editor → confirm RLS is on for every table → confirm anon cannot `select` from `licenses`.
