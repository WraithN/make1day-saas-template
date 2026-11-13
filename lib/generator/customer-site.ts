// Customer-owned site pages for the generated ZIP.
//
// make1day's own marketing pages (home, pricing, blog, compare, faq, license)
// describe make1day.dev — its $249 source license, its competitors, its SEO posts.
// Shipping them inside a customer's starter meant the customer's own site
// was silently advertising our product instead of theirs. This module builds
// a neutral, brand-free starter home + pricing page from the BuilderConfig,
// and rewires the shared chrome (metadata / nav / footer / sitemap / robots).
//
// These are ZIP-only outputs: the on-disk make1day site is untouched.

import type { BuilderConfig } from "./config";

type Lang = "en" | "zh" | "ja" | "fr" | "de";

/** Neutral copy injected into the generated project's i18n dictionary. */
const APP_COPY: Record<Lang, Record<string, string>> = {
  en: {
    "app.hero.eyebrow": "YOUR APPLICATION",
    "app.hero.subtitle":
      "A production-ready Next.js starter. Sign in to explore the dashboard, or set your plans below.",
    "app.hero.cta": "Get started",
    "app.hero.pricing": "See pricing",
    "app.tstars.title": "What builders say",
    "app.stack.title": "What is in this build",
    "app.stack.subtitle":
      "Only the modules you selected are included. Everything below is real, runnable code — no placeholders.",
    "app.stack.auth": "Authentication",
    "app.stack.payments": "Payments",
    "app.stack.ai": "AI providers",
    "app.stack.features": "Features",
    "app.stack.deploy": "Deploy target",
    "app.stack.theme": "Theme",
    "app.pricing.eyebrow": "PRICING",
    "app.pricing.title": "Plans for your product",
    "app.pricing.subtitle":
      "Edit the plan names, prices and feature lists in app/pricing/page.tsx before you launch. Checkout is wired to /api/checkout.",
    "app.plan.free.name": "Free",
    "app.plan.free.f1": "Core starter features",
    "app.plan.free.f2": "Product documentation",
    "app.plan.buyout.name": "One-time",
    "app.plan.buyout.f1": "Everything in Free",
    "app.plan.buyout.f2": "Lifetime access",
    "app.plan.care.name": "Monthly",
    "app.plan.care.f1": "Everything in One-time",
    "app.plan.care.f2": "Ongoing updates and support",
    "app.plan.cta": "Choose plan",
    "app.pricing.note": "Replace these placeholder amounts with your own prices.",
    "app.footer.note": "Built with a clean, brand-free starter.",
  },
  zh: {
    "app.hero.eyebrow": "你的应用",
    "app.hero.subtitle": "一个可直接上线的 Next.js 起步工程。登录后可体验控制台，也可以在下面配置你的套餐。",
    "app.hero.cta": "开始使用",
    "app.hero.pricing": "查看定价",
    "app.tstars.title": "用户的声音",
    "app.stack.title": "本次构建包含",
    "app.stack.subtitle": "只保留你勾选的模块。下面每一项都是真实可运行的代码，不是占位说明。",
    "app.stack.auth": "登录方式",
    "app.stack.payments": "支付",
    "app.stack.ai": "AI 供应商",
    "app.stack.features": "功能模块",
    "app.stack.deploy": "部署目标",
    "app.stack.theme": "主题",
    "app.pricing.eyebrow": "定价",
    "app.pricing.title": "你的产品套餐",
    "app.pricing.subtitle": "上线前请在 app/pricing/page.tsx 里改成你自己的套餐名、价格与权益。结算已接好 /api/checkout。",
    "app.plan.free.name": "免费版",
    "app.plan.free.f1": "起步工程核心能力",
    "app.plan.free.f2": "文档与指南",
    "app.plan.buyout.name": "一次买断",
    "app.plan.buyout.f1": "包含免费版全部能力",
    "app.plan.buyout.f2": "永久使用",
    "app.plan.care.name": "月度订阅",
    "app.plan.care.f1": "包含买断版全部能力",
    "app.plan.care.f2": "持续更新与支持",
    "app.plan.cta": "选择套餐",
    "app.pricing.note": "请把这些占位价格替换成你自己的定价。",
    "app.footer.note": "基于干净的、无品牌残留的起步工程构建。",
  },
  ja: {
    "app.hero.eyebrow": "あなたのアプリ",
    "app.hero.subtitle": "本番対応の Next.js スターターです。ログインしてダッシュボードを試すか、下でプランを設定してください。",
    "app.hero.cta": "はじめる",
    "app.hero.pricing": "料金を見る",
    "app.tstars.title": "導入者の声",
    "app.stack.title": "このビルドに含まれるもの",
    "app.stack.subtitle": "選択したモジュールだけが含まれます。以下はすべて実際に動作するコードです。",
    "app.stack.auth": "認証",
    "app.stack.payments": "決済",
    "app.stack.ai": "AI プロバイダー",
    "app.stack.features": "機能",
    "app.stack.deploy": "デプロイ先",
    "app.stack.theme": "テーマ",
    "app.pricing.eyebrow": "料金",
    "app.pricing.title": "あなたの製品のプラン",
    "app.pricing.subtitle": "公開前に app/pricing/page.tsx のプラン名・価格・特典を書き換えてください。決済は /api/checkout に接続済みです。",
    "app.plan.free.name": "無料",
    "app.plan.free.f1": "スターターの基本機能",
    "app.plan.free.f2": "ドキュメントとガイド",
    "app.plan.buyout.name": "買い切り",
    "app.plan.buyout.f1": "無料プランのすべて",
    "app.plan.buyout.f2": "永続利用",
    "app.plan.care.name": "月額",
    "app.plan.care.f1": "買い切りプランのすべて",
    "app.plan.care.f2": "継続的なアップデートとサポート",
    "app.plan.cta": "プランを選ぶ",
    "app.pricing.note": "この仮の価格を自社の価格に置き換えてください。",
    "app.footer.note": "ブランド混入のないクリーンなスターターで構築。",
  },
  fr: {
    "app.hero.eyebrow": "VOTRE APPLICATION",
    "app.hero.subtitle":
      "Un starter Next.js prêt pour la production. Connectez-vous pour explorer le tableau de bord, ou définissez vos offres ci-dessous.",
    "app.hero.cta": "Commencer",
    "app.hero.pricing": "Voir les tarifs",
    "app.tstars.title": "Ce qu'en disent les builders",
    "app.stack.title": "Contenu de cette version",
    "app.stack.subtitle":
      "Seuls les modules sélectionnés sont inclus. Tout ce qui suit est du code réel et exécutable.",
    "app.stack.auth": "Authentification",
    "app.stack.payments": "Paiements",
    "app.stack.ai": "Fournisseurs IA",
    "app.stack.features": "Fonctionnalités",
    "app.stack.deploy": "Cible de déploiement",
    "app.stack.theme": "Thème",
    "app.pricing.eyebrow": "TARIFS",
    "app.pricing.title": "Les offres de votre produit",
    "app.pricing.subtitle":
      "Modifiez les noms, prix et avantages dans app/pricing/page.tsx avant le lancement. Le paiement est branché sur /api/checkout.",
    "app.plan.free.name": "Gratuit",
    "app.plan.free.f1": "Fonctions de base du starter",
    "app.plan.free.f2": "Documentation produit",
    "app.plan.buyout.name": "Achat unique",
    "app.plan.buyout.f1": "Tout le plan Gratuit",
    "app.plan.buyout.f2": "Accès à vie",
    "app.plan.care.name": "Mensuel",
    "app.plan.care.f1": "Tout le plan Achat unique",
    "app.plan.care.f2": "Mises à jour et support continus",
    "app.plan.cta": "Choisir",
    "app.pricing.note": "Remplacez ces montants fictifs par vos propres tarifs.",
    "app.footer.note": "Construit sur un starter propre, sans marque tierce.",
  },
  de: {
    "app.hero.eyebrow": "DEINE ANWENDUNG",
    "app.hero.subtitle":
      "Ein produktionsreifes Next.js-Starterprojekt. Melde dich an, um das Dashboard zu erkunden, oder lege unten deine Tarife fest.",
    "app.hero.cta": "Loslegen",
    "app.hero.pricing": "Preise ansehen",
    "app.tstars.title": "Was Builder sagen",
    "app.stack.title": "In diesem Build enthalten",
    "app.stack.subtitle":
      "Nur die ausgewählten Module sind enthalten. Alles unten ist echter, ausführbarer Code.",
    "app.stack.auth": "Authentifizierung",
    "app.stack.payments": "Zahlungen",
    "app.stack.ai": "KI-Anbieter",
    "app.stack.features": "Funktionen",
    "app.stack.deploy": "Deployment-Ziel",
    "app.stack.theme": "Theme",
    "app.pricing.eyebrow": "PREISE",
    "app.pricing.title": "Tarife für dein Produkt",
    "app.pricing.subtitle":
      "Passe vor dem Launch Namen, Preise und Leistungen in app/pricing/page.tsx an. Der Checkout ist mit /api/checkout verdrahtet.",
    "app.plan.free.name": "Kostenlos",
    "app.plan.free.f1": "Kernfunktionen des Starters",
    "app.plan.free.f2": "Produktdokumentation",
    "app.plan.buyout.name": "Einmalig",
    "app.plan.buyout.f1": "Alles aus Kostenlos",
    "app.plan.buyout.f2": "Lebenslanger Zugang",
    "app.plan.care.name": "Monatlich",
    "app.plan.care.f1": "Alles aus Einmalig",
    "app.plan.care.f2": "Laufende Updates und Support",
    "app.plan.cta": "Tarif wählen",
    "app.pricing.note": "Ersetze diese Platzhalterpreise durch deine eigenen Preise.",
    "app.footer.note": "Erstellt mit einem sauberen Starter ohne Fremdmarken.",
  },
};

