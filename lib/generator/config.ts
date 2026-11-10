// Builder configuration types + defaults for the make1day template generator.
// The user picks components in the /builder UI; these selections drive the
// generated template's env defaults, README and manifest.

export type AuthProvider = "email" | "google" | "github" | "apple" | "microsoft";
export type PaymentProvider =
  | "none"
  | "stripe"
  | "creem"
  | "paypal"
  | "waffo"
  | "lemonsqueezy";
export type AiProvider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "mistral"
  | "cohere"
  | "xai"
  | "perplexity"
  | "ollama";
export type Feature =
  | "landing"
  | "dashboard"
  | "rag"
  | "multitenancy"
  | "account"
  | "admin"
  | "premium"
  | "video";
export type DeployTarget = "vercel" | "selfhost" | "cloudflare";
export type StyleId =
  | "doodle"
  | "midnight"
  | "paper"
  | "aurora"
  | "emerald"
  | "sunset"
  | "ocean"
  | "mono"
  | "slate"
  | "candy"
  | "sand"
  | "y2k"
  | "pixel"
  | "neon"
  | "glass"
  | "retro";
export type SkillId =
  | "frontend"
  | "ui"
  | "backend"
  | "testing"
  | "seo"
  | "auth"
  | "payments"
  | "database"
  | "rag"
  | "i18n"
  | "deploy"
  | "agents"
  | "video";

export interface BuilderConfig {
  appName: string;
  auth: AuthProvider[];
  payment: PaymentProvider[];
  ai: AiProvider[];
  features: Feature[];
  deploy: DeployTarget;
  style: StyleId;
  skills: SkillId[];
}

export const AUTH_OPTIONS: { id: AuthProvider; label: string }[] = [
  { id: "email", label: "Email" },
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
  { id: "apple", label: "Apple" },
  { id: "microsoft", label: "Microsoft" },
];

export const AI_OPTIONS: { id: AiProvider; label: string; note: string }[] = [
  { id: "openai", label: "OpenAI-compatible", note: "OpenAI / OpenRouter / DeepSeek / Groq" },
  { id: "anthropic", label: "Anthropic", note: "Claude" },
  { id: "gemini", label: "Google Gemini", note: "Gemini" },
  { id: "mistral", label: "Mistral", note: "Mistral AI (OpenAI-compatible)" },
  { id: "cohere", label: "Cohere", note: "Cohere (OpenAI-compatible)" },
  { id: "xai", label: "xAI Grok", note: "xAI Grok (OpenAI-compatible)" },
  { id: "perplexity", label: "Perplexity", note: "Perplexity (OpenAI-compatible)" },
  { id: "ollama", label: "Ollama (local)", note: "Self-hosted, OpenAI-compatible" },
];

export const FEATURE_OPTIONS: { id: Feature; label: string; note: string }[] = [
  { id: "landing", label: "Landing page", note: "Marketing home + demo console" },
  { id: "dashboard", label: "Dashboard", note: "Signed-in area + AI demo" },
  { id: "rag", label: "RAG module", note: "Document Q&A boilerplate" },
  { id: "multitenancy", label: "Multi-tenancy", note: "org + membership tables, RLS and tenant helpers (workspace UI needs the User console too)" },
  {
    id: "account",
    label: "User console",
    note: "Profile · billing · licenses · settings",
  },
  {
    id: "admin",
    label: "Admin console",
    note: "Users · licenses · traffic · system",
  },
  {
    id: "premium",
    label: "Paid content (paywall)",
    note: "Edge-gated /premium route + reusable <Paywall> component",
  },
  {
    id: "video",
    label: "Video studio (face-swap)",
    note: "Consent-gated template face-swap jobs via fal.ai, subscription credits, deep-synthesis labeling",
  },
];

export const PAYMENT_OPTIONS: {
  id: PaymentProvider;
  label: string;
  note: string;
}[] = [
  { id: "waffo", label: "Waffo", note: "MoR, one-time + recurring" },
  { id: "stripe", label: "Stripe", note: "Most mature — production ready" },
  { id: "creem", label: "Creem", note: "Indie-friendly (default)" },
  { id: "paypal", label: "PayPal", note: "Subscriptions + webhooks" },
  {
    id: "lemonsqueezy",
    label: "Lemon Squeezy",
    note: "MoR for digital products — hosted checkout + portal",
  },
  { id: "none", label: "No payments", note: "Skip monetization for now" },
];

