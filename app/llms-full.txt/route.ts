// llms-full.txt — the LONG form of llms.txt for AI agents / answer engines.
// Self-contained on purpose: it must not import modules that the generator
// prunes, because this route is excluded from customer ZIPs (SITE_ONLY_FILES).
import { env } from "@/lib/env";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://shipkit.dev").replace(
  /\/+$/,
  "",
);

// Which gateway actually processes this site's checkout. The document must
// describe the LIVE gateway, not a hardcoded brand — PAYMENT_PROVIDER decides.
const PROVIDER_KEY = env.paymentProvider();
const PROVIDER_LABELS: Record<string, string> = {
  stripe: "Stripe",
  creem: "Creem",
  paypal: "PayPal",
  waffo: "Waffo",
};
const PROVIDER = PROVIDER_LABELS[PROVIDER_KEY] ?? PROVIDER_KEY;

// Gateway-specific protocol notes. Waffo's detail only applies when Waffo is
// the active gateway; for every other provider the section stays generic
// instead of documenting endpoints this deployment never calls.
const GATEWAY_PROTOCOL =
  PROVIDER_KEY === "waffo"
    ? `IMPORTANT: "Waffo" is two incompatible products. default is Pancake
(docs.waffo.ai, MoR for digital products); waffo.com/docs is Acquiring
(SE-Asia acquiring, RSA X-SIGNATURE, contract-specific create-order payload).

Pancake checkout:
  POST https://api.waffo.ai/v1/actions/checkout/create-session
  Auth A: X-Store-Slug + X-Environment (test|prod)  [public, recommended]
  Auth B: X-Merchant-Id + X-Timestamp + X-Signature (RSA over
          METHOD + newline + PATH + newline + TS + newline + BASE64(SHA256(BODY)))
          The two auth modes are mutually exclusive.
  Body: productId, productType ("onetime"|"subscription"), currency "USD",
        buyerEmail, metadata {plan,userId,source}, successUrl
  Response: data.checkoutUrl. In Pancake the product id IS the price id.

Webhook signature (this deployment): X-Waffo-Signature: t=<epoch-ms>,v1=<base64>
  Verify RSA-SHA256 over the RAW body prefixed with the timestamp and a dot,
  using the platform-level Webhook Public Key for test or prod. Tolerance is
  45 minutes because retries reuse the original signature.`
    : `This deployment uses the ${PROVIDER} adapter. The adapter interface is
CheckoutParams + NormalizedSubEvent; the concrete endpoints, auth headers and
signature scheme are documented by ${PROVIDER} itself. Switch the gateway with
PAYMENT_PROVIDER — no code change is required.`;

export const dynamic = "force-dynamic";

