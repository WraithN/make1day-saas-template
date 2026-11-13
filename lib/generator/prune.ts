// Module-aware pruning for the make1day template generator.
//
// make1day ships a single source tree, but the builder lets users pick which
// pieces they actually want. This module turns those picks into two things:
//   1. a `skip` set of source files that are NOT copied into the zip, and
//   2. tailored replacements for files that must be rewritten to stay valid
//      when optional adapters/branches are removed (payments, AI, dashboard).
//
// The goal: an unselected module is genuinely absent from the downloaded
// project, and the project still type-checks and builds.

import type {
  AiProvider,
  BuilderConfig,
  PaymentProvider,
  SkillId,
} from "./config";

// ── File-level pruning ──────────────────────────────────────────────────────

const PAYMENT_FILES: Record<string, string> = {
  stripe: "lib/payments/stripe.ts",
  creem: "lib/payments/creem.ts",
  paypal: "lib/payments/paypal.ts",
  waffo: "lib/payments/waffo.ts",
  lemonsqueezy: "lib/payments/lemonsqueezy.ts",
};

// Skill id → markdown file shipped in the template's `skills/` folder.
const SKILL_FILES: Record<SkillId, string> = {
  frontend: "skills/frontend-dev.md",
  ui: "skills/ui-design.md",
  backend: "skills/backend-api.md",
  testing: "skills/testing-qa.md",
  seo: "skills/seo-content.md",
  auth: "skills/auth-security.md",
  payments: "skills/payments.md",
  database: "skills/database.md",
  rag: "skills/rag.md",
  i18n: "skills/i18n.md",
  deploy: "skills/deploy.md",
  agents: "skills/agent-workflow.md",
  video: "skills/video.md",
  workflow: "skills/inngest-workflow.md",
  canvas: "skills/pipeline-canvas.md",
  compliance: "skills/payment-compliance.md",
  setup: "skills/setup-env.md",
  grill: "skills/grill-me.md",
};

/** Skill id → globs used by the generated scoped rules. */
export const SKILL_GLOBS: Record<SkillId, string[]> = {
  frontend: ["app/**/*.tsx", "components/**/*.tsx"],
  ui: ["app/globals.css", "components/**/*.tsx"],
  backend: ["app/api/**/*.ts", "lib/**/*.ts"],
  testing: ["**/*.test.ts", "**/*.spec.ts"],
  seo: ["app/**/layout.tsx", "app/sitemap.ts", "app/robots.ts"],
  auth: ["app/login/**", "app/auth/**", "middleware.ts", "lib/supabase/**"],
  payments: ["lib/payments/**", "app/api/checkout/**", "app/api/webhook/**"],
  database: ["supabase/**", "lib/supabase/admin.ts"],
  rag: ["lib/rag/**", "app/api/rag/**", "components/RagDemo.tsx"],
  i18n: ["lib/i18n*.ts", "lib/i18n*.tsx", "components/LanguageSwitcher.tsx"],
  deploy: ["next.config.mjs", "wrangler.toml", "middleware.ts"],
  agents: ["AGENTS.md", "design.md", "ai/**", "skills/**"],
  video: ["lib/video/**", "app/video/**", "app/api/video/**"],
  workflow: ["inngest/**", "app/api/inngest/**", "app/api/pipeline/**", "lib/workflows.ts"],
  canvas: ["app/admin/workflows/**", "components/console/WorkflowCanvas.tsx"],
  compliance: ["contracts/**", "scripts/payment-compliance-check.mjs", "lib/payments/**", "app/api/webhook/**", "app/terms/**", "app/privacy/**"],
  setup: [".env.example", "scripts/setup-doctor.mjs", "scripts/setup-wizard.mjs", "package.json"],
  grill: ["docs/requirements/**", "ai/doc-spec.json", "app/**", "components/**", "lib/**"],
};

/** Skill id → filename, exposed so the doc generator can build a real index. */
export function skillFiles(): Record<string, string> {
  return { ...SKILL_FILES };
}

// RAG feature files — shipped only when the user selects the RAG module.
const RAG_FILES = [
  "lib/rag/types.ts",
  "lib/rag/chunk.ts",
  "lib/rag/retrieve.ts",
  "lib/rag/store.ts",
  "lib/rag/index.ts",
  "lib/rag/embed.ts",
  "lib/rag/vector.ts",
  "lib/rag/hybrid.ts",
  "app/api/rag/ingest/route.ts",
  "app/api/rag/query/route.ts",
  "components/RagDemo.tsx",
  "app/rag/page.tsx",
  "supabase/migrations/0002_rag.sql",
];

// ── Consoles (user + admin) ───────────────────────────────────────────────
// Both dashboards are real, selectable modules. When a console is unchecked
// its entire route tree disappears; the shared chrome/data layer disappears
// only when BOTH consoles are unchecked, so no dangling imports survive.
const ACCOUNT_FILES = [
  "app/account/layout.tsx",
  "app/account/page.tsx",
  "app/account/billing/page.tsx",
  "app/account/licenses/page.tsx",
  "app/account/settings/page.tsx",
  "components/console/SignOutButton.tsx",
  // Self-service profile edit endpoint is only meaningful with the console.
  "app/api/profile/route.ts",
];

