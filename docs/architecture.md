# Architecture — the product site and the generated template

This repository is **two products in one source tree**:

1. the **product site** that markets and sells a configurable starter, and
2. the **generator** ("factory") that turns one source tree into a customer's
   Next.js project.

The customer ZIP is produced by *deleting and rewriting files from the very
same tree* — there is no separate template repository. That single decision
explains almost every strength and every sharp edge below.

## 1. Module map (current site)

```
┌─ Entry ────────────────────────────────────────────────────────────┐
│ middleware.ts (paywall)  ·  app/**/page.tsx  ·  app/api/**/route.ts │
│ app/layout.tsx (metadata, JSON-LD, consent, GA, tracker)            │
└────────────────────────────────────────────────────────────────────┘
┌─ Presentation ─────────────────────────────────────────────────────┐
│ components/*  ·  lib/i18n-core.ts (en/zh/ja/fr/de)  ·  globals.css   │
│ lib/content/* (console, faq, blog, compare, messaging, templates)  │
└────────────────────────────────────────────────────────────────────┘
┌─ Domain ───────────────────────────────────────────────────────────┐
│ lib/payments/* — PaymentProvider interface + 5 adapters + none stub  │
│ lib/ai/*, lib/rag/* — streaming, quota, retrieval                    │
│ lib/license.ts, orders.ts, subscriptions.ts, tickets.ts             │
│ lib/ai-usage.ts, traffic.ts, stats.ts, rbac.ts, console.ts, org.ts   │
└────────────────────────────────────────────────────────────────────┘
┌─ Infrastructure ───────────────────────────────────────────────────┐
│ lib/env.ts (single config source)                                    │
│ lib/sqlite.ts + lib/supabase/{server,client,admin}.ts (dual backend) │
│ supabase/migrations/0001…0010  ·  lib/logger.ts                      │
└────────────────────────────────────────────────────────────────────┘
┌─ Site-only operations (never shipped in a customer ZIP) ────────────┐
│ lib/mail/*, /support, /api/support/*, /admin/tickets                 │
│ password reset + email verification, /admin console                  │
│ machine-readable docs: llms.txt, llms-full.txt, openapi.json, /mcp   │
│ marketing: /blog, /compare, /faq, /license, /templates, /styles    │
└────────────────────────────────────────────────────────────────────┘
┌─ Factory (never shipped in a customer ZIP) ─────────────────────────┐
│ /builder + components/Builder.tsx + /api/generate[/preview]         │
│ lib/generator/{config,schema,spec,prune,pack,templates,themes,       │
│                preview,customer-site}.ts                             │
└────────────────────────────────────────────────────────────────────┘
┌─ Tooling ───────────────────────────────────────────────────────────┐
│ scripts/verify-matrix.mjs (18 cases) · smoke-*.cjs (48 checks)       │
│ scripts/lib/ai-docs.mjs · rebrand.mjs · waffo-preflight.mjs          │
│ scripts/payment-webhook-probe.mjs                                    │
└────────────────────────────────────────────────────────────────────┘
```

Two cross-cutting rules hold the whole thing together:

- **Dual backend**: the presence of `SUPABASE_SERVICE_ROLE_KEY` decides between
  Supabase and local SQLite. Business modules call one accessor layer; swapping
  backends is an env change, not a code change.
- **Entitlement**: full source ZIPs require a license / subscription / matched
  purchase email; anonymous callers can only get a skeleton preview package.
  `LICENSE_GATE=auto` is fail-safe in production.

## 2. Generated template (the customer ZIP)

```
BuilderConfig ──► computeSkip(config) ──► walk(source tree)
   payment / ai providers / features / skills / theme / i18n / appName
                    │
                    ├─ always removed: SITE_ONLY_FILES,
                    │   SITE_MARKETING_FILES, GENERATOR_FILES
                    ├─ removed by selection: 4 of 5 payment adapters,
                    │   unselected AI branches, RAG, consoles, premium,
                    │   multitenancy, unselected skills
                    │
                    ▼
              ZIP in memory (JSZip)
                    ├─ rewrite(): only files ALREADY in the ZIP
                    │   (nav/footer/layout/sitemap/robots/env, i18n, …)
                    ├─ zip.file(): brand-free home, pricing, legal pages,
                    │   README, AGENTS.md, skills, config.json, env example
                    └─ LICENSE_GATE default rewritten to "off"
                    ▼
        customer Next.js project (tsc + build verified, 18 cases)
```

