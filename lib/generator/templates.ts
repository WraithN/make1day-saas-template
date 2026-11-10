// Render the generated template's .env.example, README.md and shipkit.config.json
// from a BuilderConfig. The generated project is the SAME source as make1day, but
// pre-configured to exactly the user's selections.

import type { BuilderConfig } from "./config";
import { SKILL_OPTIONS, slugify } from "./config";
import { PALETTES } from "./themes";
import { skillFiles } from "./prune";

export function buildEnvExample(c: BuilderConfig): string {
  const lines: string[] = [];
  const app = slugify(c.appName);

  lines.push(`# ─────────────────────────────────────────────────────────────`);
  lines.push(`# ${app}`);
  lines.push(`# Copy this file to \`.env.local\` and fill in real values.`);
  lines.push(`# Build works with NONE of these set (clients are created lazily).`);
  lines.push(`# ─────────────────────────────────────────────────────────────`);
  lines.push(``);
  lines.push(`# ── Supabase (required for auth) ─────────────────────────────`);
  lines.push(`NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co`);
  lines.push(`NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key`);
  lines.push(`# Service role key — SERVER ONLY, never expose to the browser.`);
  lines.push(`SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`);
  lines.push(``);

  lines.push(`# ── Auth / OAuth ─────────────────────────────────────────────`);
  const oauth = c.auth.length ? c.auth.join(",") : "google";
  lines.push(
    `# Buttons shown on /login (enable these in Supabase dashboard too).`,
  );
  lines.push(`NEXT_PUBLIC_OAUTH_PROVIDERS=${oauth}`);
  lines.push(``);

  const payments = c.payment.filter((p) => p !== "none");
  if (payments.length) {
    lines.push(`# ── Payment provider ─────────────────────────────────────────`);
    lines.push(`PAYMENT_PROVIDER=${payments.join(",")}`);
    lines.push(``);
    if (payments.includes("stripe")) {
      lines.push(`STRIPE_SECRET_KEY=sk_test_xxx`);
      lines.push(`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx`);
      lines.push(`STRIPE_WEBHOOK_SECRET=whsec_xxx`);
      lines.push(`# Buyout = one-time price, Care = recurring monthly price.`);
      lines.push(`STRIPE_PRICE_ID_BUYOUT=price_xxx`);
      lines.push(`STRIPE_PRICE_ID_CARE=price_xxx`);
      lines.push(`# Legacy fallbacks (PRO -> Buyout, SCALE -> Care).`);
      lines.push(`# STRIPE_PRICE_ID_PRO=price_xxx`);
      lines.push(`# STRIPE_PRICE_ID_SCALE=price_xxx`);
    }
    if (payments.includes("creem")) {
      lines.push(`CREEM_API_KEY=creem_xxx`);
      lines.push(`CREEM_WEBHOOK_SECRET=whsec_xxx`);
      lines.push(`CREEM_ENV=test                      # test | live`);
      lines.push(`# PRO slot = one-time Buyout, SCALE slot = recurring Care.`);
      lines.push(`CREEM_PRICE_ID_PRO=prod_xxx`);
      lines.push(`CREEM_PRICE_ID_SCALE=prod_xxx`);
    }
    if (payments.includes("paypal")) {
      lines.push(`PAYPAL_CLIENT_ID=xxx`);
      lines.push(`PAYPAL_CLIENT_SECRET=xxx`);
      lines.push(`PAYPAL_WEBHOOK_ID=WH-xxx`);
      lines.push(`PAYPAL_ENV=sandbox                  # sandbox | live`);
      lines.push(`PAYPAL_PLAN_ID_PRO=P-xxx`);
      lines.push(`PAYPAL_PLAN_ID_SCALE=P-xxx`);
    }
    if (payments.includes("waffo")) {
      // Waffo Pancake (MoR). The adapter also supports the separate
      // "acquiring" product via WAFFO_FLAVOR — see docs/waffo.md.
      lines.push(`WAFFO_FLAVOR=pancake                # pancake | acquiring`);
      lines.push(`WAFFO_ENVIRONMENT=test             # test | prod`);
      lines.push(`WAFFO_STORE_SLUG=your-store-slug`);
      lines.push(`# Or use signed API-Key auth instead of the public store slug:`);
      lines.push(`# WAFFO_MERCHANT_ID=MER_xxx`);
      lines.push(`# WAFFO_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----"`);
      lines.push(`WAFFO_API_BASE=https://api.waffo.ai`);
      lines.push(`WAFFO_CHECKOUT_PATH=/v1/actions/checkout/create-session`);
      lines.push(`# The price id IS the Pancake product id.`);
      lines.push(`WAFFO_PRICE_ID_BUYOUT=PROD_xxx     # one-time product`);
      lines.push(`WAFFO_PRICE_ID_CARE=PROD_xxx       # monthly subscription product`);
      lines.push(`# Webhook RSA public keys (Dashboard -> Settings -> Webhooks).`);
      lines.push(`WAFFO_WEBHOOK_PUBLIC_KEY_TEST="-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----"`);
      lines.push(`WAFFO_WEBHOOK_PUBLIC_KEY_PROD="-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----"`);
      lines.push(`# Legacy fallbacks (PRO -> Buyout, SCALE -> Care).`);
      lines.push(`# WAFFO_PRICE_ID_PRO=xxx`);
      lines.push(`# WAFFO_PRICE_ID_SCALE=xxx`);
    }
    if (payments.includes("lemonsqueezy")) {
      lines.push(`LEMONSQUEEZY_API_KEY=xxx`);
      lines.push(`LEMONSQUEEZY_WEBHOOK_SECRET=whsec_xxx`);
      lines.push(`LEMONSQUEEZY_STORE_ID=xxx`);
      lines.push(`# Variant ids serve the same role as price ids for this gateway.`);
      lines.push(`LEMONSQUEEZY_VARIANT_ID_BUYOUT=xxx`);
      lines.push(`LEMONSQUEEZY_VARIANT_ID_CARE=xxx`);
    }
    lines.push(``);
  }

  if (c.ai.length) {
    lines.push(`# ── AI providers ─────────────────────────────────────────────`);
    lines.push(`# Default provider used by /api/ai.`);
    lines.push(`AI_PROVIDER=${c.ai[0]}`);
    lines.push(``);
    if (c.ai.includes("openai")) {
      lines.push(`OPENAI_API_KEY=sk-xxx`);
      lines.push(`OPENAI_BASE_URL=https://api.openai.com/v1`);
      lines.push(`OPENAI_MODEL=gpt-4o-mini`);
    }
    if (c.ai.includes("anthropic")) {
      lines.push(`ANTHROPIC_API_KEY=sk-ant-xxx`);
      lines.push(`ANTHROPIC_MODEL=claude-3-5-sonnet-latest`);
    }
    if (c.ai.includes("gemini")) {
      lines.push(`GEMINI_API_KEY=xxx`);
      lines.push(`GEMINI_MODEL=gemini-1.5-flash`);
    }
    if (c.ai.includes("mistral")) {
      lines.push(`MISTRAL_API_KEY=xxx`);
      lines.push(`MISTRAL_BASE_URL=https://api.mistral.ai/v1`);
      lines.push(`MISTRAL_MODEL=mistral-large-latest`);
    }
    if (c.ai.includes("cohere")) {
      lines.push(`COHERE_API_KEY=xxx`);
      lines.push(`COHERE_BASE_URL=https://api.cohere.ai/v2`);
      lines.push(`COHERE_MODEL=command-r-plus`);
    }
    if (c.ai.includes("xai")) {
      lines.push(`XAI_API_KEY=xxx`);
      lines.push(`XAI_BASE_URL=https://api.x.ai/v1`);
      lines.push(`XAI_MODEL=grok-2-latest`);
    }
    if (c.ai.includes("perplexity")) {
      lines.push(`PERPLEXITY_API_KEY=xxx`);
      lines.push(`PERPLEXITY_BASE_URL=https://api.perplexity.ai`);
      lines.push(`PERPLEXITY_MODEL=sonar`);
    }
    if (c.ai.includes("ollama")) {
      lines.push(`# Local Ollama — no key required by default.`);
      lines.push(`OLLAMA_API_KEY=`);
      lines.push(`OLLAMA_BASE_URL=http://localhost:11434/v1`);
      lines.push(`OLLAMA_MODEL=llama3.1`);
    }
    lines.push(``);
  }

  if (c.features.includes("rag")) {
    lines.push(`# ── RAG hybrid retrieval (BM25 + embeddings, RRF fusion) ─────`);
    lines.push(`# OpenAI-compatible /embeddings. Falls back to OPENAI_API_KEY, so one`);
    lines.push(`# key enables chat + semantic search. With no key RAG uses BM25 only.`);
    lines.push(`# EMBEDDING_API_KEY=sk-xxx`);
    lines.push(`# EMBEDDING_BASE_URL=https://api.openai.com/v1`);
    lines.push(`# EMBEDDING_MODEL=text-embedding-3-small`);
    lines.push(`# EMBEDDING_DIMENSIONS=1536   # must match 0002_rag.sql vector(1536)`);
    lines.push(`# memory (default) | supabase — supabase also needs SUPABASE_SERVICE_ROLE_KEY`);
    lines.push(`RAG_VECTOR_STORE=memory`);
    lines.push(``);
  }

  lines.push(`# ── Site ─────────────────────────────────────────────────────`);
  lines.push(`NEXT_PUBLIC_SITE_URL=http://localhost:3000`);
  lines.push(``);
  lines.push(`# ── Custom 1:1 enquiries / analytics / admin ─────────────────`);
  lines.push(`# Leave BOOKING_URL empty to fall back to a prefilled email.`);
  lines.push(`NEXT_PUBLIC_BOOKING_URL=`);
  lines.push(`NEXT_PUBLIC_CONTACT_EMAIL=hello@example.com`);
  lines.push(`# NEXT_PUBLIC_GA_ID=G-XXXXXXX`);
  lines.push(`# Set BEFORE deploying: /admin and /api/stats are open without them.`);
  lines.push(`# ADMIN_USER=admin`);
  lines.push(`# ADMIN_PASSWORD=change-me`);
  lines.push(`# Optional role allowlist: when set AND Supabase is configured, /admin`);
  lines.push(`# requires a signed-in user whose email is in this list (on top of Basic Auth).`);
  lines.push(`# ADMIN_EMAILS=you@example.com,ops@example.com`);
  lines.push(``);
  lines.push(`# ── Local database (the fallback store) ──────────────────────`);
  lines.push(`# Licenses, orders, pageviews, traffic events, operator accounts,`);
  lines.push(`# sessions AND the user directory with roles live in one local SQLite`);
  lines.push(`# database (Node's built-in \`node:sqlite\` — no native dependency).`);
  lines.push(`# The file is created on first use; SQLITE_PATH relocates it.`);
  lines.push(`# SQLITE_PATH=.data/shipkit.db`);
  lines.push(`# Without SUPABASE_SERVICE_ROLE_KEY the admin console reads and writes`);
  lines.push(`# accounts + roles here. Set the service-role key above to move them`);
  lines.push(`# to Supabase Auth + the \`profiles\` table — no code change. Migrate`);
  lines.push(`# the local roles first: npm run export:profiles`);
  lines.push(``);
  lines.push(`# ── Demo / mock login ───────────────────────────────────────`);
  lines.push(`# Kept OFF. Once Supabase is configured demo mode is disabled anyway.`);
  lines.push(`# In production (next start) the AI/RAG endpoints answer 401 until Supabase`);
  lines.push(`# is configured OR both flags below are flipped on purpose (never do this`);
  lines.push(`# on a real deployment - it is a one-cookie login backdoor).`);
  lines.push(`# NEXT_PUBLIC_ENABLE_DEMO is inlined at BUILD time: rebuild after changing.`);
  lines.push(`NEXT_PUBLIC_ENABLE_DEMO=false`);
  lines.push(``);
  lines.push(`# ── License gate (source download paywall) ──────────────────────`);
  lines.push(`# This generated project ships with the gate OFF. Set LICENSE_SECRET +`);
  lines.push(`# LICENSE_GATE=on only if you also sell downloads from your own site.`);
  lines.push(`LICENSE_GATE=off`);
  lines.push(`# LICENSE_SECRET=`);
  lines.push(`# FREE_GENERATIONS_PER_DAY=1`);
  lines.push(``);

  return lines.join("\n");
}

