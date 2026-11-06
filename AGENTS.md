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
| i18n (5 locales) | `lib/i18n-core.ts`, `lib/i18n.tsx`, `lib/i18n-server.ts`, `middleware.ts` |
| Verification | `scripts/verify-matrix.mjs`, `scripts/smoke-*.cjs`, `scripts/waffo-preflight.mjs`, `scripts/ai-docs.mjs`, `scripts/ai-setup.mjs` |

## 2. Commands

```bash
npx tsc --noEmit
NEXT_PRIVATE_SUPPRESS_TRACE=1 npx next build
LICENSE_GATE=off npx next start -p 3000   # matrix server, read-only .next
node scripts/verify-matrix.mjs --all --base http://127.0.0.1:3000
npm run smoke                              # licence gate + AI quota/stream runtime suites
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
   `app/api/generate/route.ts`, and the cases in `verify-matrix.mjs`. A new
   payment gateway additionally needs `lib/payments/<id>.ts` wired into
   `index.ts`, `prune.ts`'s `PAYMENT_FILES` / `PAYMENT_LABELS`, `schema.ts`,
   `env.ts`, `verify-matrix.mjs`'s `PAYMENT_FILES` + a case, and the
   machine-readable gateway lists. An unselected adapter must never ship.
4. **Payments verify on the raw body.** Waffo Pancake uses RSA-SHA256 over
   `${t}.${rawBody}`; the single webhook is `POST /api/webhook`. `buyout` is
   one-time, `care` is monthly. Never trust an unsigned event.
5. **Five complete locales.** Any new copy needs en / zh / ja / fr / de. `?lang=`
   must stay in canonical and hreflang URLs.
6. **Be honest in machine-readable docs.** `llms-full.txt`, `openapi.json`,
   `/compare`, `/faq` and README's Known gaps must list real limitations, not
   aspirational marketing.
7. **Verify before claiming done.** `tsc`, clean `next build`, the matrix and
   the runtime smoke suites (`npm run smoke`).

## 4. Definition of done

- [ ] `npx tsc --noEmit` clean
- [ ] clean `npx next build` (dev server stopped, `.next` removed)
- [ ] `verify-matrix --all` passes (ZIP extracted + type-checked per case)
- [ ] `npm run smoke` passes (paywall, preview quota, AI quota/stream, RAG auth)
- [ ] new machine-readable facts added to `llms.txt` / `llms-full.txt` / `openapi.json`
- [ ] all five locales updated
- [ ] no secrets in client code or logs
- [ ] Known gaps updated when a limitation is added or fixed

## 5. Known gaps (do not "fix" by claiming they work)

Waffo `acquiring` create-order IS implemented, but every merchant-contract
field comes from a `WAFFO_ACQUIRING_*` env var (ShipKit invents none) and its
signing string / response shape / webhook attribution are 需按你的 Waffo 合同核对
(docs/waffo.md §5); Pancake is complete. Lemon Squeezy's webhook custom-data
echo location, the portal id (customer vs subscription) and the exact
status/event names are 需按你的 Lemon Squeezy 账户核对. The local SQLite store
(accounts, roles, licenses, orders, traffic, AI usage)
and the in-memory RAG index are not durable on serverless — a production
deployment should configure Supabase; Cloudflare output still has Node-runtime
routes, so that deploy target needs edge-compatible route handlers; PayPal
has no billing portal. The local user directory now HAS password reset and
e-mail verification flows: one-time, expiring tokens are stored ONLY as
SHA-256 hashes in local SQLite `password_resets` / `email_verifications`
(`lib/local-auth-tokens.ts`), new passwords use scrypt hashes, and links are
sent through `lib/mail/*`. That is still NOT equivalent to Supabase Auth: there
is no local password SIGN-IN consumer for those hashes yet, no MFA, no OAuth
providers, no session rotation / refresh, and no email-confirmation-gated
login. "send" endpoints always return the same generic success copy
(anti-enumeration). Supabase Auth takes over once
`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured
(`resetPasswordForEmail` / `verifyOtp` / `updateUser` / `resend`); the exact
Supabase redirect + email-template details are 需按 Supabase 文档核对.
`SUPABASE_SERVICE_ROLE_KEY` additionally moves the account directory to
Postgres.

Multi-tenancy is real but partial: `0007_orgs.sql` (organizations +
memberships + RLS) and `lib/org.ts` ship with every build, while the workspace
UI / `/api/org` routes only ship when BOTH `multitenancy` and `account` are
selected. Customers must run the migration and add `.eq("org_id", ...)` to
their own domain tables themselves. Generated projects no longer contain
ShipKit marketing pages (home/pricing are brand-free), but legal pages are
placeholders the customer must replace.

Transactional mail (`lib/mail/*`) implements `resend` (REST), a configurable
`webhook` HTTP mailer and `none` (safe logged no-op). **`MAIL_PROVIDER=smtp`
is NOT implemented** — there is no `nodemailer` dependency; installing it and
adding a dynamic-import adapter is left to the operator (`docs/email.md`).
`MAIL_PROVIDER=none` is degraded: verification / reset / ticket emails are
logged but not delivered, and `GET /api/mail/self-check` flags it. The code
only SENDS — SPF / DKIM / DMARC, a dedicated sending subdomain, suppression
lists and warm-up are DNS / provider-side work, not code, and decide actual
inbox placement. These three feature areas (mail, support tickets, auth
recovery) are **ShipKit-site-only**: they live in this repo's own runtime but
are pruned from every generated customer ZIP (`SITE_ONLY_FILES`), and the
corresponding Nav / Footer / login / admin links are rewritten out of the
customer package. The generated starter still has no built-in support form,
no password-reset page and no transactional mail of its own.