const ADMIN_FILES = [
  "app/admin/layout.tsx",
  "app/admin/page.tsx",
  "app/admin/licenses/page.tsx",
  "app/admin/orders/page.tsx",
  "app/admin/access/page.tsx",
  "app/admin/users/page.tsx",
  "app/admin/stats/page.tsx",
  "app/admin/models/page.tsx",
  "app/api/admin/models/route.ts",
  "components/console/ModelConsole.tsx",
  "app/admin/system/page.tsx",
  // Role-management endpoint is only meaningful with the admin console.
  "app/api/admin/users/route.ts",
  // Operator sign-in: the in-page form, its API and the sign-out control.
  "app/api/admin/login/route.ts",
  "app/api/admin/logout/route.ts",
  "components/console/AdminLoginScreen.tsx",
  "components/console/AdminSignOutButton.tsx",
  // The conversion funnel visualisation lives with the admin console.
  "components/console/Funnel.tsx",
];

// The operator credential + session layer stays in every build: the /api/stats
// endpoint (always shipped) resolves the operator session, and the Edge
// middleware needs the cookie name. lib/sqlite.ts is core for the same
// reason — licenses, orders and pageviews all persist there.

const CONSOLE_SHARED_FILES = [
  "components/console/ConsoleNav.tsx",
  "components/console/ConsoleUI.tsx",
  "lib/content/console.ts",
  "lib/console.ts",
];

// Paid-content (paywall) feature: the runnable /premium sample page and the
// reusable <Paywall> component. The interception ENGINE (lib/paywall.ts) and
// its middleware hook are part of the core and are never pruned, so any
// generated project can still enable a content paywall via PREMIUM_ROUTES
// even without this feature — this only controls the sample page + component.
const PREMIUM_FILES = [
  "app/premium/page.tsx",
  "components/Paywall.tsx",
];

// Video studio (face-swap) module: consent-gated fal.ai jobs, subscription
// credits, deep-synthesis labeling. Pruned whole when unselected.
const VIDEO_FILES = [
  "app/video/page.tsx",
  "app/video/studio/page.tsx",
  "app/api/video/jobs/route.ts",
  "app/api/video/jobs/[id]/route.ts",
  "app/api/video/webhook/route.ts",
  "lib/video/fal.ts",
  "lib/video/quota.ts",
  "lib/video/store.ts",
  "lib/content/video-templates.ts",
  "supabase/migrations/0013_video.sql",
];
// NOTE: skills/video.md and the generated ai/rules/video.md are NOT listed
// here - the playbook and its scoped rule follow the VIDEO *skill* (doc-set
// generation), while this list prunes the studio's *code* with the feature.

// Multi-tenancy: when OFF, drop the workspace UI + its API routes + helpers so
// the generated project has no org scaffolding. lib/org.ts is the tenant helper
// but it is only imported by these files, so it is pruned too. When ON, the
// workspace switcher appears in the account nav and orgs are real.
const MULTI_FILES = [
  "app/account/workspaces/page.tsx",
  "components/console/WorkspaceSwitcher.tsx",
  "components/console/WorkspaceManager.tsx",
  "app/api/org/route.ts",
  "app/api/org/active/route.ts",
  "lib/org.ts",
];

// make1day-site-only endpoints that must never ship in a customer project.
// Reasons:
//  1. self-check statically imports lib/payments/waffo.ts, which IS pruned for
//     every other payment choice — leaving it in the zip would break `tsc`;
//  2. llms.txt / llms-full.txt / openapi.json describe THIS product site, not
//     the customer's app, so shipping them would be misleading branding.
// License files are safe to keep (self-contained) and the gate is OFF by
// default in generated projects. scripts/verify-matrix.mjs asserts all four
// of these paths are absent from every generated ZIP.
const SITE_ONLY_FILES = [
  "app/api/payments/self-check/route.ts",
  "app/llms.txt/route.ts",
  "app/llms-full.txt/route.ts",
  "app/openapi.json/route.ts",
  // MCP endpoint describes make1day itself, not the customer's product. Its
  // imports would also break pruned builds.
  "app/api/mcp/route.ts",
  // GEO: ?format=md rewrite target and the agent-card descriptor describe
  // the operator site, not the customer's product.
  "app/api/markdown/route.ts",
  "app/.well-known/agent-card.json/route.ts",
  // Style Playground is a make1day-site marketing page. It imports the site's
  // own generator (lib/generator/themes) which never ships, so leaving it in
  // a customer project would be wrong branding AND break `tsc`.
  "app/styles/page.tsx",
  "components/StylePlayground.tsx",

  // ── make1day-site operational features (mail / support / auth recovery) ──
  // These are real, working routes in THIS repository's own runtime, but they
  // are deliberately NOT part of the customer starter. Keeping them out of
  // every ZIP means: (1) no new required-file assertions or matrix cases are
  // needed, (2) customer builds never import a module that could be pruned,
  // and (3) no dead links — customerNav / customerFooter / customerLoginLinks
  // / pruneTicketsNav strip the corresponding nav, footer, login and admin
  // entries. See AGENTS.md "Known gaps".
  // 五语文案与模板字典
  "lib/content/messaging.ts",
  // 事务邮件
  "lib/mail/types.ts",
  "lib/mail/config.ts",
  "lib/mail/index.ts",
  "lib/mail/templates.ts",
  "app/api/mail/self-check/route.ts",
  // 工单 / 客服
  "lib/tickets.ts",
  "app/api/support/tickets/route.ts",
  "app/api/support/tickets/[id]/route.ts",
  "app/support/page.tsx",
  "components/SupportForm.tsx",
  "app/admin/tickets/page.tsx",
  "components/TicketStatusSelect.tsx",
  // 密码重置 / 邮箱验证
  "lib/local-auth-tokens.ts",
  "app/api/auth/password-reset/route.ts",
  "app/api/auth/verify-email/route.ts",
  "app/forgot-password/page.tsx",
  "app/reset-password/page.tsx",
  "app/verify-email/page.tsx",
  "components/AuthFlow.tsx",
  // 对应 Supabase migration（代码不随包交付，表也不应凭空出现在客户包里）
  "supabase/migrations/0010_support_tickets.sql",
  // ── make1day-site delivery + governance (added 2026-11-08) ──
  // The generator is the product: paid-order delivery, mail retry, data
  // export / retention and the agent-card are operator-side capabilities.
  // lib/csrf.ts, lib/http-guard.ts and lib/rate-limit.ts are DELIBERATELY NOT
  // here: shipped API routes import them, so they must survive every build.
  // Migration 0011 likewise ships (a customer can use the same tables).
  "lib/mail/outbox.ts",
  "lib/license-delivery.ts",
  "lib/legal-lifecycle.ts",
  "app/api/license/claim/route.ts",
  "app/api/cron/mail-outbox/route.ts",
  "app/api/cron/retention/route.ts",
  "app/api/privacy/export/route.ts",
  "app/api/privacy/erase/route.ts",
  "app/api/privacy/consent/route.ts",
  "components/LicenseClaimForm.tsx",
];