export function buildReadme(c: BuilderConfig): string {
  const app = slugify(c.appName);
  const title = c.appName.trim() || "My SaaS";
  const prov = c.payment.filter((p) => p !== "none").join(", ") || "none";
  const aiList = c.ai.length ? c.ai.join(", ") : "none";

  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push(``);
  lines.push(
    `A production-ready AI SaaS starter for **${title}** — ` +
      `auth, payments, one real AI feature, a clean admin. Clone it, fill env, launch.`,
  );
  lines.push(``);
  lines.push(
    `> **Your site, not a template demo.** The home and pricing pages are ` +
      `generated for **${c.appName}** from your selections — no starter-vendor ` +
      `branding, competitor comparisons or placeholder marketing posts. Edit ` +
      `the \`app.*\` copy in \`lib/i18n-core.ts\` and the plan data in ` +
      `\`app/pricing/page.tsx\`. \`/privacy\` and \`/terms\` are placeholders: ` +
      `replace them with your own legal text before launch.`,
  );
  lines.push(
    `> To rename the app everywhere, run ` +
      `\`npm run rebrand -- "Your Brand"\` (also rewrites the LICENSE copyright line).`,
  );
  lines.push(``);
  lines.push(`## What's in this build`);
  lines.push(``);
  lines.push(`| Choice | Selection |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Auth | ${c.auth.join(", ") || "—"} |`);
  lines.push(`| Payments | ${prov} |`);
  lines.push(`| AI | ${aiList} |`);
  lines.push(`| Features | ${c.features.join(", ") || "—"} |`);
  lines.push(`| Style | ${c.style} |`);
  lines.push(`| Deploy | ${c.deploy} |`);
  lines.push(
    `| Skills | ${c.skills.join(", ") || "—"} |`,
  );
  lines.push(``);

  lines.push(`## Quick start`);
  lines.push(``);
  lines.push("```bash");
  lines.push(`# 1. install`);
  lines.push(`npm install`);
  lines.push(``);
  lines.push(`# 2. configure`);
  lines.push(`cp .env.example .env.local`);
  lines.push(`#   → fill Supabase + your selected providers`);
  lines.push(``);
  lines.push(`# 3. database (run supabase/migrations/0001_init.sql in Supabase SQL editor)`);
  lines.push(``);
  lines.push(`# 4. run`);
  lines.push(`npm run dev`);
  lines.push("```");
  lines.push(``);
  lines.push(`Visit http://localhost:3000.`);
  lines.push(``);

  lines.push(`## Agent-native delivery (read first)`);
  lines.push(``);
  lines.push(`This project is generated for **AI coding agents**, not just humans. Point your`);
  lines.push(`assistant (Cursor / Claude Code / Codex / WorkBuddy) at the root contract:`);
  lines.push(``);
  lines.push(`| Path | Consumer | What it locks |`);
  lines.push(`| --- | --- | --- |`);
  lines.push(`| \`AGENTS.md\` | Every agent | This build's selections, commands, server/client boundary, scoped-rule index, definition of done |`);
  lines.push(`| \`design.md\` | Every agent | The **${c.style}** visual system: colour tokens, hex references, typography, radius \`${PALETTES[c.style].radius}\`, \`${PALETTES[c.style].texture}\` texture, responsive + a11y rules |`);
  lines.push(`| \`ai/rules/*.md\` | Glob-aware agents | Scoped rules with \`globs\` frontmatter — load only the rule matching the files you edit |`);
  lines.push(`| \`.cursor/rules/*.mdc\` | Cursor | Same rules in Cursor's native format |`);
  lines.push(`| \`CLAUDE.md\` | Claude Code | Imports \`AGENTS.md\`, \`design.md\`, rules and skills |`);
  lines.push(`| \`skills/*.md\` | Any agent | Focused playbooks, one per concern |`);
  lines.push(``);
  lines.push("```bash");
  lines.push(`npm run ai:docs    # rebuild ALL of the above from shipkit.config.json`);
  lines.push(`npm run ai:setup   # refresh .cursor/rules + CLAUDE.md only`);
  lines.push("```");
  lines.push(``);
  lines.push(`Edit \`shipkit.config.json\` (the source of truth), then run \`ai:docs\` —`);
  lines.push(`never hand-edit the generated files. See \`ai/README.md\` for details.`);
  lines.push(``);

  const hasAccount = c.features.includes("account");
  const hasAdmin = c.features.includes("admin");
  if (hasAccount || hasAdmin) {
    lines.push(`## Consoles`);
    lines.push(``);
    lines.push(`| Route | Audience | What it shows |`);
    lines.push(`| --- | --- | --- |`);
    if (hasAccount) {
      lines.push(`| \`/account\` | Signed-in users | Overview, billing, licenses and settings (read-only starter) |`);
    }
    if (hasAdmin) {
      lines.push(`| \`/admin\` | Operators | Users, issued licenses, traffic and runtime status |`);
    }
    lines.push(``);
    lines.push(`Both are Server Components with a shared console shell in \`components/console/\``);
    lines.push(`and five-language copy in \`lib/content/console.ts\`. \`/account\` is gated by the`);
    lines.push(`Supabase session in \`middleware.ts\`; \`/admin\` uses HTTP Basic Auth plus the`);
    lines.push(`optional \`ADMIN_EMAILS\` role allowlist. Set \`ADMIN_USER\` / \`ADMIN_PASSWORD\``);
    lines.push(`before deploying — without them \`/admin\` is public.`);
    lines.push(``);
    lines.push(`Data comes from \`lib/console.ts\`: licenses (\`lib/license.ts\`), subscriptions`);
    lines.push(`(\`lib/subscriptions.ts\`) and first-party stats (\`lib/stats.ts\`). With a service-role`);
    lines.push(`key the user list uses Supabase Auth; otherwise it is derived from buyers only.`);
    lines.push(``);
  }

  lines.push(`## Included AI coding skills`);
  lines.push(``);
  lines.push(
    `${c.skills.length} of 12 playbooks were selected in the Builder. Each has ` +
      `\`name\` / \`description\` / \`globs\` frontmatter so an agent can load the right one.`,
  );
  lines.push(``);
  const files = skillFiles();
  if (c.skills.length) {
    lines.push(`| Skill | File |`);
    lines.push(`| --- | --- |`);
    for (const id of c.skills) {
      const opt = SKILL_OPTIONS.find((o) => o.id === id);
      lines.push(`| ${opt?.label ?? id} | \`${files[id]}\` |`);
    }
  } else {
    lines.push(`No skills selected — \`AGENTS.md\` still defines the core rules.`);
  }
  lines.push(``);

  if (c.features.includes("rag")) {
    lines.push(`## RAG module (hybrid retrieval)`);
    lines.push(``);
    lines.push(
      `A working RAG implementation is included — no API key required to try it.`,
    );
    lines.push(``);
    lines.push(`- \`POST /api/rag/ingest\` — body \`{ title, text }\`, splits + indexes a document (embeddings are generated when a key is available).`);
    lines.push(`- \`POST /api/rag/query\` — body \`{ question, provider? }\`, returns \`{ answer, citations, mode, retrieval }\`.`);
    lines.push(`- Both endpoints are **authenticated**: ingest needs a signed-in user (or an operator), query needs a signed-in user with an active subscription (\`401\` / \`402\` otherwise) because every query runs a real LLM. In \`next dev\`, demo mode (no Supabase configured + the \`sk_demo=1\` cookie) counts as signed-in + subscribed. In \`next start\` (production) demo mode is closed by design — it requires BOTH \`NEXT_PUBLIC_ENABLE_DEMO=true\` and \`DEMO_IN_PRODUCTION=true\`, so a deployed site never has a one-cookie login backdoor; configuring Supabase is the intended path.`);
    lines.push(`- Open \`/rag\` for the demo UI (ask questions and ingest your own docs).`);
    lines.push(`- Retrieval is **hybrid**: Okapi BM25 (Latin words + CJK uni/bigrams) **plus** dense embeddings, combined with **Reciprocal Rank Fusion** (RRF, k=60) in \`lib/rag/hybrid.ts\`.`);
    lines.push(`- \`EMBEDDING_*\` (or \`OPENAI_API_KEY\`) enables the vector branch via an OpenAI-compatible \`/embeddings\` endpoint. Without a key it degrades to BM25-only — the demo still works.`);
    lines.push(`- \`RAG_VECTOR_STORE=supabase\` persists vectors and runs the SQL-side RRF through \`supabase/migrations/0002_rag.sql\` (pgvector, tsvector, HNSW, requires \`EMBEDDING_DIMENSIONS=1536\`). The default \`memory\` store is process-local.`);
    lines.push(`- With an AI key, answers are generated with inline \`[n]\` citations; without one it falls back to returning the retrieved passages verbatim.`);
    lines.push(``);
  }

  if (c.deploy === "vercel") {
    lines.push(`## Deploy (Vercel)`);
    lines.push(``);
    lines.push(
      `Push to GitHub and import the repo at vercel.com/new. Set the same env ` +
        `variables from \`.env.local\` in the Vercel project settings, then add your ` +
        `production \`/api/webhook\` URL to the payment provider's webhook settings.`,
    );
    lines.push(``);
  } else if (c.deploy === "cloudflare") {
    lines.push(`## Deploy (Cloudflare Workers / OpenNext)`);
    lines.push(``);
    lines.push(
      `This target uses the OpenNext Cloudflare adapter on Workers with ` +
        `\`nodejs_compat\`, NOT the retired \`@cloudflare/next-on-pages\` edge ` +
        `runtime. Several route handlers explicitly declare a Node.js runtime ` +
        `(\`export const runtime = "nodejs"\`), which next-on-pages rejects at ` +
        `build time; Workers + nodejs_compat runs them.`,
    );
    lines.push(``);
    lines.push("```bash");
    lines.push(`npm i @opennextjs/cloudflare@latest`);
    lines.push(`npm i -D wrangler@latest`);
    lines.push(`cp open-next.config.ts.example open-next.config.ts`);
    lines.push(`npm run deploy`);
    lines.push("```");
    lines.push(``);
    lines.push(
      `A \`wrangler.toml\` is included with \`main = ".open-next/worker.js"\`, ` +
        `the \`.open-next/assets\` binding and \`compatibility_flags = ` +
        `["nodejs_compat"]\`. \`npm run preview\` builds and serves the app in the ` +
        `Workers runtime locally. Set the same env variables from \`.env.local\` ` +
        `as Workers secrets / variables, and point your payment provider's ` +
        `webhook at \`https://<your-domain>/api/webhook\`.`,
    );
    lines.push(``);
    lines.push(
      `**Required for this target:** the local SQLite backend uses ` +
        `\`node:sqlite\` and a writable on-disk file, which Workers does not ` +
        `provide. Configure Supabase (\`SUPABASE_SERVICE_ROLE_KEY\` + migrations) ` +
        `before deploying, otherwise accounts, orders, licences, rate limits ` +
        `and the mail outbox will not persist. The in-memory RAG index is also ` +
        `process-local and will be lost on cold starts — use ` +
        `\`RAG_VECTOR_STORE=supabase\` plus your own durable document store. ` +
        `If you need a fully supported local-first setup, choose the ` +
        `\`selfhost\` target instead.`,
    );
    lines.push(``);
  } else {
    lines.push(`## Deploy (self-host)`);
    lines.push(``);
    lines.push(
      `\`npm run build && npm run start\`. Set the same env variables from ` +
        `\`.env.local\` in your environment, and point your payment provider's ` +
        `webhook at \`https://<your-domain>/api/webhook\`.`,
    );
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(
    `This project was produced from a configurable template. Before launch, ` +
      `replace the placeholder company details in LICENSE, /privacy and /terms.`,
  );
  lines.push(``);

  return lines.join("\n");
}

export function buildConfigJson(c: BuilderConfig): string {
  return JSON.stringify(
    {
      generator: "shipkit",
      version: 1,
      generatedAt: new Date().toISOString(),
      config: c,
    },
    null,
    2,
  );
}

/**
 * Wrangler config for the OpenNext Cloudflare adapter (Workers, not Pages).
 * `nodejs_compat` is mandatory: shipped route handlers use the Node.js
 * runtime (node:crypto, Buffer, streams), which the old edge-only
 * next-on-pages adapter could not run. Verified against Cloudflare's
 * "OpenNext adapter" guide (developers.cloudflare.com, 2026-11).
 */
export function buildWranglerToml(c: BuilderConfig): string {
  const name = slugify(c.appName);
  return `# Cloudflare Workers config for ${c.appName}
# Deploy: npm run deploy  (opennextjs-cloudflare build && deploy)
# Docs: https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/
name = "${name}"
main = ".open-next/worker.js"
compatibility_date = "2024-09-23"
compatibility_flags = [ "nodejs_compat" ]
upload_source_maps = true

[assets]
directory = ".open-next/assets"
binding = "ASSETS"

[observability]
enabled = true
`;
}

/** Example OpenNext config; shipped as .ts.example so `tsc` never needs the
 * adapter installed just to type-check the extracted project. */
export function buildOpenNextConfigExample(): string {
  return `// Copy to open-next.config.ts after installing @opennextjs/cloudflare.
// Source: https://opennext.js.org/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
`;
}