/**
 * Inject the neutral `app.*` keys into each locale block of the shipped
 * lib/i18n-core.ts. The keys are ZIP-only: make1day's own on-disk dictionary
 * never gains them, and the generated pages resolve them through tr()/t().
 */
export function injectAppCopy(source: string): string {
  let out = source;
  for (const lang of ["en", "zh", "ja", "fr", "de"] as Lang[]) {
    const lines = Object.entries(APP_COPY[lang])
      .map(([k, v]) => `    "${k}": ${JSON.stringify(v)},`)
      .join("\n");
    const marker = `  ${lang}: {\n`;
    if (!out.includes(marker)) continue;
    out = out.replace(marker, `${marker}    // ── Customer-owned starter copy (generated) ──\n${lines}\n\n`);
  }
  return out;
}

/** Human-readable labels for the selected modules, used on the home page. */
const FEATURE_LABELS: Record<string, string> = {
  landing: "Landing page",
  dashboard: "Dashboard",
  rag: "Hybrid RAG",
  multitenancy: "Multi-tenancy",
  account: "User console",
  admin: "Admin console",
  premium: "Paid content",
};

function stackRows(config: BuilderConfig): string {
  const rows: [string, string][] = [
    ["app.stack.auth", config.auth.length ? config.auth.join(", ") : "—"],
    ["app.stack.payments", config.payment.length && !config.payment.includes("none") ? config.payment.join(", ") : "Disabled"],
    ["app.stack.ai", config.ai.length ? config.ai.join(", ") : "—"],
    [
      "app.stack.features",
      config.features.map((f) => FEATURE_LABELS[f] ?? f).join(", ") || "—",
    ],
    ["app.stack.deploy", config.deploy],
    ["app.stack.theme", config.style],
  ];
  return rows
    .map(
      ([key, value]) =>
        `    { label: ${JSON.stringify(key)}, value: ${JSON.stringify(value)} },`,
    )
    .join("\n");
}