// make1day's OWN marketing site.
//
// A customer who downloads a starter must not go live advertising our
// product: the $99 source license, the "make1day vs Makerkit" comparison, our
// nine SEO posts, their Markdown variants, an FAQ about OUR download gate, and a license-redemption
// page for OUR builder. Those pages are replaced by brand-free customer pages
// (see lib/generator/customer-site.ts), and their content/components are
// pruned here so no dead import or dangling nav link survives.
const SITE_MARKETING_FILES = [
  "app/blog/page.tsx",
  "app/blog/[slug]/page.tsx",
  // Markdown variant is a GEO route that imports lib/content/blog.ts, which is
  // pruned below. Leaving it in a customer ZIP would break `tsc` AND leak our
  // editorial content into a project that must be brand-free.
  "app/blog/[slug]/md/route.ts",
  "app/compare/page.tsx",
  "app/faq/page.tsx",
  "app/license/page.tsx",
  "lib/content/blog.ts",
  "lib/content/compare.ts",
  "lib/content/faq.ts",
  "components/CompareContent.tsx",
  "components/FaqContent.tsx",
  "components/CustomService.tsx",
  // Black Friday is a make1day-owned marketing page (promo pricing + countdown),
  // not part of the white-label product a customer generates. Keep it out of
  // customer ZIPs, and keep its companion countdown component too — it imports
  // nothing customer-specific, but ships no value without the page.
  "app/black-friday/page.tsx",
  // The BF pricing ladder (struck anchor + campaign price) is site-only
  // too — it renders the promo and imports nothing customer-specific.
  "components/BlackFridayPlans.tsx",
  "components/BlackFridayCountdown.tsx",
  // The $1 founder strip is make1day's own launch promo (env-gated on
  // WAFFO_PRICE_ID_FOUNDER); the generated pricing page never imports it.
  "components/FounderCard.tsx",
  "components/LicensePanel.tsx",
  // Home-page-only marketing sections. The customer home page is generated
  // from their own BuilderConfig and imports none of these.
  "components/home/BoundarySection.tsx",
  "components/home/PitfallSection.tsx",
  "components/home/ThemePreviewSection.tsx",
  "components/home/FeatureMatrix.tsx",
  "components/home/BlogTeaser.tsx",
  // Hero-only hand-drawn decoration + motion switch. The home page is
  // regenerated from the customer's config, so this import never survives.
  "components/home/HandDrawnDeco.tsx",
  // Template gallery + sample-site previews are make1day-owned marketing
  // sections; the customer home page is regenerated from their own config.
  "app/templates/page.tsx",
  "app/templates/[slug]/preview/page.tsx",
  "components/home/TemplateGallerySection.tsx",
  // Testimonial showcase on OUR home page. The wall COMPONENT itself
  // (components/TestimonialWall.tsx) ships in every customer ZIP and is
  // imported by the generated landing page — only this site-only wrapper with
  // our sample copy is stripped.
  "components/home/TestimonialShowcase.tsx",
  "components/TemplateSite.tsx",
  "components/TemplateCard.tsx",
  "lib/content/templates.ts",
  "components/home/FaqSection.tsx",
];

