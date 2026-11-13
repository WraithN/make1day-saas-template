# Skill: Inngest Workflows

Durable, n8n-style pipelines as plain TypeScript inside this repo. Not a
separate service to babysit: Inngest's step engine calls BACK into this app
via `/api/inngest`, memoizing every `step.run` result.

## Layout
- `inngest/client.ts` — one client (app id from `INNGEST_APP_ID`)
- `inngest/functions.ts` — the `ad-video-pipeline`: script → storyboard →
  quote → render (fal) → assemble handoff
- `app/api/inngest/route.ts` — serve endpoint (GET/POST/PUT)
- `app/api/pipeline/run/route.ts` — admin-guarded trigger; records the run
  in `workflow_runs` then sends `pipeline/ad-video/start`
- `lib/workflows.ts` — run/step persistence (Supabase `0016_workflows.sql`
  when configured, local SQLite mirror otherwise)

## Rules
1. Every side-effectful unit is a `step.run` with a stable name; never
   combine quote + spend in one step (the quote must be durable BEFORE the
   spend; that is what makes re-runs free for unchanged work).
2. Model choice, unit prices and the cost ledger come from
   `lib/billing.ts` / the `/admin/models` console — pipelines never hard-code
   models or prices.
3. Assembly (ffmpeg/Remotion) does NOT run inside a function. The pipeline
   ends in an assemble HANDOFF; your worker consumes the clip list.
4. A failed run is re-POSTed with the same `runId` inputs: completed steps
   are skipped, only changed scene prompts re-render.
5. Local dev: `npm run inngest:dev` (Dev Server :8288) + `npm run dev` +
   `INNGEST_EVENT_KEY=http://localhost:8288` (see .env.example). Production:
   set the real event/signing keys and deploy — no extra host.
6. AIGC guardrails unchanged: generation uses the operator's own keys;
   consented sources only; AI labeling stays visible (see video skill).
