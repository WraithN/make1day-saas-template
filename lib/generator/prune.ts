// Module-aware pruning for the ShipKit template generator.
//
// ShipKit ships a single source tree, but the builder lets users pick which
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

// ShipKit-site-only endpoints that must never ship in a customer project.
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
  // MCP endpoint and the agent-ready landing page describe ShipKit itself,
  // not the customer's product. Their imports would also break pruned builds.
  "app/api/mcp/route.ts",
  "app/agent-ready/page.tsx",
  "lib/content/agent-ready.ts",
  // Style Playground is a ShipKit-site marketing page. It imports the site's
  // own generator (lib/generator/themes) which never ships, so leaving it in
  // a customer project would be wrong branding AND break `tsc`.
  "app/styles/page.tsx",
  "components/StylePlayground.tsx",
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
  // The build-matrix page is a ShipKit-site page that reads a local
  // snapshot file (public/build-matrix.json) which is not in the repo.
  "app/build-matrix/page.tsx",
  "public/build-matrix.json",
];

/** Source files that should be excluded from the generated zip. */
export function computeSkip(config: BuilderConfig): Set<string> {
  const skip = new Set<string>(SITE_ONLY_FILES);
  // The generator never ships: one purchase must not mean unlimited
  // generations of the product that was just paid for.
  for (const f of GENERATOR_FILES) skip.add(f);

  // Payment adapters: keep only the selected gateway (or skip all four + stub).
  if (config.payment === "none") {
    for (const f of Object.values(PAYMENT_FILES)) skip.add(f);
  } else {
    for (const [id, f] of Object.entries(PAYMENT_FILES)) {
      if (id !== config.payment) skip.add(f);
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

/** Tailored lib/payments/index.ts that wires up only the selected gateway. */
export function buildPaymentIndex(payment: PaymentProvider): string {
  if (payment === "none") {
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

  const label = PAYMENT_LABELS[payment];
  return `import { env } from "@/lib/env";
import type { PaymentProvider } from "./types";
import { ${payment}Provider } from "./${payment}";

let _provider: PaymentProvider | null = null;

/** Return the active payment provider based on the generated build. */
export function getPaymentProvider(): PaymentProvider {
  if (_provider) return _provider;
  _provider = ${payment}Provider;
  return _provider;
}

/** Label of the active provider, for UI copy. */
export function paymentProviderLabel(): string {
  return getPaymentProvider().label;
}

const PROVIDER_LABELS: Record<string, string> = { ${payment}: "${label}" };
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
  | "gemini";

export type ProviderConfig =
  | { kind: "openai-compatible"; apiKey: string; baseURL: string; model: string }
  | { kind: "anthropic"; apiKey: string; model: string }
  | { kind: "gemini"; apiKey: string; model: string };

/**
 * Map a provider key to its concrete config. Generated by ShipKit — only the
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

/** Tailored lib/ai/index.ts — SDK imports + chat branches for selected only. */
export function buildAiIndex(selected: AiProvider[]): string {
  const openaiSel = selected.includes("openai");
  const anthSel = selected.includes("anthropic");
  const gemSel = selected.includes("gemini");

  const sdkImports: string[] = [];
  if (openaiSel) sdkImports.push(`import OpenAI from "openai";`);
  if (anthSel) sdkImports.push(`import Anthropic from "@anthropic-ai/sdk";`);
  if (gemSel) sdkImports.push(`import { GoogleGenerativeAI } from "@google/generative-ai";`);

  const clientFns: string[] = [];
  if (openaiSel) {
    clientFns.push(`const openaiCache = new Map<string, OpenAI>();
function openaiClient(baseURL: string, apiKey: string): OpenAI {
  const cacheKey = \`\${baseURL}::\${apiKey}\`;
  let c = openaiCache.get(cacheKey);
  if (!c) {
    c = new OpenAI({ apiKey, baseURL });
    openaiCache.set(cacheKey, c);
  }
  return c;
}`);
  }
  if (anthSel) {
    clientFns.push(`let _anthropic: Anthropic | null = null;
function anthropicClient(apiKey: string): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey });
  return _anthropic;
}`);
  }
  if (gemSel) {
    clientFns.push(`let _gemini: GoogleGenerativeAI | null = null;
function geminiClient(apiKey: string): GoogleGenerativeAI {
  if (!_gemini) _gemini = new GoogleGenerativeAI(apiKey);
  return _gemini;
}`);
  }

  const branches: string[] = [];
  if (openaiSel) {
    branches.push(`  if (cfg.kind === "openai-compatible") {
    if (!cfg.apiKey) return "\\n[AI error] No API key configured for this provider.";
    try {
      const client = openaiClient(cfg.baseURL, cfg.apiKey);
      const completion = await client.chat.completions.create({
        model: cfg.model,
        messages,
        stream: false,
        temperature: 0.4,
      });
      return completion.choices[0]?.message?.content ?? "";
    } catch (err) {
      return \`\\n[AI error] \${(err as Error).message}\`;
    }
  }`);
  }
  if (anthSel) {
    branches.push(`  if (cfg.kind === "anthropic") {
    if (!cfg.apiKey) return "\\n[AI error] No Anthropic API key configured.";
    try {
      const client = anthropicClient(cfg.apiKey);
      const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\\n");
      const conv = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      const msg = await client.messages.create({
        model: cfg.model,
        max_tokens: 1024,
        system: system || undefined,
        messages: conv,
      });
      return msg.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("");
    } catch (err) {
      return \`\\n[AI error] \${(err as Error).message}\`;
    }
  }`);
  }
  if (gemSel) {
    branches.push(`  if (cfg.kind === "gemini") {
    if (!cfg.apiKey) return "\\n[AI error] No Gemini API key configured.";
    try {
      const client = geminiClient(cfg.apiKey);
      const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\\n");
      const contents = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));
      const model = client.getGenerativeModel({
        model: cfg.model,
        systemInstruction: system || undefined,
      });
      const result = await model.generateContent({ contents });
      return result.response.text();
    } catch (err) {
      return \`\\n[AI error] \${(err as Error).message}\`;
    }
  }`);
  }

  return `import { env } from "@/lib/env";
${sdkImports.join("\n")}
import { resolveAiConfig, type AiProviderKey } from "./providers";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

// ── Lazy client caches (constructed on first use, never at import time) ──
${clientFns.join("\n\n")}

/**
 * Send chat messages to the chosen provider and return a single string.
 * Any provider/network error is swallowed and returned as a readable message
 * so the UI never hard-fails (handy for demos on a misconfigured key).
 */
export async function chat(providerKey: string, messages: ChatMessage[]): Promise<string> {
  const cfg = resolveAiConfig(providerKey);

${branches.join("\n\n")}

  return "\\n[AI error] Unknown provider.";
}

/**
 * Backwards-compatible helper used by /api/ai. Falls back to the configured
 * default provider when none is requested.
 */
export async function streamChat(messages: ChatMessage[], provider?: string): Promise<string> {
  const key = provider && provider.trim() ? provider.trim() : env.aiProvider();
  return chat(key, messages);
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
 * When the dashboard page is removed, every hard-coded post-login / post-
 * checkout redirect must point at "/" instead, or sign-in, OAuth callback and
 * successful payment all land on a 404. Applied to the three files that
 * contain those literals.
 */
/**
 * The agent-ready landing page is a ShipKit-site asset and is pruned from
 * customer projects. Remove its footer link too, or every generated app gets
 * a dead /agent-ready navigation item.
 */
export function pruneAgentReadyLink(source: string): string {
  return source.replace(
    /\s*<Link href="\/agent-ready"[\s\S]*?<\/Link>/,
    "",
  );
}

/**
 * The Style Playground (/styles) is a ShipKit-site marketing page. Remove its
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
 * ShipKit's own deployment runs in "auto" (production = ON, fail-safe). A
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