// The generator itself.
//
// A customer project must NOT ship the factory: one purchase would then
// mean unlimited generations (and resales of) the very product that was
// bought. These files are always pruned, and the rewrites below make sure
// no dead /builder link survives in the shipped navigation, home page,
// account console, sitemap or robots file.
const GENERATOR_FILES = [
  "lib/generator/config.ts",
  "lib/generator/customer-site.ts",
  "lib/generator/pack.ts",
  "lib/generator/prune.ts",
  "lib/generator/preview.ts",
  "lib/generator/schema.ts",
  "lib/generator/spec.ts",
  "lib/generator/templates.ts",
  "lib/generator/themes.ts",
  "app/builder/page.tsx",
  "components/Builder.tsx",
  "app/api/generate/route.ts",
  "app/api/generate/preview/route.ts",
  // The build-matrix page is a make1day-site page that reads a local
  // snapshot file (public/build-matrix.json) which is not in the repo.
  "app/build-matrix/page.tsx",
  "public/build-matrix.json",
];

/** Source files that should be excluded from the generated zip. */
// Inngest workflow module: functions, serve endpoint, trigger, run store.
const WORKFLOW_FILES = [
  "inngest/client.ts",
  "inngest/functions.ts",
  "app/api/inngest/route.ts",
  "app/api/pipeline/run/route.ts",
  "lib/workflows.ts",
  "supabase/migrations/0016_workflows.sql",
];

// Pipeline canvas: admin page + xyflow client (needs the workflow store).
const CANVAS_FILES = [
  "app/admin/workflows/page.tsx",
  "components/console/WorkflowCanvas.tsx",
];

// Payment compliance pack: machine-readable contract + self-check script.
const COMPLIANCE_FILES = [
  "contracts/payment-compliance.json",
  "scripts/payment-compliance-check.mjs",
];

export function computeSkip(config: BuilderConfig): Set<string> {
  const skip = new Set<string>(SITE_ONLY_FILES);
  // make1day's marketing site must never appear in a customer's project.
  for (const f of SITE_MARKETING_FILES) skip.add(f);
  // The generator never ships: one purchase must not mean unlimited
  // generations of the product that was just paid for.
  for (const f of GENERATOR_FILES) skip.add(f);

  // Payment adapters: keep only the selected gateways (skip the rest + none).
  const enabledPayments: string[] = config.payment.filter((p) => p !== "none");
  if (enabledPayments.length === 0) {
    for (const f of Object.values(PAYMENT_FILES)) skip.add(f);
  } else {
    for (const [id, f] of Object.entries(PAYMENT_FILES)) {
      if (!enabledPayments.includes(id)) skip.add(f);
    }
  }

  // Skills: drop the markdown playbooks the user didn't select (README stays).
  for (const [id, f] of Object.entries(SKILL_FILES)) {
    if (!config.skills.includes(id as SkillId)) skip.add(f);
  }

  // RAG module: a real, runnable implementation; remove it entirely when the
  // feature isn't selected so the generated project stays lean.
  if (!config.features.includes("rag")) {
    for (const f of RAG_FILES) skip.add(f);
  }

  // Dashboard feature: if unchecked, drop the dashboard route plus the two
  // components that are referenced ONLY by the dashboard (SignOut, ChatDemo).
  if (!config.features.includes("dashboard")) {
    skip.add("app/dashboard/page.tsx");
    skip.add("components/SignOut.tsx");
    skip.add("components/ChatDemo.tsx");
  }

  // Consoles: prune each route tree independently, then drop the shared
  // chrome/data modules only when neither console survives.
  const hasAccount = config.features.includes("account");
  const hasAdmin = config.features.includes("admin");
  if (!hasAccount) for (const f of ACCOUNT_FILES) skip.add(f);
  if (!hasAdmin) for (const f of ADMIN_FILES) skip.add(f);
  if (!hasAccount && !hasAdmin) {
    for (const f of CONSOLE_SHARED_FILES) skip.add(f);
  }

  // Paid content: drop the sample page + reusable component when the feature
  // isn't selected. lib/paywall.ts (the interception engine) stays.
  if (!config.features.includes("premium")) {
    for (const f of PREMIUM_FILES) skip.add(f);
  }

  // Video studio (face-swap) module: consent-gated fal.ai jobs, subscription
  // credits, deep-synthesis labeling. Pruned whole when unselected.
  if (!config.features.includes("video")) {
    for (const f of VIDEO_FILES) skip.add(f);
  }

  // Durable workflow module (skill-driven, like the consoles).
  if (!config.skills.includes("workflow")) {
    for (const file of WORKFLOW_FILES) skip.add(file);
  }
  if (!config.skills.includes("canvas")) {
    for (const file of CANVAS_FILES) skip.add(file);
  }
  if (!config.skills.includes("compliance")) {
    for (const file of COMPLIANCE_FILES) skip.add(file);
  }

  // Multi-tenancy: drop the workspace UI + API routes + helper when OFF, or
  // when the account console is OFF (the workspace UI lives under /account and
  // imports shared console modules that would otherwise be pruned).
  if (
    !config.features.includes("multitenancy") ||
    !config.features.includes("account")
  ) {
    for (const f of MULTI_FILES) skip.add(f);
  }

  return skip;
}

// ── Payment: index + none stub ─────────────────────────────────────────────

const PAYMENT_LABELS: Record<PaymentProvider, string> = {
  stripe: "Stripe",
  creem: "Creem",
  paypal: "PayPal",
  waffo: "Waffo",
  lemonsqueezy: "Lemon Squeezy",
  none: "None",
};