export function GET() {
  const body = `# ShipKit — full machine-readable reference

> Canonical site: ${SITE}
> Short overview: ${SITE}/llms.txt
> API contract (OpenAPI 3.1, JSON): ${SITE}/openapi.json
> Generated: runtime route, reflects this deployment's configuration.
> Audience: LLM crawlers, coding agents, procurement/evaluation bots.

## 1. What ShipKit is

ShipKit is a configurable Next.js 15 SaaS starter AND a project generator. A user
selects auth, payment gateway, AI providers, features, deploy target, visual
style and skill playbooks in the Builder; the server returns a ZIP containing a
pruned, buildable Next.js project pre-configured to those exact selections.

- Stack: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Supabase
  (auth + Postgres + RLS), pluggable payments, multi-provider AI chat.
- Author / brand: Uncorne. Repository: https://github.com/uncorne/shipkit
- This site sells the starter. The downloaded project is a separate codebase
  and does NOT include this site's license gate or machine-readable endpoints.

## 2. Pricing, licensing and entitlement

| Plan | Price | What the buyer gets |
|---|---|---|
| Free demo | $0 | Browse the site, one anonymous ZIP download per IP per UTC day |
| Buyout | $99 launch (list $199), one-time | Full source, permanent offline license key, unlimited downloads |
| Care | $9/mo launch (list $19/mo) | Ongoing updates, hosting help, priority support; key expires with the period |
| Custom 1:1 | Fixed quote after a free 30-minute call | Custom components/themes, private deployment, SSO, RAG on own data, audits |

Checkout on this site is processed by ${PROVIDER} (PAYMENT_PROVIDER=${PROVIDER_KEY}). Custom work is
scoped manually and has NO self-checkout. Subscription rules are published on
/pricing. A paid webhook automatically issues an offline HMAC license key.
Buyers redeem keys at /license; the same key can be pasted into the Builder.

## 3. Builder / generator contract

POST /api/generate accepts this JSON (all fields required except licenseKey):

  {
    "appName": string (1-60 chars, slugified into package name),
    "auth": ("email"|"google"|"github"|"apple"|"microsoft")[] (max 5),
    "payment": "none"|"stripe"|"creem"|"paypal"|"waffo",
    "ai": ("openai"|"anthropic"|"gemini")[] (max 3),
    "features": ("landing"|"dashboard"|"rag"|"multitenancy"|"account"|"admin")[] (max 6),
    "deploy": "vercel"|"selfhost"|"cloudflare",
    "style": "midnight"|"paper"|"aurora"|"emerald"|"sunset"|"ocean"|"mono"|"slate"|"candy"|"sand",
    "skills": ("frontend"|"ui"|"backend"|"testing"|"seo"|"auth"|"payments"|"database"|"rag"|"i18n"|"deploy"|"agents")[] (max 12),
    "licenseKey": string (optional, "SK1.<payload>.<mac>")
  }

Response: 200 application/zip (attachment), or 402 PAYMENT_REQUIRED with
{ error, code, pricingUrl, licenseUrl } when no entitlement applies, 400 on an
invalid config, 500 on packaging failure. Response header
X-ShipKit-Entitlement reports which rule allowed the download.

Pruning is REAL, not a manifest flag:
- Only the selected payment adapter survives; "none" generates a throwing stub.
- Only the selected AI provider SDKs are imported.
- Unselected RAG, dashboard and skills files are removed; Nav, auth callback,
  login and checkout redirect literals are rewritten when dashboard is removed.
- features=account ships the whole /account tree; features=admin ships the
  whole /admin tree. The shared console layer (components/console/*,
  lib/console.ts, lib/content/console.ts) survives iff at least ONE console
  is selected. When /account is pruned, Nav and every post-login redirect are
  rewritten to /dashboard or "/". When /admin is pruned while /account stays,
  the account layout's "Admin console" shortcut is retargeted to "/" with an
  accurate label. No dead links survive any combination.
- Site-only endpoints are always excluded: payments/self-check, llms.txt,
  llms-full.txt, openapi.json, api/mcp, agent-ready page and its content module.
  The site-only /agent-ready footer link is stripped from Footer.tsx too.
- Site-only npm scripts are removed; ai:docs / ai:setup are ADDED instead.

Every ZIP contains: .env.example (with LICENSE_GATE=off), README.md,
shipkit.config.json (the exact selections), ai/doc-spec.json, AGENTS.md,
design.md, ai/rules/*.md, .cursor/rules/*.mdc, CLAUDE.md, skills/README.md,
the selected skills/*.md playbooks and the three offline ai-*.mjs scripts.

## 4. AI-coding documents (the main differentiator)

One renderer, one spec, zero drift:
  lib/generator/spec.ts -> ai/doc-spec.json (config cache + FULL catalogue of
  12 skills and 10 palettes) -> scripts/lib/ai-docs.mjs (deriveSpec +
  buildDocSet) -> pack.ts (site) AND scripts/ai-docs.mjs (customer project).
  shipkit.config.json is the SOURCE OF TRUTH: both CLIs re-read it on every
  run and re-derive labels + style from the catalogue, so editing selections
  really changes the documents.

- AGENTS.md — the ROOT contract (standard uppercase name; the old lowercase
  agents.md is gone because it collides on case-insensitive filesystems):
  build selections, commands, repository map, scoped-rule index, skills index,
  8 non-negotiable rules, a style lock with concrete token values, module
  notes and a definition of done.
- design.md — generated FROM the chosen style: colour token table with hex
  values, typography stack, --radius, texture rule, component vocabulary,
  responsive and accessibility rules, do/don't checklist. A "candy" build and
  a "midnight" build ship DIFFERENT documents.
- ai/rules/*.md — scoped rules with name/description/globs frontmatter:
  core, style, api, auth, payments (only when payments enabled), database,
  rag (only when RAG selected), i18n, deploy, account and admin (only when
  that console is selected), plus one rule per selected skill.
- .cursor/rules/*.mdc — the same rules in Cursor's native format.
- CLAUDE.md — Claude Code entry point importing AGENTS.md, design.md, all
  rules and all selected skills with @path references.
- skills/*.md — 12 playbooks: frontend, UI, backend, testing, SEO, auth,
  payments, database, RAG, i18n, deploy, agent workflow.
- npm run ai:docs — deterministic rebuild of ALL documents from
  shipkit.config.json + ai/doc-spec.json; npm run ai:setup refreshes only
  Cursor / Claude Code integrations (--tool all|cursor|claude). --dry-run
  reports diffs. A freshly extracted ZIP reports 0 changed files.

Read AGENTS.md and design.md before editing the generated project. Change the
config, not the outputs. Full design notes: docs/agent-native.md.

### 4A. User console and admin console (selectable features)

The site and every generated project share ONE source tree for the two
consoles, so the features you see on this site are exactly what a buyer gets.

User console (feature=account, route /account):
  /account            overview — profile, subscription, license, quick actions
  /account/billing    the Supabase subscription row, provider, renewal date
  /account/licenses   keys issued to the signed-in email; HMAC key display
  /account/settings   language / theme / session controls, sign out
  Guard: middleware.ts requires supabase.auth.getUser() (or the sk_demo cookie
  in demo mode). Data: getAccountSnapshot() / getMyLicenses() in lib/console.ts.

Admin console (feature=admin, route /admin):
  /admin              KPIs — licenses, pageviews, known accounts
  /admin/users        the account directory with the role column
                      (admin/staff/member). Source: Supabase Auth + the
                      profiles table when SUPABASE_SERVICE_ROLE_KEY is set,
                      otherwise the local SQLite mirror (accounts, roles,
                      licenses, orders, operator account) in
                      .data/shipkit.db — roles are editable in both. Each row
                      says where it came from.
  /admin/licenses     issued keys, plan, email, order id
  /admin/stats        first-party pageview aggregates
  /admin/system       read-only runtime flags, no secret values
  Guard: in-page operator sign-in (ADMIN_USER / ADMIN_PASSWORD) plus the optional
  ADMIN_EMAILS allowlist enforced in middleware.ts. Data: getAdminSnapshot().

Both use components/console/* for the shell and tables, and
lib/content/console.ts for complete en/zh/ja/fr/de copy. They are read-only
starters: no profile mutation endpoint, no org/RBAC table. See docs/consoles.md.

## 5. RAG (strategy B, hybrid retrieval)

- Chunking: ~480 chars with ~60 char overlap; Latin word tokens plus CJK
  unigrams/bigrams.
- Lexical branch: Okapi BM25 (k1=1.5, b=0.75).
- Semantic branch: any OpenAI-compatible /embeddings endpoint; cosine
  similarity over an in-memory vector index, or pgvector via Supabase RPC when
  RAG_VECTOR_STORE=supabase (migration 0002_rag.sql: tsvector GIN + HNSW,
  1536 dims, SQL-side RRF).
- Fusion: Reciprocal Rank Fusion, k=60, over BM25 / memory-vector / pgvector
  rank lists. A passage found by several branches ranks higher.
- Degradation: no embedding key -> BM25 only; no chat key -> extractive answer
  quoting retrieved passages. Answers carry inline [n] citations and a
  "retrieval" object describing which branches actually ran.
- Endpoints: POST /api/rag/ingest {title,text}, GET /api/rag/ingest,
  POST /api/rag/query {question,provider?}. Demo UI: /rag (noindex).

## 6. Payments — ${PROVIDER} (this site's gateway)

${GATEWAY_PROTOCOL}

Webhook (single route for every gateway): POST /api/webhook
  Events: order.completed -> permanent key; subscription.activated -> key;
  renewed/recovered/canceling/plan_changed -> active; canceled/refund.succeeded
  -> canceled; past_due -> past_due. subscription.payment_succeeded is
  INTENTIONALLY IGNORED (it accompanies the first activation and would grant
  access twice). Dedup key: eventType + eventId (the gateway may retry up to 4x).
  Persistence failures return 500 so the gateway retries.

Generated projects can instead select stripe / creem / paypal / waffo / none in
the Builder; the adapter interface is NormalizedSubEvent + CheckoutParams.

## 7. License gate (protects this site's download endpoint)

Authorization order for POST /api/generate:
  1. offline HMAC key (body licenseKey or httpOnly sk_license cookie),
  2. logged-in user with an active subscription, or email auto-claim,
  3. otherwise 402 — an anonymous visitor never receives the source ZIP.
Key format: SK1.<base64url payload>.<base64url HMAC-SHA256>. LICENSE_SECRET is
required in production (without it no license can be issued). LICENSE_GATE=auto
gates every production deployment; generated customer projects ship with
LICENSE_GATE=off.
Anonymous visitors may still download a free PREVIEW from POST
/api/generate/preview: the file inventory of the configured build plus the
design tokens — never application source. The preview quota is counted per
signed visitor token AND per trusted network (FREE_GENERATIONS_PER_DAY,
FREE_GENERATIONS_PER_DAY_PER_IP).
Operational views: /admin/licenses (operator sign-in), GET /api/payments/self-check.

## 8. HTTP API summary (full schema: ${SITE}/openapi.json)

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | /api/generate | Build + download the source ZIP | license / subscription |
| POST | /api/generate/preview | Build + download the source-free preview | anonymous (quota) |
| POST | /api/license | Redeem a key into an httpOnly cookie | public |
| GET | /api/license | Key + gate status | cookie |
| DELETE | /api/license | Clear the key cookie | public |
| POST | /api/checkout | Create a Waffo checkout session {plan:"buyout"\|"care"} | Supabase session |
| POST | /api/webhook | Verify + normalize payment events, issue keys | RSA signature |
| GET | /api/payments/self-check | Read-only config readiness (no secrets) | public |
| POST | /api/rag/ingest | Chunk, embed and index a document | public |
| GET | /api/rag/ingest | List indexed documents | public |
| POST | /api/rag/query | Hybrid retrieval + cited answer | public |
| POST | /api/ai | Multi-provider chat (plan-gated outside demo) | Supabase session |
| POST | /api/track | Aggregate pageview (consent-gated) | public |
| GET | /api/stats | First-party stats | Operator session |
| POST | /api/mcp | MCP JSON-RPC 2.0 (initialize / tools/list / tools/call / resources/list / ping) | public; includeZip is license-gated |
| GET | /api/mcp | Service + tool discovery | public |

## 9. Machine-readable discovery surface

- ${SITE}/llms.txt — short product overview for answer engines.
- ${SITE}/llms-full.txt — this document.
- ${SITE}/openapi.json — OpenAPI 3.1 contract for the HTTP API.
- ${SITE}/api/mcp — scaffold_project tool. Input { config?, includeZip?,
  licenseKey? }; returns a validated BuilderConfig plus the exact
  POST /api/generate body. includeZip=true returns the ZIP as base64 through
  the SAME license gate; other tools: get_product_info, get_builder_config,
  get_agent_delivery. Stateless JSON-RPC over HTTP; scripts/mcp-server.mjs
  bridges stdio for Cursor / Claude Code. Reference: docs/mcp.md.
- ${SITE}/agent-ready — five-language landing page explaining the stack, the
  recommended agent read order and what lands inside every ZIP.
- ${SITE}/sitemap.xml — indexable pages plus localized ?lang= variants.
- ${SITE}/robots.txt — default rules + explicit AI crawler allowlist
  (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended,
  CCBot, Bytespider); machine-readable routes are explicitly allowed.
- JSON-LD on pages: Organization, WebSite, FAQPage, BlogPosting, OfferCatalog.
- Per-page canonical + hreflang for en / zh / ja / fr; dynamic OG image.

## 10. Content, i18n and documentation

- Marketing pages: /, /builder, /pricing, /faq, /compare, /agent-ready,
  /blog, /rag (demo), /license (noindex), /privacy, /terms.
- Private consoles (noindex, disallowed in robots.txt, absent from sitemap):
  /account, /account/billing, /account/licenses, /account/settings,
  /admin, /admin/users, /admin/licenses, /admin/stats, /admin/system.
- Languages: English, 中文, 日本語, Français (?lang= or the language switcher).
- Docs in the repository: docs/waffo.md (protocol reference),
  docs/waffo-launch-checklist.md (go-live runbook),
  docs/payments.md + .zh/.ja/.fr (gateway setup),
  docs/competitive-analysis.md (2026 competitor review),
  docs/agent-discovery.md (machine-readable surface),
  docs/agent-native.md (Agent-Native Delivery spec),
  docs/mcp.md (MCP tool reference),
  docs/build-matrix.md (generated-template CI matrix),
  docs/consoles.md (user / admin console architecture and guards),
  AGENTS.md (root contract for agents working on THIS repo).

## 11. Deployment and verification

- Env template for this gateway: .env.waffo-pancake.example.
- Static preflight: "node scripts/waffo-preflight.mjs --strict" (no network,
  never prints secrets). Live readiness: GET /api/payments/self-check.
- Generated-template CI: .github/workflows/generated-matrix.yml + 
  "node scripts/verify-matrix.mjs --all". 16 cases cover all 5 gateways, all
  10 styles, all 3 deploy targets, RAG/dashboard/skills on-off, AND both
  consoles on / off / each alone; each case downloads a real ZIP, asserts
  AGENTS.md / scoped rules / Cursor rules / CLAUDE.md / 12 skills / ai:docs
  scripts / console pruning / no dead console links, then runs tsc --noEmit
  inside the extracted project.
- Supabase migrations: 0001_init.sql, 0002_rag.sql, 0003_licenses.sql.

## 12. Honest limitations

- Waffo "acquiring" flavor verifies webhooks but its create-order payload is
  contract-specific and NOT implemented; Pancake is complete.
- AI chat is not token-streamed and has no per-user quota.
- /admin and /api/stats are open unless ADMIN_USER / ADMIN_PASSWORD are set;
  ADMIN_EMAILS adds an optional signed-in role check. /account is session-gated
  but read-only (no profile mutations). Both consoles are five-language.
  First-party stats use a local SQLite file (not durable on serverless).
- The Builder's "multitenancy" flag is a selection only: no org/RBAC tables.
- PayPal creates subscription checkouts only; Creem field names are unverified.
- Cloudflare deploy output still contains Node-runtime routes.
- Generated projects keep ShipKit marketing pages/branding — rebrand first.
- The README declares MIT but no LICENSE file ships; decide before selling.
- The build matrix runs tsc --noEmit, not next build, on generated projects;
  no live pass-rate page or artifact-size dashboard exists.
- /api/mcp is stateless JSON-RPC: no sampling, prompts, subscriptions or SSE
  streaming. scaffold_project returns configuration JSON by default; only
  includeZip=true (license-gated) returns a ZIP.
- AGENTS.md and scoped rules are written conventions, not enforced by lint;
  whether a client auto-loads .cursor/rules or CLAUDE.md depends on the tool.
- npm run ai:docs regenerates documents, not app/globals.css: changing the
  style in the manifest updates design.md/AGENTS.md but a real palette switch
  requires a fresh ZIP from the Builder.

## 13. Differentiation vs other starters

Compared with ShipFast (~$199), Divjoy (~$199), VibeReady ($149-399),
Makerkit (~$299), Supastarter ($299-1,499) and Open SaaS ($0): ShipKit is the
only one in this set that BOTH prunes unselected modules out of the downloaded
source AND generates a root AGENTS.md, a style-specific design.md, scoped rules
and 12 skills — all rebuildable with npm run ai:docs — at a $99 launch price,
with llms.txt/llms-full.txt, an OpenAPI 3.1 contract, an MCP scaffold_project
tool, an agent-ready landing page, selectable user/admin consoles and a public 16-case build matrix.
Deep B2B multi-tenancy/IaC remains the stronger choice at Makerkit,
Supastarter or VibeReady. Full reasoning: docs/competitive-analysis.md.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