/** Brand-free home page for the customer's own application. */
/** Scene strip: the real production stages of the vertical. Empty for
 *  classic configs — landing depth only where the vertical justifies it. */
function sceneStages(c: BuilderConfig): string[] {
  if (c.features.includes("video"))
    return ["Brief", "Script", "Storyboard", "Cost quote", "Visuals + voice", "Assembly + diff-edit"];
  if (c.ai.length && c.features.includes("premium") && !c.features.includes("rag"))
    return ["Brand kit", "Prompt recipe", "Routing + queue", "Refine chain", "Deliver + storage", "Batch + API"];
  if (c.features.includes("rag"))
    return ["Ingest", "Chunk + index", "Cite + verify", "Grounded answer", "Escalate to human"];
  return [];
}

/** Metric tiles under the pipeline strip — per-vertical unit economics. */
function sceneMetrics(c: BuilderConfig): { label: string; value: string }[] {
  if (c.features.includes("video"))
    return [
      { label: "Quote before render", value: "Yes" },
      { label: "Diff-only re-render", value: "85–95% reuse" },
      { label: "60s ad run cost", value: "$0.50–1.50" },
    ];
  if (c.features.includes("rag"))
    return [
      { label: "Answers cite sources", value: "Always" },
      { label: "Isolated indexes", value: "Per workspace" },
      { label: "No-key fallback", value: "BM25" },
    ];
  if (c.ai.length && c.features.includes("premium"))
    return [
      { label: "Credits metered per", value: "Model × size" },
      { label: "Accepted-image cost", value: "price × regen" },
      { label: "Per-key spend cap", value: "Configurable" },
    ];
  return [];
}

