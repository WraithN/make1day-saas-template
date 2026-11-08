import { type NextRequest } from "next/server";
import {
  buildPostMarkdown,
  getAllPosts,
  getPost,
  postContentLang,
  postField,
} from "@/lib/content/blog";
import { faqContent } from "@/lib/content/faq";
import type { Lang } from "@/lib/i18n-core";

/**
 * `?format=md` GEO surface. middleware.ts rewrites any public page carrying
 * `?format=md` here, so crawlers can ask for a plain-text representation of
 * the exact URL they found instead of parsing rendered HTML.
 *
 * Scope is deliberately explicit: articles and the FAQ are rendered from the
 * SAME structured content as the visible page; marketing pages get a short,
 * factual digest (not a claimed full HTML→Markdown conversion). Anything not
 * in the allowlist returns 404 rather than an empty document.
 *
 * Site-only: pruned from customer ZIPs (see lib/generator/prune.ts).
 */
export const dynamic = "force-dynamic";

const COMPANY = "marketit";
const LANGS: readonly string[] = ["en", "zh", "ja", "fr", "de"];

type Digest = { title: string; summary: string; facts: string[] };

const PAGE_DIGESTS: Record<string, Digest> = {
  "/": {
    title: "Configurable AI SaaS starter delivered as a white-label ZIP",
    summary:
      "Pick auth, payment gateway, AI providers, features, deploy target and visual style; the server returns a source ZIP containing only the selected modules.",
    facts: [
      "The ZIP is the product: a paid entitlement (offline license key, active subscription or a claimed email license) is required for the full source download.",
      "Anonymous visitors may request a source-free preview: the build's file inventory plus design tokens.",
      "Six payment adapters share one checkout/webhook contract: Waffo Pancake (default), Waffo Acquiring, Stripe, Creem, PayPal and Lemon Squeezy.",
      "Storage switches between Supabase and local SQLite purely by SUPABASE_SERVICE_ROLE_KEY; all five UI languages (EN/ZH/JA/FR/DE) ship with every build.",
      "18 representative configurations are downloaded, pruned and type-checked in the build matrix; 11 visual styles are available.",
      "Generated customer projects contain no generator factory, no operator marketing pages and no operator brand strings.",
    ],
  },
  "/pricing": {
    title: "Plans and licensing",
    summary:
      "A one-time source licence plus an optional monthly care plan. Displayed amounts are configurable through NEXT_PUBLIC_PRICE_*_DISPLAY.",
    facts: [
      "Cancelling the care plan never revokes a source licence that was already delivered.",
      "Refunds use a plain 14-day window; delivery events are logged for evidence but are not a refund condition.",
      "Custom development is a separately scoped, fixed-quote service with no automatic charge.",
    ],
  },
  "/compare": {
    title: "Comparison with other starters",
    summary:
      "The differentiator is configuration-driven pruning plus white-label ZIP delivery, not a longer list of AI features.",
    facts: [
      "Streaming chat, multi-provider models, token quotas, RAG, MCP and llms.txt are baseline in the 2026 AI-starter category.",
      "This product adds 18-case real pruning, six gateways, five languages, dual backends and a fail-safe paid gate.",
    ],
  },
  "/styles": {
    title: "Visual style playground",
    summary:
      "11 selectable styles, each with locked colour tokens, radius, texture rules and a matching design.md in the generated project.",
    facts: [
      "The hand-drawn doodle style is the 11th theme and has its own matrix case.",
      "Only the chosen stylesheet ships in the customer ZIP.",
    ],
  },
  "/agent-ready": {
    title: "Agent-native and answer-engine surfaces",
    summary:
      "Machine-readable entry points for coding agents, crawlers and answer engines.",
    facts: [
      "/llms.txt and /llms-full.txt describe the product and its honest limits.",
      "/openapi.json is an OpenAPI 3.1 contract; /api/mcp exposes JSON-RPC tools.",
      "Every article has a /blog/<slug>/md Markdown variant, and any public page supports ?format=md.",
      "/.well-known/agent-card.json advertises the agent-facing capabilities.",
    ],
  },
  "/license": {
    title: "Redeem or recover a license key",
    summary:
      "Paste an offline key to unlock the full ZIP, or request a re-send to the checkout address if the key email was lost.",
    facts: [
      "Paid webhooks issue the key and email it automatically; failed deliveries are retried from a durable mail outbox.",
      "The claim form never reveals whether an address has a licence (anti-enumeration).",
    ],
  },
  "/privacy": {
    title: "Privacy policy",
    summary:
      "The policy is written against docs/legal-data-map.md, which inventories every table, cookie and third-party call.",
    facts: [
      "Signed-in users can export their data and request erasure through /api/privacy/export and /api/privacy/erase.",
      "A retention cron endpoint deletes time-bounded records; order and licence rows are kept for accounting.",
    ],
  },
  "/terms": {
    title: "Terms and refund rules",
    summary:
      "The charge covers the configured build and its delivery service; the generator itself is not part of the ZIP.",
    facts: [
      "Refunds use a plain 14-day window in all five languages.",
      "The repository licence is MIT; restricting redistribution of delivered copies is a separate licensing decision.",
    ],
  },
  "/support": {
    title: "Support and contact",
    summary:
      "A ticket form and a contact channel; GDPR-style export and erasure requests are handled through the privacy endpoints.",
    facts: [
      "With MAIL_PROVIDER=none no mail is delivered; the self-check reports this explicitly.",
    ],
  },
};

