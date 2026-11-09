# AGENTS.md — make1day (product site + template generator)

> Instructions for AI coding agents working in **this repository**. Note: the
> ZIP a customer downloads gets its **own** generated `AGENTS.md`, produced by
> `scripts/lib/ai-docs.mjs` from `ai/doc-spec.json`. Do not confuse the two.

## 1. What lives here

make1day is one codebase serving two purposes:

1. A **marketing + sales site** (Next.js 15 App Router) with a Builder UI.
2. A **template generator**: `POST /api/generate` takes a `BuilderConfig`,
   genuinely prunes unselected modules from *this same source tree*, and
   returns a compilable ZIP.

| Area | Key paths |
| --- | --- |
| Generator | `lib/generator/{config,spec,pack,prune,templates,themes}.ts`, `scripts/lib/ai-docs.mjs` |
| Agent docs (single source of truth) | `scripts/lib/ai-docs.mjs` → `AGENTS.md`, `design.md`, `ai/rules/*`, `.cursor/rules/*`, `CLAUDE.md`, `skills/README.md` inside every ZIP |
| Machine-readable discovery | `app/llms.txt/route.ts`, `app/llms-full.txt/route.ts`, `app/openapi.json/route.ts`, `app/api/mcp/route.ts` |
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
npm run agents:lint                      # AGENTS.md / scoped rules / skills index contract
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
8. **The hand-drawn skin is site-only.** `app/globals.css`, the `sk-*` /
   `card-*` classes and `components/home/HandDrawnDeco.tsx` style THIS site;
   generated projects get their own stylesheet from `buildGlobalsCss(style)`
   in `lib/generator/themes.ts`. Consequences:
   - every new `components/home/*` decoration must be registered in
     `SITE_MARKETING_FILES` in BOTH `prune.ts` and `verify-matrix.mjs`;
   - do NOT change the className string of Nav's wordmark `<Link>` or Footer's
     brand `<span>` — `customerNavBrand()` / `customerFooter()` match them
     verbatim to strip our brand from customer ZIPs. Style them with a
     structural CSS selector instead;
   - the `doodle` palette is additive. A new style needs `config.ts`,
     `schema.ts` (zod enum), `themes.ts`, the four machine-readable lists,
     plus the matrix case count, its `catalog.styles` assertion and the CI
     case list.

## 4. Definition of done

- [ ] `npx tsc --noEmit` clean
- [ ] clean `npx next build` (dev server stopped, `.next` removed)
- [ ] `verify-matrix --all` passes (ZIP extracted + type-checked per case)
- [ ] `npm run smoke` passes (paywall, preview quota, AI quota/stream, RAG auth)
- [ ] if a payment adapter changed: `npm run probe:webhook -- --provider <id> --grant`
      plus one real sandbox checkout, and a completed payment creates exactly
      one `licenses` row (`docs/payment-testing.md`)
- [ ] new machine-readable facts added to `llms.txt` / `llms-full.txt` / `openapi.json`
- [ ] all five locales updated
- [ ] no secrets in client code or logs
- [ ] Known gaps updated when a limitation is added or fixed

## 5. Known gaps (do not "fix" by claiming they work)

Waffo `acquiring` create-order IS implemented, but every merchant-contract
field comes from a `WAFFO_ACQUIRING_*` env var (make1day invents none) and its
signing string / response shape / webhook attribution are 需按你的 Waffo 合同核对
(docs/waffo.md §5); Pancake is complete. Lemon Squeezy's webhook custom-data
echo location, the portal id (customer vs subscription) and the exact
status/event names are 需按你的 Lemon Squeezy 账户核对. The local SQLite store
(accounts, roles, licenses, orders, traffic, AI usage)
and the in-memory RAG index are not durable on serverless — a production
deployment should configure Supabase; PayPal has no billing portal. The
Cloudflare target now uses the **OpenNext Cloudflare adapter on Workers** with
`nodejs_compat` (`wrangler.toml` → `main = ".open-next/worker.js"`,
`open-next.config.ts.example`, `npm run deploy`), NOT the retired
`@cloudflare/next-on-pages` edge runtime, because several shipped route
handlers explicitly declare `runtime = "nodejs"`. Workers does not provide a
writable disk, so `node:sqlite` local storage cannot run there: configure
Supabase before deploying to that target, and use a durable store for RAG
documents. The local user directory now HAS password reset, e-mail
verification AND a password SIGN-IN consumer: one-time, expiring tokens are
stored ONLY as SHA-256 hashes in local SQLite `password_resets` /
`email_verifications` (`lib/local-auth-tokens.ts`), new passwords use scrypt
hashes, sessions are hash-only rows in `local_sessions`
(`lib/local-auth.ts`, `/api/auth/local`, `components/LocalLoginForm.tsx`),
and links are sent through `lib/mail/*`. That is still NOT equivalent to
Supabase Auth: there is no MFA, no OAuth providers, no session rotation /
refresh, and no email-confirmation-gated login. "send" endpoints always
return the same generic success copy
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
make1day marketing pages (home/pricing are brand-free), but legal pages are
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
recovery) are **make1day-site-only**: they live in this repo's own runtime but
are pruned from every generated customer ZIP (`SITE_ONLY_FILES`), and the
corresponding Nav / Footer / login / admin links are rewritten out of the
customer package. The generated starter still has no built-in support form,
no password-reset page and no transactional mail of its own.

