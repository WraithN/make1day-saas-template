# ShipKit

> Ship your AI SaaS MVP in days, not months.
> An AI SaaS MVP starter by **Uncorne** — auth, subscriptions, one real AI feature, a signed-in user console and an operator admin console. Clone it, reskin it, launch.

This is the production-grade starter that powers the ShipKit demo. It is the
template, not a client's product. Everything below is real and runnable once you
drop in your own keys.

---

## What's inside (P0)

| Module | Status |
| --- | --- |
| Auth (email magic-link + configurable OAuth: Google/GitHub/Apple/Microsoft/…) | ✅ |
| Subscriptions — **pluggable payment providers** (Stripe / Creem / PayPal / Waffo) | ✅ |
| One real AI feature — **multi-provider** (OpenAI, OpenRouter, DeepSeek, Groq, Anthropic, Gemini), plan-gated | ✅ |
| Database (Supabase Postgres + RLS) — provider-agnostic `subscriptions` table | ✅ |
| Dashboard (plan status + provider + live AI demo) | ✅ |
| **User console `/account`** — overview, billing, my licenses, settings; five languages, session-gated | ✅ |
| **Admin console `/admin`** — users, issued licenses, traffic, runtime status; Basic Auth + optional `ADMIN_EMAILS` | ✅ |
| **Selectable, prunable consoles in generated ZIPs** — `account` / `admin` Builder features with dead-link rewrites | ✅ |
| 1-click deploy (Vercel-ready) | ✅ |
| **License gate** — offline HMAC keys, email auto-claim, per-IP trial quota, `/admin/licenses` | ✅ |
| **Content paywall** — edge-gated premium routes (`middleware.ts` → `lib/paywall.ts`) + reusable `<Paywall>` component, `PREMIUM_ROUTES` config, `premium` Builder feature | ✅ |
| **Waffo Pancake** — real MoR checkout + RSA webhook verification, config self-check | ✅ |
| **Hybrid RAG** — chunking, BM25 (EN + CJK) + embeddings fused with RRF, cited answers, `/rag` demo UI, optional pgvector | ✅ |
| **Agent discovery / GEO** — `llms.txt`, `llms-full.txt`, OpenAPI 3.1 `openapi.json`, AI-bot robots allowlist, machine-readable sitemap entries | ✅ |
| **Generated-template build matrix** — 16 GitHub Actions cases, each downloading a real ZIP and type-checking the extracted project | ✅ |
| **Agent-Native Delivery** — root `AGENTS.md`, style-locked `design.md`, scoped rules, 12 skills, `.cursor/rules/*.mdc`, `CLAUDE.md`, deterministic `npm run ai:docs` | ✅ |
| **MCP `scaffold_project`** — stateless JSON-RPC 2.0 endpoint + stdio bridge for Cursor / Claude Code, license-gated ZIP option | ✅ |
| **`/agent-ready` landing page** — five-language guide to the machine-readable stack | ✅ |
| Observability — structured JSON logger (`lib/logger.ts`), route + global error boundaries, `/api/health` | ✅ |
| Multi-tenancy — real org/workspace scaffolding: `organizations` + `memberships` tables, workspace switcher, per-tenant data scoping (`lib/org.ts`) | ✅ |
| Customer billing portal — self-serve subscription management (Stripe + Creem real; PayPal/Waffo fall back to contact-support) | ✅ |
| Profile mutation — `/api/profile` PATCH (display name / full name / company) + `ProfileForm` | ✅ |
| Org/RBAC tables — `profiles.role` RBAC + `organizations`/`memberships` tenancy | ✅ |
| True token streaming / per-user rate limits | ⚠️ not implemented |

### RAG module (strategy B — hybrid retrieval)
`POST /api/rag/ingest` (`{ title, text }`) splits, embeds and indexes a document;
`POST /api/rag/query` (`{ question, provider? }`) returns
`{ answer, citations, mode, retrieval }`. Open `/rag` for the demo UI.

- **Two retrieval branches**: Okapi BM25 over Latin words + CJK unigrams/bigrams
  (`lib/rag/retrieve.ts`) and dense embeddings from any OpenAI-compatible
  `/embeddings` endpoint (`lib/rag/embed.ts`).
- **RRF fusion** (`lib/rag/hybrid.ts`, k=60) combines their rank lists; a
  passage found by both outranks one found by either. `retrieval` in the
  response reports which branches actually ran.
- **Zero configuration still works**: no embedding key → BM25-only; no chat key
  → extractive answer with the retrieved passages verbatim.