/** Stub provider used when PAYMENT_PROVIDER=none. */
export function buildPaymentNoneStub(): string {
  return `import type { PaymentProvider } from "./types";

// Generated when PAYMENT_PROVIDER=none. Checkout throws (so the UI shows a
// clear error) and webhooks are treated as no-ops.
export const noneProvider: PaymentProvider = {
  name: "none",
  label: "None",

  async createCheckout() {
    throw new Error(
      "Payments are disabled in this build (PAYMENT_PROVIDER=none).",
    );
  },

  async verifyWebhook() {
    return [];
  },
};
`;
}

/** Tailored lib/payments/index.ts that wires up only the selected gateways. */
export function buildPaymentIndex(payment: PaymentProvider[]): string {
  const effective = payment.filter((p) => p !== "none");

  if (effective.length === 0) {
    return `import { env } from "@/lib/env";
import type { PaymentProvider } from "./types";
import { noneProvider } from "./none";

let _provider: PaymentProvider | null = null;

/** Return the active payment provider. This build has payments disabled. */
export function getPaymentProvider(): PaymentProvider {
  if (_provider) return _provider;
  _provider = noneProvider;
  return _provider;
}

/**
 * All payment providers enabled in this build. Payments are disabled, so the
 * list holds only the none stub — the webhook verifier skips it and returns
 * 400 for any inbound payload, which is the correct behaviour with no gateway.
 */
export function getPaymentProviders(): PaymentProvider[] {
  return [getPaymentProvider()];
}

/** Label of the active provider, for UI copy. */
export function paymentProviderLabel(): string {
  return getPaymentProvider().label;
}

const PROVIDER_LABELS: Record<string, string> = { none: "None" };
export function providerLabel(name: string): string {
  return PROVIDER_LABELS[name] ?? name;
}

export type { PaymentProvider } from "./types";
`;
  }

  const imports = effective
    .map((p) => `import { ${p}Provider } from "./${p}";`)
    .join("\n");
  const instances = effective.map((p) => `${p}Provider`).join(", ");
  const labels = effective
    .map((p) => `  ${p}: ${JSON.stringify(PAYMENT_LABELS[p])},`)
    .join("\n");

  return `import { env } from "@/lib/env";
import type { PaymentProvider } from "./types";
${imports}

let _providers: PaymentProvider[] | null = null;

/** All payment providers enabled in this build. */
export function getPaymentProviders(): PaymentProvider[] {
  if (_providers) return _providers;
  const list: PaymentProvider[] = [${instances}];
  _providers = list;
  return _providers;
}

/** The primary (first) payment provider used for checkout. */
export function getPaymentProvider(): PaymentProvider {
  const list = getPaymentProviders();
  return list[0];
}

/** Label of the primary provider, for UI copy. */
export function paymentProviderLabel(): string {
  return getPaymentProvider().label;
}

const PROVIDER_LABELS: Record<string, string> = {
${labels}
};
export function providerLabel(name: string): string {
  return PROVIDER_LABELS[name] ?? name;
}

export type { PaymentProvider } from "./types";
`;
}

// ── AI: providers + index ──────────────────────────────────────────────────

const AI_LABELS: Record<string, string> = {
  openai: "OpenAI",
  openrouter: "OpenRouter",
  deepseek: "DeepSeek",
  groq: "Groq",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
  mistral: "Mistral",
  cohere: "Cohere",
  xai: "xAI Grok",
  perplexity: "Perplexity",
  ollama: "Ollama",
};

/** The `return { ... }` body (6-space indented) for an AI provider branch. */
function aiReturnBody(id: string): string {
  switch (id) {
    case "openai":
      return `      return {
        kind: "openai-compatible",
        apiKey: env.openaiApiKey(),
        baseURL: env.openaiBaseUrl(),
        model: env.openaiModel(),
      };`;
    case "openrouter":
      return `      return {
        kind: "openai-compatible",
        apiKey: env.openrouterApiKey(),
        baseURL: "https://openrouter.ai/api/v1",
        model: env.openrouterModel(),
      };`;
    case "deepseek":
      return `      return {
        kind: "openai-compatible",
        apiKey: env.deepseekApiKey(),
        baseURL: "https://api.deepseek.com/v1",
        model: env.deepseekModel(),
      };`;
    case "groq":
      return `      return {
        kind: "openai-compatible",
        apiKey: env.groqApiKey(),
        baseURL: "https://api.groq.com/openai/v1",
        model: env.groqModel(),
      };`;
    case "anthropic":
      return `      return { kind: "anthropic", apiKey: env.anthropicApiKey(), model: env.anthropicModel() };`;
    case "gemini":
      return `      return { kind: "gemini", apiKey: env.geminiApiKey(), model: env.geminiModel() };`;
    case "mistral":
      return `      return { kind: "openai-compatible", apiKey: env.mistralApiKey(), baseURL: env.mistralBaseUrl(), model: env.mistralModel() };`;
    case "cohere":
      return `      return { kind: "openai-compatible", apiKey: env.cohereApiKey(), baseURL: env.cohereBaseUrl(), model: env.cohereModel() };`;
    case "xai":
      return `      return { kind: "openai-compatible", apiKey: env.xaiApiKey(), baseURL: env.xaiBaseUrl(), model: env.xaiModel() };`;
    case "perplexity":
      return `      return { kind: "openai-compatible", apiKey: env.perplexityApiKey(), baseURL: env.perplexityBaseUrl(), model: env.perplexityModel() };`;
    case "ollama":
      return `      return { kind: "openai-compatible", apiKey: env.ollamaApiKey(), baseURL: env.ollamaBaseUrl(), model: env.ollamaModel() };`;
    default:
      return `      return { kind: "openai-compatible", apiKey: env.openaiApiKey(), baseURL: env.openaiBaseUrl(), model: env.openaiModel() };`;
  }
}