export function buildCustomerHome(config: BuilderConfig): string {
  const name = JSON.stringify(config.appName);
  const stages = sceneStages(config);
  const metrics = sceneMetrics(config);
  const stagesJs = stages.map((s) => JSON.stringify(s)).join(", ");
  const metricsJs = metrics
    .map((m) => `{ label: ${JSON.stringify(m.label)}, value: ${JSON.stringify(m.value)} }`)
    .join(",\n            ");
  const pipelineSection = stages.length
    ? `
      <section className="wrap py-16">
        <div className="eyebrow mb-3">The pipeline</div>
        <div className="flex flex-wrap items-center gap-2">
          {STAGES.map((stage, i) => (
            <div key={stage} className="flex items-center gap-2">
              <span className="card px-3 py-1.5 text-sm">
                <span className="font-mono text-xs text-ink-soft">{i + 1}.</span>{" "}
                {stage}
              </span>
              {i < STAGES.length - 1 && (
                <span aria-hidden className="text-ink-soft">→</span>
              )}
            </div>
          ))}
        </div>
        {METRICS.length > 0 && (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {METRICS.map((m) => (
              <div key={m.label} className="card">
                <div className="eyebrow mb-2">{m.label}</div>
                <div className="text-lg font-semibold">{m.value}</div>
              </div>
            ))}
          </div>
        )}
      </section>
`
    : "";
  return `// Generated starter landing page for ${config.appName}.
// This is YOUR landing page: edit the copy in lib/i18n-core.ts (app.*) and
// the module cards below to describe your own product.
import Link from "next/link";
import { getLang, tr } from "@/lib/i18n-server";
import { TestimonialWall, type Testimonial } from "@/components/TestimonialWall";

const APP_NAME = ${name};

const STACK: { label: string; value: string }[] = [
${stackRows(config)}
];

const STAGES: string[] = [${stagesJs}];

const METRICS: { label: string; value: string }[] = ${
    metrics.length
      ? `[\n            ${metricsJs},\n          ]`
      : "[]"
  };

// SAMPLE QUOTES — placeholder social proof so the wall renders out of the
// box. Replace each entry with a real customer voice (link it with \`url\`),
// or set TESTIMONIALS = [] to hide the section entirely. Never ship invented
// praise as if it were real: it is the fastest way to lose a customer's trust
// and, in some markets, a legal problem.
const TESTIMONIALS: Testimonial[] = [
  {
    quote: "Went from clone to first paying customer in six days. The webhook and license plumbing was already done - I only wrote the product.",
    name: "Maya K.",
    handle: "@mayabuilds",
  },
  {
    quote: "The generated AGENTS.md meant my coding agent understood the repo immediately. First starter where the AI needed zero hand-holding.",
    name: "Tomas R.",
    handle: "@tomasr_dev",
  },
  {
    quote: "Deleted whole folders I hadn't opted into and it still compiled. That alone is worth the price.",
    name: "Priya N.",
    handle: "@priyaships",
  },
  {
    quote: "The per-run cost ledger caught a bad prompt route that was eating a third of my AI budget.",
    name: "Jonas W.",
    handle: "@jonasw",
  },
];

export default async function HomePage() {
  const lang = await getLang();
  const c = (k: string) => tr(lang, k);
  return (
    <div>
      <section className="wrap py-16 text-center sm:py-24">
        <div className="eyebrow mb-4">{c("app.hero.eyebrow")}</div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
          {APP_NAME}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-ink-soft">
          {c("app.hero.subtitle")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/login" className="btn-solid" data-cta="home-signup">
            {c("app.hero.cta")}
          </Link>
          <Link href="/pricing" className="btn-ghost" data-cta="home-pricing">
            {c("app.hero.pricing")}
          </Link>
        </div>
      </section>
${pipelineSection}
      <section className="wrap py-16">
        <div className="eyebrow mb-6">{c("app.tstars.title")}</div>
        <TestimonialWall items={TESTIMONIALS} />
      </section>
      <section className="wrap pb-20">
        <h2 className="text-2xl font-semibold">{c("app.stack.title")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          {c("app.stack.subtitle")}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STACK.map((item) => (
            <div key={item.label} className="card">
              <div className="eyebrow mb-2">{c(item.label)}</div>
              <div className="text-sm text-ink">{item.value}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
`;
}