What the customer gets: a real, buildable Next.js 15 app with their chosen
payment adapter (or `none` stub), their AI providers, their consoles, five
locales, generated docs and a **placeholder** privacy/terms page. What they do
not get: the factory, this site's marketing pages, this site's operational
features, our brand strings, or the production license gate.

`scripts/verify-matrix.mjs` regenerates all 18 configurations, extracts each
ZIP, type-checks it and asserts brand absence, dead-link absence and pruning
correctness. A representative subset also runs a real `next build`.

## 3. Modularisation assessment

**Verdict: good interface boundaries, weak physical boundaries.** The adapter
and backend seams are clean; the file layout still treats "site", "template"
and "factory" as one build, so every new file must be classified in three
places (`prune.ts`, `verify-matrix.mjs`, and any nav/footer rewrite).

| Done well | Evidence |
|---|---|
| One payment contract, six implementations | `PaymentProvider` in `lib/payments/types.ts`; `getPaymentProvider()` selects by env; generated builds get a tailored `index.ts` + `none` stub |
| One config source | `lib/env.ts` — no scattered `process.env` reads in domain code |
| One backend decision | `SUPABASE_SERVICE_ROLE_KEY` switch in the storage layer; migrations mirror the SQLite schema |
| Declarative pruning | `SITE_ONLY_FILES` / `SITE_MARKETING_FILES` / `GENERATOR_FILES` lists, asserted by the matrix |
| Docs generated from the same spec | `scripts/lib/ai-docs.mjs` feeds both the site and the ZIP |
| Honest, machine-checkable verification | 18-case matrix + 48 runtime smoke checks + brand/dead-link assertions |

| Friction point | Evidence | Suggested fix (not implemented) |
|---|---|---|
| Site + template share one source tree | no physical boundary; adding a file requires updating 3 lists | separate `site/` and `template/` workspaces with a shared `core/` package, or a manifest declaring each file's audience |
| Source rewritten as strings | `customer-site.ts` (597 lines) uses regex replacements on TSX; a stray brand word in a comment once broke all 18 cases | emit customer files from templates/AST, keep regex rewrites only for tiny, anchored edits |
| Pruning module is also a code generator | `prune.ts` (961 lines) mixes the skip-set decision with `buildAiIndex` / `buildPaymentIndex` template strings | split into `prune/decide.ts` and `prune/emit/*` |
| God-sized dictionaries | `lib/i18n-core.ts` 1936 lines, `lib/content/console.ts` 1244 lines | one file per locale / per console domain, compiled into a single typed map |
| God-sized env object | `lib/env.ts` 453 lines, every subsystem in one export | keep the single source, group into `env.payments.*`, `env.legal.*`, `env.ai.*` |
| Mixed responsibilities | `lib/license.ts` 629 lines = HMAC keys + dual-backend persistence + preview quotas; `waffo.ts` 582 lines = two different products | split `license/sign.ts`, `license/store.ts`, `preview-quota.ts`; separate `waffo/pancake.ts` and `waffo/acquiring.ts` |
| Factory runs inside the web app | `next build` compiles generator code into the same deployable | move generation to a separate worker/build service, or at minimum a lazy-loaded route bundle |
| Contract coverage is uneven | until 2026-11-07 three payment adapters never set `grantsAccess`, so those buyers paid without receiving a key | payment probe + a shared normalised-event schema test (`docs/payment-testing.md`) |

## 4. Where to start if you refactor

1. Add an automated assertion that **every** `verifyWebhook()` implementation
   emits `grantsAccess` + `email`/`userId` + `eventId` for a paid event. This is
   the cheapest way to prevent the bug found in §3 from returning.
2. Introduce a file-ownership manifest (one JSON: path → `core | site | factory
   | customer`) and derive all three prune lists from it.
3. Only then split the large dictionaries and the Waffo adapter — those are
   cosmetic compared with the boundary problem.

Refactoring order matters: splitting files without a manifest would multiply
the number of lists that must stay in sync.