/** Tailored lib/ai/providers.ts — only the selected providers are wired up. */
export function buildAiProviders(selected: AiProvider[]): string {
  const openaiSel = selected.includes("openai");

  const cases: string[] = [];
  if (openaiSel) {
    for (const id of ["openai", "openrouter", "deepseek", "groq"]) {
      cases.push(`      case "${id}":`);
      cases.push(aiReturnBody(id));
    }
  }
  if (selected.includes("anthropic")) {
    cases.push(`      case "anthropic":`);
    cases.push(aiReturnBody("anthropic"));
  }
  if (selected.includes("gemini")) {
    cases.push(`      case "gemini":`);
    cases.push(aiReturnBody("gemini"));
  }
  // Additional OpenAI-compatible AIGC providers (each selected independently).
  for (const id of ["mistral", "cohere", "xai", "perplexity", "ollama"] as const) {
    if (selected.includes(id)) {
      cases.push(`      case "${id}":`);
      cases.push(aiReturnBody(id));
    }
  }

  // default → the primary selected provider (keeps chat() from throwing).
  const primary = openaiSel ? "openai" : selected[0] ?? "openai";

  const labels = Object.entries(AI_LABELS)
    .map(([k, v]) => `  ${k}: "${v}",`)
    .join("\n");

  return `import { env } from "@/lib/env";

export type AiProviderKey =
  | "openai"
  | "openrouter"
  | "deepseek"
  | "groq"
  | "anthropic"
  | "gemini"
  | "mistral"
  | "cohere"
  | "xai"
  | "perplexity"
  | "ollama";

export type ProviderConfig =
  | { kind: "openai-compatible"; apiKey: string; baseURL: string; model: string }
  | { kind: "anthropic"; apiKey: string; model: string }
  | { kind: "gemini"; apiKey: string; model: string };

/**
 * Map a provider key to its concrete config. Injected into generated projects — only the
 * providers selected in the builder are wired up here.
 */
export function resolveAiConfig(key: string): ProviderConfig {
  switch (key) {
${cases.join("\n")}
    default:
${aiReturnBody(primary)}
  }
}

export const AI_PROVIDER_LABELS: Record<string, string> = {
${labels}
};
`;
}

