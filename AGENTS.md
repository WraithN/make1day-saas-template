# AGENTS.md — ShipKit (product site + template generator)

> Instructions for AI coding agents working in **this repository**. Note: the
> ZIP a customer downloads gets its **own** generated `AGENTS.md`, produced by
> `scripts/lib/ai-docs.mjs` from `ai/doc-spec.json`. Do not confuse the two.

## 1. What lives here

ShipKit is one codebase serving two purposes:

1. A **marketing + sales site** (Next.js 15 App Router) with a Builder UI.
2. A **template generator**: `POST /api/generate` takes a `BuilderConfig`,
   genuinely prunes unselected modules from *this same source tree*, and
   returns a compilable ZIP.

| Area | Key paths |
| --- | --- |
| Generator | `lib/generator/{config,spec,pack,prune,templates,themes}.ts`, `scripts/lib/ai-docs.mjs` |
| Agent docs (single source of truth) | `scripts/lib/ai-docs.mjs` → `AGENTS.md`, `design.md`, `ai/rules/*`, `.cursor/rules/*`, `CLAUDE.md`, `skills/README.md` inside every ZIP |
| Machine-readable discovery | `app/llms.txt/route.ts`, `app/llms-full.txt/route.ts`, `app/openapi.json/route.ts`, `app/api/mcp/route.ts`, `app/agent-ready/page.tsx` |
| Payments | `lib/payments/*`, `app/api/checkout/route.ts`, `app/api/webhook/route.ts`, `lib/license.ts` |
| RAG (hybrid) | `lib/rag/*`, `supabase/migrations/0002_rag.sql` |
| i18n (4 locales) | `lib/i18n-core.ts`, `lib/i18n.tsx`, `lib/i18n-server.ts`, `middleware.ts` |
| Verification | `scripts/verify-matrix.mjs`, `scripts/waffo-preflight.mjs`, `scripts/ai-docs.mjs`, `scripts/ai-setup.mjs` |

## 2. Commands

```bash
npx tsc --noEmit
NEXT_PRIVATE_SUPPRESS_TRACE=1 npx next build
node scripts/verify-matrix.mjs --all --base http://127.0.0.1:3000
node scripts/waffo-preflight.mjs --strict
```

**Build hygiene:** never run `next dev` and `next build` against the same
`.next` directory — dev overwrites `app-paths-manifest.json` and `next start`
will 404 every route. Stop dev → delete `.next` → build → start.

## 3. Non-negotiable rules

1. **One generator, one spec.** Any change to generated AI docs goes into
   `scripts/lib/ai-docs.mjs` (renderer) or `lib/generator/spec.ts` (data).
   Never hand-maintain a second copy of `AGENTS.md` / `design.md`.
2. **Pruning is real.** Adding a file that is only used by the site must be
   registered in `SITE_ONLY_FILES` (`lib/generator/prune.ts`), otherwise a
   generated project can fail `tsc` with a dead import.
3. **Config changes need schema + matrix.** A new `SkillId` / option requires
   updates to `config.ts`, `prune.ts`, the zod schema in
   `app/api/generate/route.ts`, and the cases in `verify-matrix.mjs`.
4. **Payments verify on the raw body.** Waffo Pancake uses RSA-SHA256 over
   `${t}.${rawBody}`; the single webhook is `POST /api/webhook`. `buyout` is
   one-time, `care` is monthly. Never trust an unsigned event.
5. **Four complete locales.** Any new copy needs en / zh / ja / fr. `?lang=`
   must stay in canonical and hreflang URLs.
6. **Be honest in machine-readable docs.** `llms-full.txt`, `openapi.json`,
   `/compare`, `/faq` and README's Known gaps must list real limitations, not
   aspirational marketing.
7. **Verify before claiming done.** `tsc`, clean `next build`, and the matrix.

## 4. Definition of done

- [ ] `npx tsc --noEmit` clean
- [ ] clean `npx next build` (dev server stopped, `.next` removed)
- [ ] `verify-matrix --all` passes (ZIP extracted + type-checked per case)
- [ ] new machine-readable facts added to `llms.txt` / `llms-full.txt` / `openapi.json`
- [ ] all four locales updated
- [ ] no secrets in client code or logs
- [ ] Known gaps updated when a limitation is added or fixed

## 5. Known gaps (do not "fix" by claiming they work)

Waffo `acquiring` checkout payload is unimplemented; AI chat is not streamed
and has no quota; the `multitenancy` Builder flag ships no org/RBAC tables;
`/admin` is open without `ADMIN_USER`/`ADMIN_PASSWORD`; `.data/*.json` and the
RAG memory index are not durable on serverless; Cloudflare output still has
Node-runtime routes; generated ZIPs retain ShipKit branding; no `LICENSE` file;
the build matrix runs `tsc`, not `next build`.