- `EMBEDDING_API_KEY` / `EMBEDDING_BASE_URL` / `EMBEDDING_MODEL` /
  `EMBEDDING_DIMENSIONS` configure the vector branch; they fall back to
  `OPENAI_*` so one key covers chat + retrieval.
- `RAG_VECTOR_STORE=supabase` persists vectors and runs SQL-side RRF through
  `supabase/migrations/0002_rag.sql` (pgvector + tsvector + HNSW, 1536 dims).
  The default in-memory store is process-local — use Supabase on serverless.

#### RAG benchmark (`npm run rag:bench`)

The module ships a golden question set and a runner that measures retrieval
quality against a live server — proving the retriever actually surfaces the
right passage, and catching regressions in CI.

```bash
LICENSE_GATE=off npx next start -p 3000   # terminal 1
npm run rag:bench                         # terminal 2 (or: node scripts/rag-bench.mjs)
```

It posts each golden question to `/api/rag/query`, then checks whether the
expected source document appears in the top-4 citations. Metric: **recall@4**
(fraction of questions whose expected source is in the top-K) and **MRR**.
Zero configuration is enough — BM25-only retrieval works with no embedding key.

Latest measured run (8 golden queries, top-4): **recall@4 = 100%, MRR = 0.917**.
Known gap: cross-lingual retrieval (an English query against a Chinese-only
passage) is weak because BM25 tokenizes per language; the seeded docs are
deliberately mixed EN/ZH to show the CJK branch, and golden questions are
matched to the language of their source.

### User console + admin console

Two separate back offices ship with the site **and with every default generated
project** — they are the same source tree, not a second copy:

| Route | Audience | Pages | Guard |
| --- | --- | --- | --- |
| `/account` | signed-in users | overview, billing, my licenses, settings | Supabase session (`middleware.ts`) |
| `/admin` | operators | overview, users, licenses, traffic, system | HTTP Basic Auth + optional `ADMIN_EMAILS` |

Both are five-language Server Components sharing `components/console/*`,
`lib/console.ts` (data) and `lib/content/console.ts` (copy). They are `noindex`,
disallowed in `robots.txt` and absent from the sitemap. In the Builder the
`account` and `admin` features prune their route trees independently; Nav,
post-login redirects and the account→admin shortcut are rewritten so no dead
link survives. See **`docs/consoles.md`** for the full architecture, guards and
go-live checklist.

### Known gaps (be honest before launch)
These are **not** implemented; see the code paths named here before promising
them to a customer:
- Waffo `acquiring` flavor verifies webhooks but its create-order payload is
  contract-specific and must be implemented before checkout can be used (see
  `docs/waffo.md`). The default `pancake` flavor is complete.
