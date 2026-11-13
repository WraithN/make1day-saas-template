---
name: deploy
description: Configure environment variables, runtimes and deployment for Vercel / Cloudflare / self-host builds of a make1day project.
globs: .env.example, next.config.mjs, wrangler.toml, middleware.ts, app/**/route.ts
---

# Skill: Deploy & Env (make1day)

## Env contract
- All env reads go through `lib/env.ts`. Clients are constructed **lazily**, so `next build` succeeds with zero secrets.
- `NEXT_PUBLIC_*` is bundled into the browser. Anything else is server-only.
- `NEXT_PUBLIC_SITE_URL` is injected at build time and drives checkout `successUrl`, canonical, sitemap and `llms.txt`. Change it **before** building.
- `/admin` and `/api/stats` are open unless `ADMIN_USER` / `ADMIN_PASSWORD` are set. Set them before deploying.

## Targets
| Target | Notes |
| --- | --- |
| Vercel | Default. Push to GitHub, import, mirror `.env.local`, register `https://<domain>/api/webhook`. |
| Self-host | `npm run build && npm run start`; Node process, `.data/shipkit.db` SQLite persists. |
| Cloudflare | Workers + `@opennextjs/cloudflare` + `wrangler.toml` with `nodejs_compat` (main `.open-next/worker.js`, assets `.open-next/assets`). `npm run preview` / `npm run deploy`; copy `open-next.config.ts.example` to `open-next.config.ts` first. **Known gap:** `node:sqlite` local storage needs a writable disk, which Workers does not provide — configure Supabase before deploying. The in-memory RAG index is also lost on cold starts. |

## Runtime rules
- Route handlers that sign/verify payments or write local files declare `runtime = "nodejs"`. Do not switch them to `edge`.
- The single webhook URL is `/api/webhook` for **every** gateway; register it in both test and prod environments.
- Webhook verification uses the raw body. Any proxy that parses/re-serialises JSON will break RSA verification.

## Local build hygiene
- **Never run `next dev` and `next build` against the same `.next` directory.** The dev server overwrites `app-paths-manifest.json` and `next start` will 404 every route.
- Clean sequence: stop dev → delete `.next` → `next build` → `next start`.
- `.data/shipkit.db` and the RAG in-memory index are process-local; on serverless they vanish on cold start. Use Supabase for both.

## Verify
`npx tsc --noEmit` → clean `next build` → `next start` smoke-test `/`, `/pricing`, `/llms.txt` → `/api/payments/self-check` returns `ready: true`.

## Deploy gate (mandatory before first production release)
`npm run compliance:check --url="https://<staging-or-production>"` must exit
`0` — the compliance skill's audit workflow (detect → fetch live platform
policies → local checks → data-protection checklist → fix) is the release
review; wire the command into CI after build and block publishing on its
exit code. Re-run after ANY payments change, even post-launch.