/** Tailored lib/ai/index.ts - Vercel AI SDK code for the selected providers only. */
export function buildAiIndex(selected: AiProvider[]): string {
  const openaiSel = selected.includes("openai");
  const anthSel = selected.includes("anthropic");
  const gemSel = selected.includes("gemini");

  const imports: string[] = [
    "import { generateText, streamText, type ModelMessage } from \"ai\";",
  ];
  if (openaiSel) {
    imports.push("import { createOpenAI } from \"@ai-sdk/openai\";");
    imports.push("import { createOpenAICompatible } from \"@ai-sdk/openai-compatible\";");
  }
  if (anthSel) imports.push("import { createAnthropic } from \"@ai-sdk/anthropic\";");
  if (gemSel) imports.push("import { createGoogleGenerativeAI } from \"@ai-sdk/google\";");
  imports.push("import { env } from \"@/lib/env\";");
  imports.push("import { resolveAiConfig, type AiProviderKey, type ProviderConfig } from \"./providers\";");
  imports.push("import { getRouting, recordUsage, estimateTokens } from \"@/lib/billing\";");

  const modelBranches: string[] = [];
  if (anthSel) {
    modelBranches.push(`  if (cfg.kind === "anthropic") {
    return createAnthropic({ apiKey: cfg.apiKey }).chat(cfg.model);
  }`);
  }
  if (gemSel) {
    modelBranches.push(`  if (cfg.kind === "gemini") {
    return createGoogleGenerativeAI({ apiKey: cfg.apiKey })(cfg.model);
  }`);
  }
  if (openaiSel) {
    modelBranches.push(`  if (cfg.kind === "openai-compatible") {
    // OpenAI itself gets the first-party provider; custom or compatible
    // endpoints use the OpenAI-compatible provider instead.
    if (key === "openai" && cfg.baseURL === "https://api.openai.com/v1") {
      return createOpenAI({ apiKey: cfg.apiKey }).chat(cfg.model);
    }
    return createOpenAICompatible({
      name: key,
      baseURL: cfg.baseURL,
      apiKey: cfg.apiKey,
    })(cfg.model);
  }`);
  }

  return imports.join("\n") + `

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** Build the AI SDK language model for a resolved provider config. */
function languageModel(key: string, cfg: ProviderConfig) {
${modelBranches.join("\n")}
  // No selected provider matches this config (possible when AI is
  // configured without providers); fail fast with a typed never.
  void key;
  return null as never;
}

/** provider key + effective config, honoring the admin routing override. */
async function effective(
  keyArg: string | undefined,
): Promise<{ key: string; cfg: ProviderConfig }> {
  const route = await getRouting("chat");
  const key = keyArg?.trim() || route?.provider || env.aiProvider();
  const base = resolveAiConfig(key);
  const cfg = route?.model ? { ...base, model: route.model } : base;
  return { key, cfg };
}

type SdkUsage = { inputTokens?: number; outputTokens?: number } | null | undefined;

async function meter(
  key: string,
  cfg: ProviderConfig,
  usage: SdkUsage,
  outChars?: number,
): Promise<void> {
  if (usage && (usage.inputTokens || usage.outputTokens)) {
    await recordUsage({
      lane: "chat",
      provider: key,
      model: cfg.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      source: "usage",
    });
    return;
  }
  const est = estimateTokens(outChars ?? 0);
  if (est.outputTokens > 0) {
    await recordUsage({
      lane: "chat",
      provider: key,
      model: cfg.model,
      outputTokens: est.outputTokens,
      source: "estimated",
    });
  }
}

/**
 * Send chat messages to the chosen provider and return a single string.
 * Any provider/network error is returned as a readable message so the UI
 * never hard-fails.
 */
export async function chat(providerKey: string, messages: ChatMessage[]): Promise<string> {
  const { key, cfg } = await effective(providerKey);
  if (!cfg.apiKey) return "\\n[AI error] No API key configured for this provider.";
  try {
    const result = await generateText({
      model: languageModel(key, cfg),
      messages: messages as ModelMessage[],
      temperature: 0.4,
    });
    await meter(key, cfg, result.usage as SdkUsage);
    return result.text;
  } catch (err) {
    return "\\n[AI error] " + (err as Error).message;
  }
}

/**
 * Backwards-compatible helper used by /api/ai. Falls back to the
 * configured default provider (or the admin routing) when none is set.
 */
export async function streamChat(messages: ChatMessage[], provider?: string): Promise<string> {
  return chat(provider ?? "", messages);
}

/**
 * Whether the selected provider has an API key configured. /api/ai uses
 * this to decide between the built-in demo reply and a real streamed call.
 */
export function hasAiProviderKey(providerKey?: string): boolean {
  const key = providerKey && providerKey.trim() ? providerKey.trim() : env.aiProvider();
  return Boolean(resolveAiConfig(key).apiKey);
}

const NO_KEY_TEXT =
  "[AI] No API key is configured for the selected provider. " +
  "Add the matching key in .env.local to enable real streamed replies. " +
  "Until then the endpoint returns the built-in demo reply.";

/**
 * Real token streaming via the AI SDK: each yield is one incremental
 * chunk. Errors are deliberately NOT swallowed - a provider that has a
 * key but fails throws, so the caller logs the real error instead of
 * surfacing a fake friendly answer.
 */
export async function* streamChatChunks(
  providerKey: string | undefined,
  messages: ChatMessage[],
): AsyncGenerator<string> {
  const { key, cfg } = await effective(providerKey);
  if (!cfg.apiKey) {
    yield NO_KEY_TEXT;
    return;
  }
  const result = streamText({
    model: languageModel(key, cfg),
    messages: messages as ModelMessage[],
    temperature: 0.4,
  });
  let outChars = 0;
  for await (const delta of result.textStream) {
    outChars += delta.length;
    yield delta;
  }
  let usage: SdkUsage = null;
  try {
    usage = (await result.usage) as SdkUsage;
  } catch {
    usage = null;
  }
  await meter(key, cfg, usage, outChars);
}

export type { AiProviderKey };
`;
}
// ── Console-aware rewrites ────────────────────────────────────────────────

/** Where a signed-in user lands when the user console is not selected. */
export function postLoginTarget(hasAccount: boolean, hasDashboard: boolean): string {
  if (hasAccount) return "/account";
  if (hasDashboard) return "/dashboard";
  return "/";
}

/**
 * The Nav's account link points at /account. When that console is pruned,
 * fall back to the demo dashboard, then to /login — never a 404. Uses stable
 * constants in Nav.tsx instead of matching JSX shape.
 */
export function pruneNav(
  source: string,
  hasAccount: boolean,
  hasDashboard: boolean,
): string {
  if (hasAccount) return source;
  const target = postLoginTarget(false, hasDashboard);
  const label = hasDashboard ? 't("nav.dashboard")' : 't("nav.login")';
  return source
    .replace('const ACCOUNT_HREF = "/account";', `const ACCOUNT_HREF = "${target}";`)
    .replace(/t\("nav\.account"\)/g, label);
}

/** Demo login must land on a route that actually exists in this build. */
export function pruneDemoRoute(source: string, target: string): string {
  if (target === "/account") return source;
  return source.replace(`new URL("/account"`, `new URL("${target}"`);
}

/**
 * When the admin console is pruned, the user console's "Admin console" link
 * would be a dead route. Keep the slot, but point it home with an accurate
 * label. Applied only to app/account/layout.tsx.
 */
export function pruneAdminLink(source: string): string {
  return source
    .replace('const ADMIN_HREF = "/admin";', 'const ADMIN_HREF = "/";')
    .replace(
      'label: c["account.adminEntry"]',
      'label: c["console.backToSite"]',
    );
}