- AI chat is not token-streamed and has no per-user quota; the "5 messages/day" copy is aspirational.
- `/admin` and `/api/stats` are **closed by default** in production: if `ADMIN_USER` / `ADMIN_PASSWORD` are not set they return `503` (open only in dev, with a loud warning). Stats are durable in the `pageviews` table when a service role is configured, falling back to a local JSON file in dev.
- Both consoles now support **profile mutation** (`/api/profile` PATCH), an **org/RBAC model** (`profiles.role` + `organizations`/`memberships` tables, `lib/org.ts`), and a **customer billing portal** (`/api/billing/portal`, real for Stripe/Creem; PayPal/Waffo fall back to a contact-support path). The operator user directory derives from Supabase when `SUPABASE_SERVICE_ROLE_KEY` is set, otherwise from the license/subscription lists.
- The Builder's `multitenancy` flag is now real: selecting it ships the workspace UI (`/account/workspaces`, switcher) + `lib/org.ts` + org migrations and removes them when off (asserted in the build matrix).
- PayPal creates subscription checkouts only; Creem's portal endpoint/field names are best-effort assumptions (wrapped in try/catch so a miss degrades gracefully).
- Cloudflare deploy output still contains Node-runtime routes and `node:crypto` / `fs` imports.
- Generated projects keep ShipKit's marketing pages and branding — run `npm run rebrand -- "Your Brand"` to replace every `ShipKit`/`Uncorne` string (and the `LICENSE` copyright line) before shipping.
- Every generated project ships an MIT `LICENSE` file; edit its copyright line to your name after rebranding.
- The build matrix runs `tsc --noEmit` on all 16 cases; a representative subset also runs a real `next build` (pass rate + artifact sizes are published to `public/build-matrix.json` and shown on `/build-matrix`). Run `node scripts/verify-matrix.mjs --all --build --publish` to refresh it.
- `/api/mcp` is stateless JSON-RPC only — no sampling, prompts, subscriptions or SSE streaming. `scaffold_project` returns configuration JSON by default; `includeZip=true` is license-gated.
- `AGENTS.md` / scoped rules are written conventions, not lint-enforced; auto-loading of `.cursor/rules` and `CLAUDE.md` depends on the client tool.

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS ·
[@supabase/ssr](https://supabase.com/docs/guides/auth/server-side/nextjs) ·
pluggable payments (Stripe / Creem / PayPal / Waffo) · multi-provider AI layer
(OpenAI-compatible + Anthropic + Gemini).

---

## Quick start

```bash
# 1. clone
git clone https://github.com/uncorne/shipkit.git
cd shipkit

# 2. install
npm install

# 3. configure environment
cp .env.example .env.local
#   → fill in Supabase + your chosen payment provider + AI keys (see below)
#   → Waffo Pancake go-live: cp .env.waffo-pancake.example .env.local
#     then run: node scripts/waffo-preflight.mjs --strict

# 4. set up the database (run supabase/migrations/0001_init.sql
#    in the Supabase SQL editor, or `supabase db push`)

# 5. run
npm run dev
```

Visit http://localhost:3000. **The project builds with zero env vars set** —
all clients (Stripe, Creem, PayPal, Anthropic, Gemini, OpenAI) are created
lazily on first use, so a missing key fails gracefully at request time, not at
build time.

---

## Configuration

### Supabase

1. Create a project at https://supabase.com.
2. Copy **Project URL** and **anon public key** into `NEXT_PUBLIC_SUPABASE_URL`
   and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Copy the **service role key** into `SUPABASE_SERVICE_ROLE_KEY` (server-only).
4. Run `supabase/migrations/0001_init.sql` in **SQL Editor** — it creates
   `profiles`, `subscriptions`, RLS policies, and the signup trigger.
   The `subscriptions` table is **provider-agnostic**: it stores a `provider`
   column plus `provider_customer_id` / `provider_subscription_id`, so you can
   switch gateways without a schema change.

### OAuth

`NEXT_PUBLIC_OAUTH_PROVIDERS` is a comma-separated list of the buttons shown on
`/login` (e.g. `google,github,apple,microsoft`). You must also enable those
providers in the Supabase dashboard (Authentication → Providers) for them to
work.

### Payment provider

**Waffo is the default gateway** (`PAYMENT_PROVIDER=waffo`), both for this
site's own checkout and for the Builder's default generated project. Pick one
gateway with `PAYMENT_PROVIDER` (`waffo` | `stripe` | `creem` | `paypal`).

> ⚠️ **"Waffo" is two incompatible products.** `WAFFO_FLAVOR=pancake`
> (default) targets `docs.waffo.ai` — Merchant of Record for digital products.
> `WAFFO_FLAVOR=acquiring` targets the `waffo.com` SE-Asia acquiring gateway.
> Their endpoints, auth and webhook signatures do not match. Full protocol
> notes: [`docs/waffo.md`](docs/waffo.md).

**Waffo Pancake (default)**
1. Create a **one-time** product for Buyout ($99) and a **monthly** product for
   Care ($9/mo). In Pancake the **product id IS the price id** → set
   `WAFFO_PRICE_ID_BUYOUT` / `WAFFO_PRICE_ID_CARE` (legacy `_PRO`/`_SCALE` are
   fallbacks).
2. Set `WAFFO_STORE_SLUG` + `WAFFO_ENVIRONMENT=test|prod` for public auth, **or**
   `WAFFO_MERCHANT_ID` + `WAFFO_PRIVATE_KEY` for RSA-signed server calls — never
   both. Defaults: `https://api.waffo.ai` +
   `/v1/actions/checkout/create-session`.
3. Register the single webhook `POST https://<domain>/api/webhook` and copy the
   **Webhook Public Key** for test AND prod into
   `WAFFO_WEBHOOK_PUBLIC_KEY_TEST` / `_PROD`. Verification is
   `RSA-SHA256("${t}.${rawBody}")`, 45-minute tolerance. There is no HMAC
   secret (`WAFFO_WEBHOOK_SECRET` is ignored).
4. Checkout sends `productType: "onetime" | "subscription"` plus `metadata`
   (returned as `data.orderMetadata`). Events are deduplicated on
   `(eventType, eventId)`; `subscription.payment_succeeded` is intentionally
   ignored so the first payment does not grant access twice.
5. `GET /api/payments/self-check` lists every missing setting without secrets.
6. **Go-live runbook**: copy `.env.waffo-pancake.example` → `.env.local`, replace every `REPLACE_ME_*`, then run `node scripts/waffo-preflight.mjs --strict` (static, no network, never prints secrets). [`docs/waffo-launch-checklist.md`](docs/waffo-launch-checklist.md) has the dashboard field mapping, test-card drill, test→prod switch and troubleshooting table.

**License gate** — a paid webhook issues an offline `SK1.…` key (`LICENSE_SECRET`).
`POST /api/generate` accepts that key (or the `sk_license` cookie), an active
subscription / email auto-claim, or one free trial per IP per day; otherwise 402.
Run `supabase/migrations/0003_licenses.sql` for durable records, view keys at
`/admin/licenses`, and issue one manually with `scripts/issue-license.mjs`.
Generated customer projects have the gate OFF by default.

**Stripe** — set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and
`STRIPE_PRICE_ID_BUYOUT` / `STRIPE_PRICE_ID_CARE`. Buyout uses
`mode: "payment"` (no trial); Care uses `mode: "subscription"` with a 14-day
trial. Webhook: `https://<domain>/api/webhook`.

**Creem** — set `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, `CREEM_ENV`, and
`CREEM_PRICE_ID_PRO/_SCALE` (PRO → Buyout, SCALE → Care). Webhook: `/api/webhook`.

**PayPal** — set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`,
`PAYPAL_ENV`, and `PAYPAL_PLAN_ID_PRO/_SCALE`. ⚠️ This adapter creates
subscription checkouts only: use Waffo or Stripe for one-time Buyout billing.

> Note: `/api/webhook` is the **single** webhook URL for every provider (the
> route reads `PAYMENT_PROVIDER` to pick the verifier). Verification failures
> return 400 and persistence failures return 500 so the gateway retries.
> See `docs/payments*.md` for the five-language setup guides,
> `docs/waffo-launch-checklist.md` for the Pancake go-live runbook, and
> `docs/competitive-analysis.md` for the 2026 competitor / differentiation review.

### Custom 1:1 enquiries

Set `NEXT_PUBLIC_BOOKING_URL` (Cal.com / Calendly / any scheduling link) and
`NEXT_PUBLIC_CONTACT_EMAIL`. The pricing page renders a "Book a 1:1 call" CTA;
without a booking URL it falls back to a prefilled email. Custom work is
scoped and quoted manually — there is deliberately no self-checkout for it.

### AI providers

`AI_PROVIDER` selects the default (`openai` | `openrouter` | `deepseek` | `groq`
| `anthropic` | `gemini`). The dashboard demo has a provider dropdown so you can
switch live. OpenAI / OpenRouter / DeepSeek / Groq share the OpenAI-compatible
client (only `baseURL` + key differ); Anthropic and Gemini use their own SDKs.
Fill in only the keys for the providers you use.

---

## Deploy (1-click)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/uncorne/shipkit)

After deploying, set the same environment variables in the Vercel project
settings (including `PAYMENT_PROVIDER` and your chosen gateway's keys), and add
the production `/api/webhook` URL to that gateway's webhook endpoints.

---

## Agent-Native Delivery (what every ZIP contains)

Every ZIP produced by `/builder` ships a complete AI coding contract generated
from that exact `BuilderConfig`:

| File | Purpose |
| --- | --- |
| `AGENTS.md` | Root contract: selections, commands, repo map, scoped-rule index, 8 non-negotiable rules, style lock, definition of done |
| `design.md` | Style-locked visual spec for one of 10 palettes: token/HEX table, typography, `--radius`, texture, component vocabulary, responsive/a11y, do/don't |
| `ai/rules/*.md` | Scoped rules with `globs` frontmatter — core / style / api / auth / payments / database / rag / i18n / deploy + one per selected skill |
| `.cursor/rules/*.mdc` | The same rules in Cursor's native format |
| `CLAUDE.md` | Claude Code entry point importing `AGENTS.md`, `design.md`, all rules and skills |
| `skills/*.md` | 12 playbooks (frontend, UI, backend, testing, SEO, auth, payments, database, RAG, i18n, deploy, agent workflow), pruned by selection |
| `shipkit.config.json` | **Source of truth** for selections — edit this, then run `ai:docs` |
| `ai/doc-spec.json` | Full option catalogue + all 10 palettes used to re-derive labels and style |

One renderer (`scripts/lib/ai-docs.mjs`) is used both by `lib/generator/pack.ts`
and by the downloaded project's `npm run ai:docs`, so regeneration is
byte-identical. `npm run ai:setup` refreshes only `.cursor/rules` + `CLAUDE.md`
(`--tool all|cursor|claude`). The old lowercase `agents.md` is gone — it
collides with `AGENTS.md` on case-insensitive filesystems.

`shipkit.config.json` is the source of truth: `ai:docs` re-reads it every run
and re-derives labels/style from the catalogue. Changing `style` regenerates the
documents but **not** `app/globals.css` — a real palette switch needs a fresh
ZIP from the Builder. See `docs/agent-native.md` for the architecture.

## Agent-native delivery & verification

The starter is meant to be evaluated **by AI agents**, not only by humans:

| Surface | Purpose |
|---|---|
| `GET /llms.txt` | Short product/pricing/differentiation overview for answer engines |
| `GET /llms-full.txt` | Long-form facts: full `BuilderConfig` enum, pruning rules, hybrid-RAG parameters, Pancake protocol, license-gate order, API summary and honest limitations |
| `GET /openapi.json` | OpenAPI 3.1 contract for all public routes, including the `402` paywall on `POST /api/generate` and the MCP endpoint |
| `POST /api/mcp` | MCP JSON-RPC 2.0: `get_product_info`, `get_builder_config`, `scaffold_project`, `get_agent_delivery`. `includeZip=true` is license-gated. Stdio bridge: `scripts/mcp-server.mjs` |
| `GET /agent-ready` | Five-language landing page explaining the discovery stack and the generated contract |
| `robots.ts` / `sitemap.ts` | Explicit AI-crawler allowlist, crawlable `/builder` and `/agent-ready`, machine-readable endpoints in the sitemap |
| `docs/agent-discovery.md`, `docs/mcp.md`, `docs/agent-native.md`, `docs/consoles.md` | Design notes, MCP reference, Agent-Native Delivery spec, and the user/admin console architecture |

**Generated-template build matrix** (`docs/build-matrix.md`):

```bash
LICENSE_GATE=off npx next dev -p 3000     # terminal 1
npm run verify:matrix                     # terminal 2, or: node scripts/verify-matrix.mjs --all
```

`.github/workflows/generated-matrix.yml` runs 14 parallel cases covering all 5
payment gateways, all 10 styles, all 3 deploy targets and the RAG/dashboard/skills
switches. Each case downloads a real ZIP, asserts that site-only endpoints and
unselected modules were pruned, then runs `tsc --noEmit` inside the extracted
project. Currently `tsc`, not `next build` — see Known gaps.

The four site-only endpoints are excluded via `SITE_ONLY_FILES` in
`lib/generator/prune.ts`, and site-only npm scripts are stripped from the
generated `package.json` by `lib/generator/pack.ts`.

## Project structure

```
shipkit/
├─ app/
│  ├─ api/
│  │  ├─ ai/route.ts                 # multi-provider AI chat (plan-gated)
│  │  ├─ checkout/route.ts           # create checkout (provider-agnostic)
│  │  └─ webhook/route.ts            # verify + sync provider → Supabase
│  ├─ auth/callback/route.ts         # OAuth / magic-link callback
│  ├─ dashboard/                     # signed-in demo area
│  ├─ account/                       # USER CONSOLE: overview, billing, licenses, settings
│  ├─ admin/                         # ADMIN CONSOLE: overview, users, licenses, stats, system
│  ├─ login/                         # magic-link + configurable OAuth
│  ├─ pricing/                       # plans + checkout
│  ├─ layout.tsx  page.tsx  globals.css
├─ components/
│  ├─ console/                       # shared shell, tables, sign-out button
│  └─ ...                            # Nav, Footer, DemoConsole, PricingCards, ChatDemo, SignOut
├─ lib/
│  ├─ console.ts                     # server-side snapshots + admin authorization
│  ├─ content/console.ts             # five-language copy for both consoles
│  ├─ env.ts                         # typed env access
│  ├─ supabase/{server,client,admin}.ts
│  ├─ payments/                      # PaymentProvider interface + stripe/creem/paypal/waffo
│  ├─ ai/                            # multi-provider chat + provider presets
│  └─ subscriptions.ts               # plan/status helpers
├─ middleware.ts                     # gate /account + /dashboard, guard /admin
└─ supabase/migrations/0001_init.sql
```

## License

MIT — do whatever you want with it.