/**
 * Brand-free pricing skeleton. The two paid plan ids MUST stay "buyout" /
 * "care" because /api/checkout validates that enum; only the display copy and
 * the amounts are yours to change.
 */
export function buildCustomerPricing(config: BuilderConfig): string {
  const hasPayments = config.payment.length > 0 && !config.payment.includes("none");
  const priceImport = hasPayments
    ? 'import { priceForPlan } from "@/lib/env";\n'
    : "";
  return `// Generated starter pricing page for ${config.appName}.
// EDIT THE PLAN DATA BELOW: names, amounts and feature keys describe YOUR
// product. The paid plan ids must stay "buyout" / "care" (the enum accepted
// by /api/checkout); priceForPlan resolves their live price ids from env.
import { PricingCards, type Plan } from "@/components/PricingCards";
${priceImport}import { getLang, tr } from "@/lib/i18n-server";

// ── Display prices, configurable via env (never hard-coded in your UI). ──
// Set NEXT_PUBLIC_PRICE_BUYOUT_DISPLAY / NEXT_PUBLIC_PRICE_CARE_DISPLAY to
// match the real amounts configured at your payment provider.
const AMOUNTS = {
  buyout: process.env.NEXT_PUBLIC_PRICE_BUYOUT_DISPLAY ?? "$99",
  care: process.env.NEXT_PUBLIC_PRICE_CARE_DISPLAY ?? "$19",
} as const;

export default async function PricingPage() {
  const lang = await getLang();
  const c = (k: string) => tr(lang, k);

  const plans: Plan[] = [
    {
      id: "free",
      name: c("app.plan.free.name"),
      price: "$0",
      period: "",
      forever: true,
      features: ["app.plan.free.f1", "app.plan.free.f2"],
      ctaKey: "app.plan.cta",
      priceId: null,
      muted: true,
    },
    {
      id: "buyout",
      name: c("app.plan.buyout.name"),
      price: AMOUNTS.buyout,
      period: "",
      once: true,
      features: ["app.plan.buyout.f1", "app.plan.buyout.f2"],
      ctaKey: "app.plan.cta",
      priceId: ${hasPayments ? 'priceForPlan("buyout") || null' : "null"},
      highlight: true,
    },
    {
      id: "care",
      name: c("app.plan.care.name"),
      price: AMOUNTS.care,
      period: "",
      monthly: true,
      features: ["app.plan.care.f1", "app.plan.care.f2"],
      ctaKey: "app.plan.cta",
      priceId: ${hasPayments ? 'priceForPlan("care") || null' : "null"},
    },
  ];

  return (
    <section className="wrap py-12 sm:py-20">
      <div className="text-center">
        <div className="eyebrow mb-3">{c("app.pricing.eyebrow")}</div>
        <h1 className="text-3xl font-semibold sm:text-4xl">
          {c("app.pricing.title")}
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-ink-soft">
          {c("app.pricing.subtitle")}
        </p>
      </div>
      <div className="mt-10">
        <PricingCards plans={plans} />
      </div>
      <p className="mt-8 text-center font-mono text-xs text-muted">
        {c("app.pricing.note")}
      </p>
    </section>
  );
}
`;
}