export const DEPLOY_OPTIONS: { id: DeployTarget; label: string; note?: string }[] = [
  { id: "vercel", label: "Vercel", note: "Zero-config, git push to ship" },
  { id: "cloudflare", label: "Cloudflare", note: "Pages + Workers edge" },
  { id: "selfhost", label: "Self-host", note: "Your own Node server" },
];

export const STYLE_OPTIONS: { id: StyleId; label: string; note: string }[] = [
  { id: "doodle", label: "Doodle", note: "Light · ink outlines · highlighter blocks" },
  { id: "midnight", label: "Midnight", note: "Dark · teal accent · grid" },
  { id: "aurora", label: "Aurora", note: "Dark · violet / cyan · glow" },
  { id: "emerald", label: "Emerald", note: "Dark · green / amber · dots" },
  { id: "sunset", label: "Sunset", note: "Dark · warm orange / pink · glow" },
  { id: "ocean", label: "Ocean", note: "Dark · deep blue / cyan · grid" },
  { id: "mono", label: "Mono", note: "Dark · monochrome · sharp" },
  { id: "paper", label: "Paper", note: "Light · indigo / pink" },
  { id: "slate", label: "Slate", note: "Light · cool blue · crisp" },
  { id: "candy", label: "Candy", note: "Light · pastel pink / violet · soft" },
  { id: "sand", label: "Sand", note: "Light · warm terracotta" },
  { id: "y2k", label: "Y2K", note: "Light · chrome · bubblegum cyan/pink" },
  { id: "pixel", label: "Pixel", note: "Dark · neon lime/amber · blocky" },
  { id: "neon", label: "Neon", note: "Dark · electric cyan/fuchsia · glow" },
  { id: "glass", label: "Glass", note: "Light · frosted violet/sky · glow" },
  { id: "retro", label: "Retro", note: "Light · warm orange/teal · dots" },
];

export const SKILL_OPTIONS: { id: SkillId; label: string; note: string }[] = [
  {
    id: "frontend",
    label: "Frontend Dev",
    note: "React / Next.js / TS conventions for this repo",
  },
  {
    id: "ui",
    label: "UI Design",
    note: "Design tokens, spacing & component patterns",
  },
  {
    id: "backend",
    label: "Backend & API",
    note: "Route handlers, Supabase, Zod validation",
  },
  {
    id: "testing",
    label: "Testing & QA",
    note: "Vitest + Playwright setup & checklists",
  },
  {
    id: "seo",
    label: "SEO & Content",
    note: "Metadata, blog, llms.txt, hreflang",
  },
  {
    id: "auth",
    label: "Auth & Security",
    note: "Supabase sessions, OAuth, middleware gating",
  },
  {
    id: "payments",
    label: "Payments & Webhooks",
    note: "Single webhook, RSA verify, one-time vs recurring",
  },
  {
    id: "database",
    label: "Database & RLS",
    note: "Migrations, service role, row level security",
  },
  {
    id: "rag",
    label: "Hybrid RAG",
    note: "BM25 + embeddings + RRF, ingest/query",
  },
  {
    id: "i18n",
    label: "i18n (5 languages)",
    note: "Dictionary, Trans/vars, SSR lang, hreflang",
  },
  {
    id: "deploy",
    label: "Deploy & Env",
    note: "Vercel / Cloudflare / self-host, runtime limits",
  },
  {
    id: "agents",
    label: "Agent Workflow",
    note: "AGENTS.md, scoped rules, definition of done",
  },
  {
    id: "video",
    label: "Video Studio",
    note: "Consent-gated face-swap jobs, credits, deep-synthesis labeling",
  },
];

export const DEFAULT_CONFIG: BuilderConfig = {
  appName: "my-saas",
  auth: ["google", "github"],
  payment: ["creem"],
  ai: ["openai"],
  features: ["landing", "dashboard", "account", "admin", "premium"],
  deploy: "vercel",
  style: "midnight",
  skills: [
    "frontend",
    "ui",
    "backend",
    "testing",
    "seo",
    "auth",
    "payments",
    "database",
    "rag",
    "i18n",
    "deploy",
    "agents",
  ],
};

/** Slugify an app name into a safe package / file name. */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "shipkit-app"
  );
}
