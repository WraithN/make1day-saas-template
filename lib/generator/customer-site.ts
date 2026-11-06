// Customer-owned site pages for the generated ZIP.
//
// ShipKit's own marketing pages (home, pricing, blog, compare, faq, license)
// describe SHIPKIT — its $99 source license, its competitors, its SEO posts.
// Shipping them inside a customer's starter meant the customer's own site
// was silently advertising our product instead of theirs. This module builds
// a neutral, brand-free starter home + pricing page from the BuilderConfig,
// and rewires the shared chrome (metadata / nav / footer / sitemap / robots).
//
// These are ZIP-only outputs: the on-disk ShipKit site is untouched.

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
    "app.plan.free.f2": "Community support",
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
    "app.plan.free.f2": "社区支持",
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
    "app.plan.free.f2": "コミュニティサポート",
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
    "app.plan.free.f2": "Support communautaire",
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
    "app.plan.free.f2": "Community-Support",
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
 * lib/i18n-core.ts. The keys are ZIP-only: ShipKit's own on-disk dictionary
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
    ["app.stack.payments", config.payment === "none" ? "Disabled" : config.payment],
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
export function buildCustomerHome(config: BuilderConfig): string {
  const name = JSON.stringify(config.appName);
  return `// Generated starter landing page for ${config.appName}.
// This is YOUR landing page: edit the copy in lib/i18n-core.ts (app.*) and
// the module cards below to describe your own product.
import Link from "next/link";
import { getLang, tr } from "@/lib/i18n-server";

const APP_NAME = ${name};

const STACK: { label: string; value: string }[] = [
${stackRows(config)}
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
  const hasPayments = config.payment !== "none";
  const priceImport = hasPayments
    ? 'import { priceForPlan } from "@/lib/env";\n'
    : "";
  return `// Generated starter pricing page for ${config.appName}.
// EDIT THE PLAN DATA BELOW: names, amounts and feature keys describe YOUR
// product. The paid plan ids must stay "buyout" / "care" (the enum accepted
// by /api/checkout); priceForPlan resolves their live price ids from env.
import { PricingCards, type Plan } from "@/components/PricingCards";
${priceImport}import { getLang, tr } from "@/lib/i18n-server";

// ── Your prices. Replace these placeholder amounts before launch. ──
const AMOUNTS = { buyout: "$99", care: "$19" } as const;

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
        url: \`\${BASE}\${r.path || "/"}?lang=\${l}\`,
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

/** Robots file with no ShipKit-specific endpoints. */
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

/** Replace the ShipKit metadata + JSON-LD blocks with the customer's brand. */
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
  out = out.replaceAll("https://shipkit.dev", "http://localhost:3000");
  return out;
}

/** Drop the ShipKit-only links from the generated navigation. */
export function customerNav(source: string): string {
  return source
    .replace(/\s*\{ href: "\/blog", label: t\("nav\.blog"\) \},/, "")
    .replace(/\s*\{ href: "\/styles", label: t\("nav\.styles"\) \},/, "")
    .replace(/\s*\{ href: "\/builder", label: t\("nav\.builder"\) \},/, "");
}

/** Replace the "ShipKit by Uncorne" wordmark in Nav with the app name. */
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
    .replace(/\s*<Link href="\/agent-ready"[\s\S]*?<\/Link>/, "")
    .replace(/\s*<a\s+href="https:\/\/github\.com\/uncorne\/shipkit"[\s\S]*?<\/a>/, "")
    .replace(
      /<span className="font-semibold text-ink">ShipKit<\/span>[\s\S]*?<span className="font-mono">Uncorne<\/span>\./,
      `<span className="font-semibold text-ink">{APP_NAME}</span> — <span>{tr(lang, "app.footer.note")}</span>.`,
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

/** Remove the hard-coded ShipKit domain fallback from the SEO helper. */
export function customerSeoLinks(source: string): string {
  return source.replaceAll("https://shipkit.dev", "http://localhost:3000");
}

/**
 * Replace our product/company names in files the customer keeps. Applied only
 * to a fixed list of source files — never to the whole ZIP, because LICENSE
 * and the generated README must keep their provenance.
 */
export function neutralizeBrand(source: string, appName: string): string {
  return source
    .replaceAll("ShipKit", appName)
    .replaceAll("Uncorne", appName)
    .replaceAll("uncorne.com", "example.com")
    .replaceAll("uncorne/shipkit", `${appName.toLowerCase()}/app`)
    .replaceAll("https://shipkit.dev", "http://localhost:3000")
    .replaceAll("shipkit.dev", "localhost:3000");
}

/**
 * Placeholder legal pages. ShipKit's own privacy/terms describe OUR company,
 * our data controller and our contact address — shipping them would be both
 * wrong branding and legally misleading. The customer must supply their own.
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
  return `// PLACEHOLDER — replace this page with your own ${title} before launch.
// The generated project does not know your legal entity, data controller or
// contact address. The starter's own legal text is deliberately NOT shipped.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: ${JSON.stringify(title)},
  description: ${JSON.stringify(description)},
};

export default function ${kind === "privacy" ? "Privacy" : "Terms"}Page() {
  return (
    <section className="wrap prose-sm py-12 sm:py-20">
      <h1 className="text-3xl font-semibold">${title}</h1>
      <p className="mt-4 max-w-2xl text-ink-soft">
        This is a placeholder for ${JSON.stringify(config.appName)}. Replace it
        with your own ${title}: describe what data you collect, how long you
        keep it, who the data controller is, and how users can contact you.
      </p>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Contact: <span className="font-mono">legal@example.com</span>
      </p>
    </section>
  );
}
`;
}