/** Sitemap listing only routes that actually exist in the generated build. */
export function buildCustomerSitemap(config: BuilderConfig): string {
  const routes: { path: string; priority: number }[] = [
    { path: "", priority: 1 },
    { path: "/pricing", priority: 0.8 },
    { path: "/privacy", priority: 0.4 },
    { path: "/terms", priority: 0.4 },
  ];
  if (config.features.includes("rag")) {
    routes.push({ path: "/rag", priority: 0.6 });
  }
  const rows = routes
    .map((r) => `    { path: ${JSON.stringify(r.path)}, priority: ${r.priority} },`)
    .join("\n");
  return `import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const LANGS = ["en", "zh", "ja", "fr", "de"];

// Only routes that exist in this build. Regenerate this list if you add pages.
// Site-only routes (support, auth-recovery, the generator, marketing pages
// and the operator ticket console) are deliberately NOT listed here: the
// generated chrome strips their links so no dead link survives.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: { path: string; priority: number }[] = [
${rows}
  ];
  const entries: MetadataRoute.Sitemap = [];
  for (const r of routes) {
    entries.push({
      url: \`\${BASE}\${r.path}\`,
      lastModified: now,
      changeFrequency: r.path === "" ? "weekly" : "monthly",
      priority: r.priority,
    });
    for (const l of LANGS) {
      if (l === "en") continue;
      entries.push({
        url: l === "en" ? \`\${BASE}\${r.path || "/"}\` : \`\${BASE}/\${l}\${r.path || ""}\`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: r.priority - 0.1,
      });
    }
  }
  return entries;
}
`;
}

/** Robots file with no make1day-specific endpoints. */
export function buildCustomerRobots(): string {
  return `import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  const rule = {
    userAgent: "*",
    allow: ["/"],
    disallow: ["/dashboard", "/account", "/admin", "/api/", "/auth/"],
  };
  return {
    rules: rule,
    sitemap: \`\${BASE}/sitemap.xml\`,
    host: BASE,
  };
}
`;
}

// ── Shared chrome rewrites ────────────────────────────────────────────────

/** Replace the make1day metadata + JSON-LD blocks with the customer's brand. */
export function neutralizeRootLayout(source: string, appName: string): string {
  const safe = JSON.stringify(appName);
  const metadata = `export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: APP_NAME, template: \`%s · \${APP_NAME}\` },
  description: \`\${APP_NAME} — a Next.js starter ready to launch.\`,
  applicationName: APP_NAME,
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: ${safe},
    title: ${safe},
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: ${safe} },
  robots: { index: true, follow: true },
};`;
  const org = `const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: APP_NAME,
  url: SITE_URL,
};`;
  const site = `const SITE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: APP_NAME,
  url: SITE_URL,
  inLanguage: ["en", "zh", "ja", "fr", "de"],
};`;

  let out = source
    .replace(/export const metadata: Metadata = \{[\s\S]*?\n\};/, metadata)
    .replace(/const ORG_JSONLD = \{[\s\S]*?\n\};/, org)
    .replace(/const SITE_JSONLD = \{[\s\S]*?\n\};/, site);
  // The JSON-LD blocks now reference APP_NAME; declare it next to SITE_URL.
  out = out.replace(
    /const SITE_URL = [^\n]+;/,
    (m) => `${m}\nconst APP_NAME = ${safe};`,
  );
  // Never hard-code our own domain as the fallback in a customer's repo.
  out = out.replaceAll("https://make1day.com", "http://localhost:3000");
  return out;
}

/** Drop the make1day-only links from the generated navigation. */
export function customerNav(source: string): string {
  return source
    .replace(/\s*\{ href: "\/blog", label: t\("nav\.blog"\) \},/, "")
    .replace(/\s*\{ href: "\/styles", label: t\("nav\.styles"\) \},/, "")
    .replace(/\s*\{ href: "\/builder", label: t\("nav\.builder"\) \},/, "")
    // /support is a make1day-site-only page. Strip its nav item so the
    // generated project never links to a route that is absent from the ZIP.
    .replace(/\s*\{ href: "\/support", label: t\("nav\.support"\) \},/, "")
    // /templates (sample sites) and /black-friday (promo) are make1day-owned
    // marketing pages; neither ships in a customer ZIP, so their nav entries
    // must be removed or every generated app gets a dead link.
    .replace(/\s*\{ href: "\/templates", label: t\("nav\.templates"\) \},/, "")
    .replace(/\s*\{ href: "\/black-friday", label: t\("nav\.blackfriday"\) \},/, "");
}