/**
 * When the `multitenancy` feature is OFF, the workspaces nav entry is a dead
 * route. Remove the item line (and the WORKSPACES_HREF constant) from
 * app/account/layout.tsx so the generated project links only to real pages.
 */
export function pruneWorkspacesLink(source: string): string {
  return source
    .replace(/\s*\{ href: WORKSPACES_HREF, label: c\["account\.nav\.workspaces"\] \},/, "")
    .replace(/const WORKSPACES_HREF = "\/account\/workspaces";\n/, "");
}

/**
 * /admin/tickets is a make1day-site-only page (support tickets are an
 * operational feature of this product site, not part of the customer's
 * starter). Strip its nav entry in EVERY generated build, or the customer's
 * admin console would link to a route that does not exist in the ZIP.
 */
export function pruneTicketsNav(source: string): string {
  return source.replace(
    /\s*\{ href: "\/admin\/tickets", label: c\["admin\.nav\.tickets"\] \},/,
    "",
  );
}

/**
 * When the dashboard page is removed, every hard-coded post-login / post-
 * checkout redirect must point at "/" instead, or sign-in, OAuth callback and
 * successful payment all land on a 404. Applied to the three files that
 * contain those literals.
 */
/**
 * The Style Playground (/styles) is a make1day-site marketing page. Remove its
 * Nav entry from generated projects, or every customer app links to a 404.
 */
export function pruneStylesLink(source: string): string {
  return source.replace(
    /\s*\{ href: "\/styles", label: t\("nav\.styles"\) \},/,
    "",
  );
}

/** Drop the site-only /styles entry from the generated sitemap. */
export function pruneStylesSitemap(source: string): string {
  return source.replace(/\s*\{ path: "\/styles", priority: 0\.7 \},/, "");
}

/** Drop the site-only /templates entry from the generated sitemap. */
export function pruneTemplatesSitemap(source: string): string {
  return source.replace(/\s*\{ path: "\/templates", priority: 0\.6 \},/, "");
}

/** Drop the site-only /black-friday entry from the generated sitemap. */
export function pruneBlackFridaySitemap(source: string): string {
  return source.replace(/\s*\{ path: "\/black-friday", priority: 0\.8 \},/, "");
}

// ── Generator removal ──────────────────────────────────────────────────────
//
// The generator is pruned from every customer project (see GENERATOR_FILES),
// so every link that pointed at /builder has to be rewritten to a route that
// really exists — a dead link in the shipped navigation is a bug report
// waiting to happen.

/** Remove the /builder entry from the generated navigation. */
export function pruneBuilderNav(source: string): string {
  return source.replace(
    /\s*\{ href: "\/builder", label: t\("nav\.builder"\) \},/,
    "",
  );
}

/** Retarget a /builder call-to-action to a route that exists. */
export function pruneBuilderCta(source: string, target: string): string {
  return source.replace(/href="\/builder"/g, `href="${target}"`);
}

/** Drop the site-only /builder entry from the generated sitemap. */
export function pruneBuilderSitemap(source: string): string {
  return source.replace(/\s*\{ path: "\/builder", priority: 0\.9 \},/, "");
}

/** Drop the site-only /builder path from the generated robots file. */
export function pruneBuilderRobots(source: string): string {
  return source
    .replace(/\s*"\/builder",/g, "")
    // The comment above it explains why /builder is listed — it goes too.
    .replace(/\n[^\n]*\/\/ \/builder is the product's main conversion page[^\n]*/, "");
}

/**
 * The generated project ships with the download gate OFF.
 *
 * make1day's own deployment runs in "auto" (production = ON, fail-safe). A
 * customer must never inherit that paywall, so the default flips to "off"
 * inside the shipped lib/env.ts — the customer can still opt in with
 * LICENSE_GATE=on + LICENSE_SECRET.
 */
export function pruneLicenseGateDefault(source: string): string {
  return source.replace(
    /\/\/ "on" \| "off" \| "auto" \(default\)\.[\s\S]*?licenseGateMode: \(\) => opt\("LICENSE_GATE", "auto"\)\.toLowerCase\(\),/,
    `// "on" | "off" | "auto" (default: off).
  // This project ships with the download gate OFF. Flip it to "on" only if
  // you also sell this template from your own site — and set LICENSE_SECRET
  // to a long random string first.
  licenseGateMode: () => opt("LICENSE_GATE", "off").toLowerCase(),`,
  );
}

/**
 * Rewrite every hard-coded post-login / post-checkout destination to a route
 * that exists in this build. Applied to app/login/page.tsx,
 * app/auth/callback/route.ts, app/api/checkout/route.ts and
 * app/auth/demo/route.ts. Both the new /account and the legacy /dashboard
 * literals are handled so mixed source states stay safe.
 */
export function prunePostLoginRedirects(source: string, target: string): string {
  if (target === "/account") return source;
  return source
    .replaceAll("/account?welcome=1", `${target}?welcome=1`)
    .replaceAll("/dashboard?welcome=1", `${target}?welcome=1`)
    .replaceAll("redirect=/account", `redirect=${target}`)
    .replaceAll("redirect=/dashboard", `redirect=${target}`)
    .replaceAll(`"/account"`, `"${target}"`)
    .replaceAll(`"/dashboard"`, `"${target}"`);
}
