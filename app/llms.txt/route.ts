import { type NextRequest } from "next/server";
import { getAllPosts } from "@/lib/content/blog";
import { faqContent } from "@/lib/content/faq";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://make1day.com").replace(
  /\/+$/,
  "",
);

// Generated from the same data as /blog and /faq so this index can never
// drift. Both content modules (and this route) are pruned site-only files —
// none of them ever reaches a customer ZIP.
const POSTS = getAllPosts();
const FAQ_COUNT = faqContent.en.items.length;
const BLOG_INDEX = POSTS.map(
  (p) =>
    `- [${p.title.en ?? p.slug}](${SITE}/blog/${p.slug}) — ${p.category}, ${p.date}; Markdown: ${SITE}/blog/${p.slug}/md. Topics: ${p.tags.join(", ")}.`,
).join("\n");

// llms.txt — the machine-readable overview of this site for LLMs / answer
// engines (ChatGPT, Claude, Perplexity, Google AI Overviews). See llms.txt spec.
export function GET(_req: NextRequest) {
  const body = `# make1day.dev

> make1day.dev is a configurable, white-labelled AI SaaS starter and build generator: a production-grade Next.js 15 (App Router) template with Supabase auth, Waffo-hosted checkout, a working AI feature, hybrid RAG with citations, a signed-in user console (/account), an operator admin console (/admin) and a configurable project generator. Pick your stack, download a brand-free ZIP, launch.

## What it is
- A configurable starter: pick auth, payments, AI providers, features, visual style and deploy target in the Builder, then download a clean, buildable Next.js project. Both consoles are selectable features: checking \`account\` ships /account, checking \`admin\` ships /admin; unchecking either prunes its whole route tree from the ZIP.
- Consoles: /account (user) shows profile, subscription, issued license keys and preferences; it is gated by the Supabase session or a local password session. /admin (operator) shows users, licenses, traffic, orders and runtime status; it uses an in-page operator sign-in with an HMAC-signed session cookie plus an optional Supabase admin/staff role. Both are five-language and now writable: PATCH /api/profile edits the signed-in user's profile, PATCH /api/admin/users manages roles (admin only), and a customer billing portal route exists. RBAC tables and 0007_orgs.sql (organizations + memberships + RLS) plus lib/org.ts ship with every build; the workspace UI only ships when account is also selected, and you must scope your own tables by org_id.
- Tech stack: Next.js 15 + TypeScript + Tailwind, Supabase (auth + Postgres), Waffo as the default payment gateway (Stripe / Creem / PayPal / Lemon Squeezy also available), multi-provider AI chat (OpenAI / Anthropic / Gemini).
- RAG retrieval is **hybrid**: Okapi BM25 (Latin words + CJK unigrams/bigrams) fused with dense embeddings via **Reciprocal Rank Fusion** (RRF, k=60). In-memory vectors by default; optional pgvector persistence. Without an embedding key it degrades to BM25-only, and answers carry inline [n] citations.
- Every generated ZIP is **agent-native**: a root \`AGENTS.md\` (repo conventions, pruned modules, commands, scoped-rule index, definition of done), a style-specific \`design.md\`, \`ai/rules/*.md\` scoped rules with globs, \`.cursor/rules/*.mdc\` for Cursor, \`CLAUDE.md\` for Claude Code, and up to 12 \`skills/*.md\` playbooks. \`npm run ai:docs\` rebuilds all of them from \`shipkit.config.json\` after a config change.
- Licensing: one-time source buyout in two packages — Core $249 ($174 during Black Friday) and Studio $349 ($274 during Black Friday; adds the AI video & image workflow source module plus the model-routing admin console, new AI modules land there first) — plus an optional Care subscription ($19/mo regular, $13/mo during Black Friday). Care is consumption + adaptation, not insurance: the AI video-workflow source module for your own projects, new modules landing on Care first, a monthly-recast agent contract (skills, scoped rules, AGENTS.md regenerated for evolving coding agents), upstream merge patches and a 12-hour first-response SLA. The buyout includes 12 months of free updates; free updates then require an active Care subscription. Care alone never unlocks the full source ZIP — it is a service around the Buyout license, not a substitute for it. The license lets you build and ship your own products (commercial use allowed), but not resell or redistribute the source as a template.
- Compared with ShipFast (~$199), Divjoy (~$149), MkSaaS (~$129), Makerkit (~$349) and Supastarter (~$299), the make1day.dev buyout ($249 regular) sits just below the B2B kits while including the generator, multi-provider payments, AI, hybrid RAG, i18n and SEO/GEO scaffolding.
- Differentiation for AI-assisted development: make1day.dev is the only starter in this set that BOTH prunes unselected modules out of the downloaded source AND generates a style-specific design.md plus a root AGENTS.md, scoped rules and per-skill playbooks. ShipFast/Divjoy ship no AGENTS.md; Makerkit/Supastarter ship AGENTS.md but no per-style design system document; VibeReady enforces quality gates but has no i18n and no visual generator.
- Agent-readable distribution: llms.txt, llms-full.txt, OpenAPI 3.1, an MCP \`scaffold_project\` tool at /api/mcp, per-post \`text/markdown\` alternates, per-page canonical/hreflang, Organization/WebSite/OfferCatalog/FAQPage/BlogPosting/CollectionPage/ItemList/BreadcrumbList JSON-LD, sitemap and robots.txt with an AI-bot allowlist. See /compare for the feature matrix.
- Honest delivery status: a paid webhook issues the key, emails it to the checkout address, and records a delivery event. A failed transport is persisted in mail_outbox and retried by POST /api/cron/mail-outbox; guest checkout and a mismatched login email can request a re-send at /license. The key is also visible at /account/licenses. Delivery, consent and error events are logged with hashed emails; see docs/legal-data-map.md.

## Pricing & plans
- [Pricing](${SITE}/pricing): Free demo, $249 one-time Buyout ($174 during Black Friday), $19/mo Care ($13/mo during Black Friday), and custom 1:1 development. See subscription rules on the page.
- Checkout on this site is processed by **Waffo Pancake** (Merchant of Record: global payments, tax and compliance without a company entity). Generated projects can switch gateways in the Builder. Webhooks use RSA-SHA256 verification of \`X-Waffo-Signature\` over \`\${t}.\${rawBody}\`; one webhook route: \`POST /api/webhook\`.
- Download entitlement: \`POST /api/generate\` requires an offline HMAC license key (issued automatically on a paid Waffo webhook) or an active subscription / email auto-claim; otherwise HTTP 402. The source ZIP IS the product, so anonymous visitors never receive it. Buyers redeem keys at /license. Anonymous visitors may take a free source-free preview from \`POST /api/generate/preview\` (file inventory + design tokens). This gate protects make1day.dev's site only — generated customer projects ship with it disabled.
- Configuration self-check: \`GET /api/payments/self-check\` reports missing Waffo and license settings without exposing secrets.
- Custom development is a separate service, not a self-checkout plan: it is scoped in a free 30-minute 1:1 call, quoted as a fixed price before work starts, with no automatic charge and no obligation.

## Custom 1:1 service
- Custom components, themes and industry templates; private deployment, SSO and infrastructure integration; AI / RAG wired to your own data; migrations, code audits and compliance work.
- Entry point: the "Book a 1:1 call" CTA on the pricing page (configurable booking link, with an email fallback).

## Support, email and account recovery (this site's runtime)
- [Support](${SITE}/support): a real, submittable contact form (zod-validated, honeypot + per-IP/visitor rate limit). A ticket is stored in Supabase (migration 0010_support_tickets.sql, RLS: owner or operator reads) or the local SQLite \`support_tickets\` table. The original mailto: address and 1:1 booking link stay as fallbacks. Operators review and change status at /admin/tickets (operator session or Supabase admin/staff role).
- Transactional email: the \`lib/mail\` module sends five five-language templates (verify email, password reset, ticket acknowledgement, new-ticket operator notice, license key delivery) via \`MAIL_PROVIDER=resend\` (Resend REST, zero dependencies), \`webhook\` (custom HTTP mailer) or \`none\` (safe logged no-op). \`GET /api/mail/self-check\` returns CONFIGURATION STATE ONLY, never secret values. \`MAIL_PROVIDER=smtp\` is a reserved, NOT-IMPLEMENTED value — there is no nodemailer dependency; installing it and adding a dynamic-import adapter is left to the operator (docs/email.md).
- The code only SENDS mail. SPF / DKIM / DMARC, a dedicated sending subdomain, suppression lists and warm-up are DNS / provider-side work that decides inbox placement — see docs/email.md for the full checklist and Resend domain-verification steps. Resend endpoint/field names and Supabase Auth redirect/email-template details are 需按服务商文档核对.
- Password reset + email verification: /forgot-password, /reset-password, /verify-email (linked from /login). Supabase path uses \`resetPasswordForEmail\` / \`verifyOtp\` / \`updateUser\` / \`resend\`; the local SQLite path stores one-time, expiring tokens ONLY as SHA-256 hashes (\`password_resets\` / \`email_verifications\`) and scrypt password hashes. All "send" endpoints return the SAME generic success copy (no user enumeration). A local password sign-in consumer exists (lib/local-auth.ts, /api/auth/local, hash-only sessions in local_sessions), so reset passwords can actually be used. The local path is still NOT equivalent to Supabase Auth: no MFA, no OAuth, no session rotation or refresh.
- These three areas (mail, support tickets, auth recovery) are make1day.dev-site-only: present in this repo's runtime but pruned from every generated customer ZIP; the corresponding nav/footer/login/admin links are rewritten out of the customer package.

## Key pages
- [Home](${SITE}/): overview and feature list.
- [Builder](${SITE}/builder): configure and download your scaffold (with AGENTS.md + design.md + scoped rules + 16 skills).
- [Templates](${SITE}/templates): live previews of sites generated by each starter template.
- [Pricing](${SITE}/pricing): plans, subscription rules and the 1:1 custom service.
- [Blog](${SITE}/blog): guides on building, billing and launching a SaaS with Next.js.
- [FAQ](${SITE}/faq): how to build a SaaS with Next.js, auth, billing, AI, deployment, licensing.
- [Support](${SITE}/support): submittable contact form plus mailto / booking fallbacks.
- [Compare](${SITE}/compare): make1day.dev vs ShipFast, Makerkit, Supastarter — including AGENTS.md/design.md, scoped rules, ai:docs, MCP, llms.txt, hybrid RAG, i18n and MoR rows.
- [License](${SITE}/license): redeem a license key to unlock source downloads (noindex).
- [Privacy](${SITE}/privacy) and [Terms](${SITE}/terms): full data map (SQLite/Supabase tables, cookies, sub-processors, retention, rights); all entity/mailbox/domain values come from lib/env.ts. Refund window is 14 days from purchase.
- [RAG demo](${SITE}/rag): ingest a document and ask questions with citations (noindex demo page).
- /account and /admin: private user / operator consoles (noindex, disallowed in robots.txt, not in the sitemap).

## Editorial content (human readers + answer engines)
All ${POSTS.length} articles and all ${FAQ_COUNT} FAQ entries are published under the company name **make1day.dev**. Every article has a visible FAQ backed by FAQPage JSON-LD, a BlogPosting + BreadcrumbList graph, canonical/hreflang metadata, and a plain-text Markdown variant at /blog/<slug>/md?lang=xx that AI crawlers can read without rendering React.

${BLOG_INDEX}

- [Blog index](${SITE}/blog): CollectionPage + ItemList JSON-LD with category chips and cross-links to /faq, /compare and /templates.
- [FAQ](${SITE}/faq): ${FAQ_COUNT} verified answers in English and 中文 (other languages fall back to English) on licensing, payment gateways, white-labelling, AI quotas, refunds, SMTP support and the limits we do not hide; FAQPage JSON-LD is emitted in the page's own language.
- Markdown variants are listed in /sitemap.xml and explicitly allowed in robots.txt. Legacy article slugs still resolve but always canonicalise to the current slug.

## Machine-readable surface (for agents)
- [llms-full.txt](${SITE}/llms-full.txt): long-form facts — full BuilderConfig enum, pruning rules, hybrid RAG parameters, Pancake protocol, license-gate order, HTTP API summary and honest limitations.
- [OpenAPI 3.1 contract](${SITE}/openapi.json): request/response schemas for every public API route, including POST /api/generate, its 402 paywall, the MCP JSON-RPC endpoint and the BuilderConfig JSON Schema.
- [MCP endpoint](${SITE}/api/mcp): stateless JSON-RPC 2.0 with tools get_product_info, get_builder_config, scaffold_project and get_agent_delivery, plus resources/list and resources/read for llms.txt / llms-full.txt / openapi.json. scaffold_project returns a validated BuilderConfig plus the exact /api/generate POST body; includeZip=true returns the ZIP as base64 behind the same license gate. No sampling, prompts, logging, completions, subscriptions or SSE. A stdio bridge (scripts/mcp-server.mjs) connects Cursor and Claude Code. See docs/mcp.md.
- [Markdown variants](${SITE}/blog): append \`?format=md\` to any public page for a plain-text digest, or fetch /blog/<slug>/md?lang=xx for the full article. [Agent card](${SITE}/.well-known/agent-card.json) declares the agent-facing endpoints and their honest limitations. npm run agents:lint verifies the generated AGENTS.md / scoped-rule / skills contract.
- [Builder](${SITE}/builder) and the machine-readable routes are crawlable; robots.txt explicitly allows them, the machine-readable routes and /api/mcp for AI crawlers.
- /sitemap.xml lists indexable pages, localized path-prefixed variants (/zh/… /ja/… /fr/… /de/…) and the machine-readable endpoints. /api/payments/self-check reports live configuration readiness without secrets; /api/mail/self-check reports mail provider readiness without secrets.
- New HTTP endpoints (full schema in /openapi.json): POST/GET /api/support/tickets, PATCH /api/support/tickets/{id} (operator only), POST /api/auth/password-reset (request + confirm), POST/GET /api/auth/verify-email (send + confirm), GET /api/mail/self-check.
- Generated-template build matrix: 20 cases in .github/workflows/generated-matrix.yml, each downloading a real ZIP and asserting AGENTS.md, scoped rules, Cursor rules, 16 skills, ai:docs and both consoles' pruning / dead-link rewrites before running tsc --noEmit inside it (docs/build-matrix.md).
- These site-only endpoints are excluded from customer ZIPs; downloaded projects ship their own AGENTS.md, design.md, ai/rules/*, .cursor/rules/*, CLAUDE.md and skills/* instead.

## Documentation
- Transactional email, DNS (SPF / DKIM / DMARC / subdomain isolation / anti-spam) and Resend domain verification: docs/email.md — a durable retry queue (mail_outbox) now exists; SMTP is still NOT implemented and deliverability remains DNS/provider-side work.
- Waffo protocol reference: docs/waffo.md — the two incompatible Waffo products (Pancake vs Acquiring), RSA request signing, webhook verification, event mapping and license issuance.
- Waffo Pancake go-live runbook: docs/waffo-launch-checklist.md — dashboard field mapping, env template, test-to-prod switch, end-to-end drill and troubleshooting.
- Fill-in env template: .env.waffo-pancake.example; static preflight: node scripts/waffo-preflight.mjs --strict.
- Agent discovery / GEO design notes: docs/agent-discovery.md. MCP tool reference: docs/mcp.md. Agent-native delivery spec: docs/agent-native.md. Generated-template CI: docs/build-matrix.md. User + admin consoles: docs/consoles.md — routes, guards, data sources, pruning and go-live checks.
- 2026 competitor and differentiation review: docs/competitive-analysis.md — price bands, capability matrix, real vs fake differentiators, prioritised feature roadmap.
- Payment configuration guide (Waffo default; Stripe, Creem, PayPal, Lemon Squeezy, none): docs/payments.md, also available in Chinese, Japanese, French and German.
- Payment verification runbook: docs/payment-testing.md — four-layer test strategy, sandbox settings for all six gateways, idempotency/failure-injection matrix, and the offline signature probe (npm run probe:webhook).
- Legal data inventory and pre-launch checklist: docs/legal-data-map.md — every table/field mapped to its purpose and legal basis. A retention cron job, consent / delivery / error audit logs, data export / erasure endpoints and a fill-in DPA template exist; the host scheduler wiring, a signed DPA and the MIT vs paid-build decision remain pre-launch work.
- Site + generated-template architecture and modularisation review: docs/architecture.md — module map, ZIP pipeline, strengths, coupling hot spots and a suggested refactor order.
- Generated-template AI docs: root AGENTS.md, design.md, ai/rules/*.md scoped rules, .cursor/rules/*.mdc, CLAUDE.md and up to 16 skills/*.md are inside each downloaded ZIP; regenerate them with npm run ai:docs.
- Hybrid RAG: lib/rag/{embed,vector,hybrid,retrieve}.ts + supabase/migrations/0002_rag.sql (pgvector + tsvector + SQL-side RRF).

## Languages
- Available in English, 中文, 日本語, Français and Deutsch (path prefixes like /zh/pricing, or the language switcher).

## Source & brand
- Author / publisher (company name): make1day.dev. All guides and FAQ answers on this site are published under this company name.
- Canonical domain: set NEXT_PUBLIC_SITE_URL to the real domain before launch; no repository URL is published yet.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