Legal / privacy: `/privacy` and `/terms` now describe the real data map (the
full inventory is `docs/legal-data-map.md`) and resolve every entity, mailbox,
jurisdiction and site-URL string through `lib/env.ts` — no company name or
address is hard-coded in legal copy. `lib/observability.ts` +
`lib/legal-lifecycle.ts` now provide a retention job (`POST
/api/cron/retention`, 90-day default), append-only `consent_events`, hashed
`delivery_events` (written by `/api/generate`, `/api/license`,
`deliverLicenseKey()` and `/api/license/claim`), `error_events`, and
`/api/privacy/export` + `/api/privacy/erase`. `docs/dpa-template.md` is a
fill-in template, **not** a signed DPA. Remaining limits: the host must
schedule both cron endpoints (`CRON_SECRET` required in production), there is
no cookie scanner, no consent-receipt UI, and no SMTP transport. The refund
rule stays a plain 14-day window in all five languages — delivery events are
evidence, not a new refund condition. The repository `LICENSE` is MIT while
the site sells a generated build — the terms state that the charge covers the
configured build + delivery service, not an exclusive right to the code.
Switching to a commercial license is an operator decision that must be made
before launch.

Payment-to-delivery IS automated in code: a paid webhook consumes the
`grantLicense()` return value and calls `deliverLicenseKey()` with a
`license:<jti>` dedupe key; a failed transport is persisted in `mail_outbox`
for `POST /api/cron/mail-outbox` to retry. Guest checkout and mismatched
emails use `/api/license/claim` (anti-enumeration + two persistent rate-limit
buckets). **Deployment caveats, not missing code:** `MAIL_PROVIDER` still
defaults to `none`, no host scheduler is configured by this repo, and no real
sandbox payment has been run for every gateway. `/faq`, `llms.txt` and
`llms-full.txt` describe exactly this — never claim untested live delivery.

Editorial / GEO surface: `lib/content/blog.ts` holds 9 articles (each with a
localised structured FAQ, aliases for legacy slugs and an `updated` date) and
`lib/content/faq.ts` holds 21 EN + 21 ZH answers. `app/blog/[slug]/page.tsx`
emits BlogPosting + FAQPage + BreadcrumbList JSON-LD; `app/blog/page.tsx` emits
CollectionPage + ItemList; `app/blog/[slug]/md/route.ts` serves `text/markdown`
variants that are linked as metadata alternates, listed in `app/sitemap.ts`
(canonical slugs only — aliases stay out to avoid duplicate-content signals)
and explicitly allowed in `app/robots.ts`. All three routes and both content
modules are site-only: **`app/blog/[slug]/md/route.ts` MUST stay in
`SITE_MARKETING_FILES`** in both `lib/generator/prune.ts` and
`scripts/verify-matrix.mjs`, otherwise it imports the pruned blog module and
breaks `tsc` inside every customer ZIP. Every article and FAQ answer is
published under the company name `make1day` (Organization author /
publisher), never a personal byline. JSON-LD `inLanguage` and the
`Content-Language` header describe the language of the BODY, not the UI
locale — `postContentLang()` / `FaqContent.tsx` fall back to `en` explicitly
instead of labelling an English body as ja/fr/de.

`?format=md` on any public page is rewritten by `middleware.ts` to
`app/api/markdown/route.ts` (site-only), which serves the real FAQ Q&A, the
blog index, full articles or a factual digest for allowlisted pages.
`app/.well-known/agent-card.json/route.ts` declares the agent endpoints and
their missing capabilities (no A2A tasks, no SSE, no push). `/api/mcp` now
implements `resources/read` and drops wildcard CORS in favour of
`MCP_ALLOWED_ORIGINS`. `npm run agents:lint` (`scripts/agents-lint.mjs`,
shipped in every ZIP) enforces the AGENTS.md sections, scoped-rule globs,
skills index and the brand sweep. All three new site-only files MUST stay in
`SITE_ONLY_FILES` in both prune.ts and verify-matrix.mjs.