/** Replace the make1day wordmark in Nav with the app name. */
export function customerNavBrand(source: string, appName: string): string {
  const safe = JSON.stringify(appName);
  return source
    .replace(
      /<Link href="\/" className="shrink-0 font-semibold tracking-tight">[\s\S]*?<\/Link>/,
      `<Link href="/" className="shrink-0 font-semibold tracking-tight">{${safe}}</Link>`,
    );
}

/** Remove our own product links from the generated footer. */
export function customerFooter(source: string, appName: string): string {
  const safe = JSON.stringify(appName);
  return source
    .replace(/\s*<Link href="\/blog"[\s\S]*?<\/Link>/, "")
    // /support is make1day-site-only — remove its footer link too.
    .replace(/\s*<Link href="\/support"[\s\S]*?<\/Link>/, "")
    // /builder, /styles and /templates are make1day-site-only (pruned from the
    // customer ZIP), so their footer links must be stripped too.
    .replace(/\s*<Link href="\/builder"[\s\S]*?<\/Link>/, "")
    .replace(/\s*<Link href="\/styles"[\s\S]*?<\/Link>/, "")
    .replace(/\s*<Link href="\/templates"[\s\S]*?<\/Link>/, "")
    .replace(/\s*<a\s+href="https:\/\/github\.com\/uncorne\/shipkit"[\s\S]*?<\/a>/, "")
    // Matches the single-brand footer line (product — tagline). The site no
    // longer repeats the company name twice, so the old "…<span>make1day</span>."
    // anchor is gone; stop at the wrapper's closing </div> instead.
    .replace(
      /<span className="font-semibold text-ink">make1day<\/span>[\s\S]*?<\/div>/,
      `<span className="font-semibold text-ink">{APP_NAME}</span> — <span>{tr(lang, "app.footer.note")}</span></div>`,
    )
    .replace(
      /export async function Footer\(\) \{/,
      `const APP_NAME = ${safe};\n\nexport async function Footer() {`,
    );
}

/** Point the /license shortcut at a route that survives in customer builds. */
export function customerLicenseLinks(source: string): string {
  return source.replaceAll('href="/license"', 'href="/pricing"');
}

/**
 * /forgot-password (and the whole auth-recovery flow) is make1day-site-only.
 * The login page ships in every build, so strip its "forgot password" anchor
 * or the generated project would link to a route that is absent from the ZIP.
 */
export function customerLoginLinks(source: string): string {
  return source.replace(/\s*<a\s+href="\/forgot-password"[\s\S]*?<\/a>/, "");
}

/**
 * Replace our product/company names in files the customer keeps. Applied only
 * to a fixed list of source files — never to the whole ZIP, because LICENSE
 * and the generated README must keep their provenance.
 */
export function neutralizeBrand(source: string, appName: string): string {
  // Wire-level identifiers are NOT branding. A cosmetic rebrand must never
  // rename a header/cookie/filename that an issued key or client depends on.
  const KEEP = [
    "X-App-Entitlement",
    "x-app-license",
    "app-template.config.json",
    "app.db",
    "SK1.",
  ];
  const slug = appName.toLowerCase().replace(/[^a-z0-9]+/g, "");
  let out = source;
  KEEP.forEach((literal, i) => {
    out = out.split(literal).join(`@@WIRE${i}@@`);
  });
  // Domains must be rewritten BEFORE the brand word, otherwise the domain
  // becomes `<brand>.dev` and still points at us. Legacy names are kept here
  // so an older template re-generated through this builder is cleaned too.
  out = out
    .replaceAll("https://make1day.com", "http://localhost:3000")
    .replaceAll("make1day.com", `${slug}.example`)
    // The storefront brand is written as the domain "make1day.dev" in UI
    // copy; strip it BEFORE the bare word, otherwise a leftover ".dev"
    // would stick onto the customer's app name.
    .replaceAll("make1day.dev", appName)
    .replaceAll("uncorne/shipkit", `${slug}/app`)
    .replaceAll("ShipYourProduct", appName)
    .replaceAll("ShipKit", appName)
    .replaceAll("Uncorne", appName)
    .replaceAll("make1day", appName);
  KEEP.forEach((literal, i) => {
    out = out.split(`@@WIRE${i}@@`).join(literal);
  });
  return out;
}

/**
 * Legal page template for generated projects. make1day's own privacy/terms
 * describe OUR company and OUR data processing — shipping them would be both
 * wrong branding and legally misleading. Instead we ship a structured,
 * config-driven template: entity and contact come from the customer's env,
 * and every factual claim that only the operator knows is explicitly marked
 * as a field to fill in (never invented).
 */
export function buildCustomerLegal(
  kind: "privacy" | "terms",
  config: BuilderConfig,
): string {
  const title = kind === "privacy" ? "Privacy Policy" : "Terms of Service";
  const description =
    kind === "privacy"
      ? "How this application handles data, cookies and privacy choices."
      : "The terms governing the use of this application.";
  const component = kind === "privacy" ? "Privacy" : "Terms";
  const sections =
    kind === "privacy"
      ? [
          ["1. Data controller", "The controller is the entity below. Set NEXT_PUBLIC_LEGAL_ENTITY and NEXT_PUBLIC_PRIVACY_EMAIL before launch."],
          ["2. Data we store", "List the categories you actually collect (account email, orders, support messages, telemetry). The starter's default build stores account, order and license records; modules you disabled are not present."],
          ["3. Purpose and legal basis", "State why each category is processed and the legal basis that applies in your jurisdictions."],
          ["4. Retention", "Define retention per category and the deletion schedule you actually run. Do not claim automatic deletion unless it is implemented."],
          ["5. Sub-processors and transfers", "List payment, mail, hosting and analytics providers you use, plus any cross-border transfer safeguards."],
          ["6. Your rights", "Describe access, correction, export and deletion requests and how users exercise them."],
          ["7. Cookies", "List the cookies this deployment sets and their lifetimes."],
        ]
      : [
          ["1. Parties and scope", "Identify the operator (below) and what service these terms cover."],
          ["2. Accounts and acceptable use", "State your own rules for accounts, prohibited conduct and suspension."],
          ["3. Payments, refunds and cancellation", "State your real price, billing period, refund window and cancellation process. These must match your payment provider's settings."],
          ["4. License to the software", "State the license granted for any source or hosted deliverable and the restrictions that apply."],
          ["5. Disclaimers and liability", "Have counsel draft the warranty and liability terms for your jurisdiction."],
          ["6. Governing law and contact", "State the governing law, dispute process and the contact address below."],
        ];
  const sectionJsx = sections
    .map(
      ([heading, body]) =>
        `        <h2 className="mt-8 text-xl font-semibold">${heading}</h2>\n` +
        `        <p className="mt-2 text-ink-soft">${body}</p>`,
    )
    .join("\n");

  return `// Generated legal template for ${config.appName}.
// This is a STRUCTURED STARTING POINT, not legal advice: replace every
// bracketed / descriptive field with your own real practices before launch.
// Entity and contact are read from env so a rebrand needs no code edit.
import type { Metadata } from "next";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: ${JSON.stringify(title)},
  description: ${JSON.stringify(description)},
};

export default function ${component}Page() {
  const entity = env.legalEntity();
  const contact = env.privacyEmail();
  return (
    <section className="wrap prose-sm py-12 sm:py-20">
      <h1 className="text-3xl font-semibold">${title}</h1>
      <p className="mt-4 max-w-2xl text-ink-soft">
        Operator: <strong>{entity}</strong> · Contact:{" "}
        <span className="font-mono">{contact}</span>
      </p>
      <p className="mt-3 max-w-2xl text-ink-soft">
        This template is shipped with the starter. Each section below describes
        the field an operator must complete; it does not assert a practice your
        deployment may not have. Review with counsel before going live.
      </p>
${sectionJsx}
    </section>
  );
}
`;
}