function digestMarkdown(path: string, digest: Digest): string {
  return [
    `# ${digest.title}`,
    "",
    `> ${digest.summary}`,
    "",
    `- Page: ${path}`,
    `- Publisher: ${COMPANY} (company)`,
    `- Format: Markdown digest (structured facts, not a full HTML conversion)`,
    "",
    "## Key facts",
    "",
    ...digest.facts.map((f) => `- ${f}`),
    "",
    "## Machine-readable sources",
    "",
    "- /llms.txt",
    "- /llms-full.txt",
    "- /openapi.json",
    "- /.well-known/agent-card.json",
    "",
  ].join("\n");
}

function faqMarkdown(lang: Lang): string {
  const c = faqContent[lang] ?? faqContent.en;
  const contentLang = faqContent[lang] ? lang : "en";
  return [
    `# ${c.heading}`,
    "",
    `> ${c.subtitle}`,
    "",
    `- Page: /faq`,
    `- Publisher: ${COMPANY} (company)`,
    `- Language: ${contentLang}`,
    `- Questions: ${c.items.length}`,
    "",
    ...c.items.flatMap((it) => [`## ${it.q}`, "", it.a, ""]),
  ].join("\n");
}

function blogIndexMarkdown(lang: Lang): string {
  const posts = getAllPosts();
  return [
    "# Articles",
    "",
    `- Publisher: ${COMPANY} (company)`,
    `- Articles: ${posts.length}`,
    "- Page: /blog",
    "",
    ...posts.flatMap((p) => [
      `## ${postField(p, lang, "title")}`,
      "",
      `> ${postField(p, lang, "excerpt")}`,
      "",
      `- Canonical: /blog/${p.slug}`,
      `- Markdown: /blog/${p.slug}/md`,
      `- Published: ${p.date}`,
      `- Category: ${p.category}`,
      `- Tags: ${p.tags.join(", ")}`,
      "",
    ]),
  ].join("\n");
}

function notFound(): Response {
  return new Response(
    "# Not found\n\nThis URL has no Markdown variant. See /llms.txt.\n",
    { status: 404, headers: { "Content-Type": "text/markdown; charset=utf-8" } },
  );
}

export async function GET(req: NextRequest) {
  const path = (req.nextUrl.searchParams.get("path") ?? "/").replace(/\/+$/, "") || "/";
  const raw = req.nextUrl.searchParams.get("lang") ?? "en";
  const lang: Lang = (LANGS.includes(raw) ? raw : "en") as Lang;

  let body: string | null = null;
  let contentLang: Lang = lang;

  if (path === "/faq") {
    body = faqMarkdown(lang);
    contentLang = faqContent[lang] ? lang : "en";
  } else if (path === "/blog") {
    body = blogIndexMarkdown(lang);
  } else if (path.startsWith("/blog/")) {
    const post = getPost(path.slice("/blog/".length));
    if (!post) return notFound();
    body = buildPostMarkdown(post, lang, COMPANY);
    // buildPostMarkdown resolves the body language internally; mirror it here.
    contentLang = postContentLang(post, lang);
  } else if (PAGE_DIGESTS[path]) {
    body = digestMarkdown(path, PAGE_DIGESTS[path]);
    contentLang = "en";
  } else {
    return notFound();
  }

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Language": contentLang,
      // Point at the human page so this variant is not indexed as a duplicate.
      Link: `<${path}>; rel="canonical"`,
      Vary: "Accept",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
