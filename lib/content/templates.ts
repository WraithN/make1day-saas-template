// Template gallery + sample-site (样板间) data.
//
// Each entry is a real make1day starter template. The gallery links to a live
// preview that renders an actual marketing site generated from that template
// (real theme variables from lib/generator/themes, not a screenshot), so a
// visitor can see exactly what "using this template" produces.
//
// These are make1day-site-only marketing assets (listed in
// lib/generator/prune.ts SITE_MARKETING_FILES) and never ship in a customer ZIP.

import type { Lang } from "@/lib/i18n-core";
import type { StyleId } from "@/lib/generator/config";

export type TText = Record<Lang, string>;

export interface TemplateMeta {
  slug: string;
  styleId: StyleId;
  /** Short category chip shown on the card + preview nav. */
  category: TText;
  /** Brand / product name used as the generated site's wordmark. */
  name: TText;
  heroTitle: TText;
  heroSubtitle: TText;
  /** Three benefit lines rendered as the preview's feature cards. */
  features: TText[];
  pricingLabel: TText;
  /** Fixed display price (no i18n — currency is intentionally uniform). */
  pricingPrice: string;
  primaryCta: TText;
}

export const TEMPLATES: TemplateMeta[] = [
  {
    slug: "ignite-fit",
    styleId: "sunset",
    category: { en: "Fitness", zh: "健身", ja: "フィットネス", fr: "Fitness", de: "Fitness" },
    name: { en: "Ignite Fit", zh: "燃动健身", ja: "Ignite Fit", fr: "Ignite Fit", de: "Ignite Fit" },
    heroTitle: {
      en: "Train smarter, not harder.",
      zh: "更聪明地训练，而非更辛苦。",
      ja: "賢くトレーニング。",
      fr: "Entraînez-vous plus intelligemment.",
      de: "Trainiere schlauer, nicht härter.",
    },
    heroSubtitle: {
      en: "A coaching landing page that turns visitors into members.",
      zh: "把访客变成会员的教练落地页。",
      ja: "訪問者を会員に変えるコーチングページ。",
      fr: "Une page qui transforme les visiteurs en membres.",
      de: "Eine Coaching-Seite, die Besucher zu Mitgliedern macht.",
    },
    features: [
      { en: "Book sessions in one tap", zh: "一键预约课程", ja: "ワンタップ予約", fr: "Réservez en un clic", de: "In einem Klick buchen" },
      { en: "Track every rep and PR", zh: "记录每组与极限", ja: "回数と記録を管理", fr: "Suivez chaque série", de: "Jede Wiederholung tracken" },
      { en: "Members portal included", zh: "含会员中心", ja: "会員ポータル付き", fr: "Portail membres inclus", de: "Mitgliederbereich inkl." },
    ],
    pricingLabel: { en: "Monthly plan", zh: "月度套餐", ja: "月額プラン", fr: "Formule mensuelle", de: "Monatsplan" },
    pricingPrice: "$29/mo",
    primaryCta: { en: "Start free trial", zh: "免费试用", ja: "無料トライアル", fr: "Essai gratuit", de: "Kostenlos testen" },
  },
  {
    slug: "lumi-blog",
    styleId: "paper",
    category: { en: "Content", zh: "内容", ja: "コンテンツ", fr: "Contenu", de: "Content" },
    name: { en: "Lumi Blog", zh: "流光博客", ja: "Lumi Blog", fr: "Lumi Blog", de: "Lumi Blog" },
    heroTitle: {
      en: "Write. Publish. Grow.",
      zh: "写作、发布、成长。",
      ja: "書いて、公開して、育てる。",
      fr: "Écrivez. Publiez. Grandissez.",
      de: "Schreiben. Veröffentlichen. Wachsen.",
    },
    heroSubtitle: {
      en: "A clean newsletter + blog starter with built-in SEO.",
      zh: "内置 SEO 的清爽博客与通讯启动模板。",
      ja: "SEO 組み込みのシンプルなブログ＋ニュースレター。",
      fr: "Un blog et une newsletter avec SEO intégré.",
      de: "Ein Blog + Newsletter mit eingebauter SEO.",
    },
    features: [
      { en: "Markdown-first editor", zh: "Markdown 优先编辑器", ja: "Markdown 主眼の編集", fr: "Éditeur Markdown", de: "Markdown-Editor" },
      { en: "Newsletter signups", zh: "通讯订阅", ja: "ニュースレター登録", fr: "Inscriptions newsletter", de: "Newsletter-Anmeldung" },
      { en: "Hreflang + JSON-LD", zh: "hreflang + JSON-LD", ja: "hreflang + JSON-LD", fr: "Hreflang + JSON-LD", de: "Hreflang + JSON-LD" },
    ],
    pricingLabel: { en: "Supporter", zh: "支持者", ja: "サポーター", fr: "Soutien", de: "Unterstützer" },
    pricingPrice: "$9/mo",
    primaryCta: { en: "Read the demo", zh: "看演示", ja: "デモを見る", fr: "Voir la démo", de: "Demo ansehen" },
  },
  {
    slug: "pixel-store",
    styleId: "pixel",
    category: { en: "Store", zh: "商店", ja: "ストア", fr: "Boutique", de: "Shop" },
    name: { en: "Pixel Store", zh: "像素商店", ja: "Pixel Store", fr: "Pixel Store", de: "Pixel Store" },
    heroTitle: {
      en: "Sell your digital goods.",
      zh: "售卖你的数字商品。",
      ja: "デジタル商品を売る。",
      fr: "Vendez vos produits numériques.",
      de: "Verkaufe digitale Waren.",
    },
    heroSubtitle: {
      en: "An indie storefront with checkout and a download vault.",
      zh: "带结账与下载库的独立商店前台。",
      ja: "決済とダウンロード庫付きのストア。",
      fr: "Une vitrine avec paiement et coffre de téléchargement.",
      de: "Ein Shop mit Kasse und Download-Tresor.",
    },
    features: [
      { en: "Instant checkout", zh: "即时结账", ja: "即時決済", fr: "Paiement instantané", de: "Sofort-Kasse" },
      { en: "License-key delivery", zh: "授权码交付", ja: "ライセンス配信", fr: "Livraison de clés", de: "Lizenz-Lieferung" },
      { en: "No marketplace cut", zh: "无平台抽成", ja: "手数料なし", fr: "Sans commission", de: "Keine Gebühr" },
    ],
    pricingLabel: { en: "Per sale", zh: "按笔计费", ja: "売上ごと", fr: "Par vente", de: "Pro Verkauf" },
    pricingPrice: "5% + $0.30",
    primaryCta: { en: "Open the store", zh: "逛商店", ja: "ストアを開く", fr: "Ouvrir la boutique", de: "Shop öffnen" },
  },
  {
    slug: "aurora-saas",
    styleId: "aurora",
    category: { en: "SaaS", zh: "SaaS", ja: "SaaS", fr: "SaaS", de: "SaaS" },
    name: { en: "Aurora SaaS", zh: "极光 SaaS", ja: "Aurora SaaS", fr: "Aurora SaaS", de: "Aurora SaaS" },
    heroTitle: {
      en: "Ship your MVP this week.",
      zh: "本周交付你的 MVP。",
      ja: "今週 MVP をリリース。",
      fr: "Lancez votre MVP cette semaine.",
      de: "Diese Woche dein MVP live.",
    },
    heroSubtitle: {
      en: "A product landing page with auth, billing and a demo.",
      zh: "含登录、计费与演示的产品落地页。",
      ja: "認証・決済・デモ付きのプロダクトページ。",
      fr: "Une page produit avec auth, facturation et démo.",
      de: "Eine Produktseite mit Auth, Abrechnung und Demo.",
    },
    features: [
      { en: "Email + OAuth login", zh: "邮箱 + OAuth 登录", ja: "メール＋OAuth ログイン", fr: "Connexion email + OAuth", de: "E-Mail + OAuth Login" },
      { en: "Subscription billing", zh: "订阅计费", ja: "サブスク課金", fr: "Facturation récurrente", de: "Abo-Abrechnung" },
      { en: "Live AI demo", zh: "在线 AI 演示", ja: "ライブ AI デモ", fr: "Démo IA en direct", de: "Live-KI-Demo" },
    ],
    pricingLabel: { en: "Starter", zh: "入门", ja: "スターター", fr: "Démarrage", de: "Starter" },
    pricingPrice: "$19/mo",
    primaryCta: { en: "Try the demo", zh: "试演示", ja: "デモを試す", fr: "Essayer la démo", de: "Demo testen" },
  },
  {
    slug: "doodle-portfolio",
    styleId: "doodle",
    category: { en: "Portfolio", zh: "作品集", ja: "ポートフォリオ", fr: "Portfolio", de: "Portfolio" },
    name: { en: "Doodle Folio", zh: "涂鸦作品集", ja: "Doodle Folio", fr: "Doodle Folio", de: "Doodle Folio" },
    heroTitle: {
      en: "Your work, beautifully framed.",
      zh: "你的作品，精美呈现。",
      ja: "あなたの作品を美しく。",
      fr: "Vos travaux, magnifiquement mis en valeur.",
      de: "Deine Arbeit, schön gerahmt.",
    },
    heroSubtitle: {
      en: "A hand-drawn portfolio that books clients on sight.",
      zh: "一眼就能接到单的手绘作品集。",
      ja: "見た瞬間依頼したくなるポートフォリオ。",
      fr: "Un portfolio qui décroche des clients.",
      de: "Ein Portfolio, das Kunden gewinnt.",
    },
    features: [
      { en: "Project gallery", zh: "项目画廊", ja: "作品ギャラリー", fr: "Galerie de projets", de: "Projektgalerie" },
      { en: "About + contact", zh: "关于 + 联系", ja: "自己紹介＋連絡", fr: "À propos + contact", de: "Über + Kontakt" },
      { en: "Light & dark toggle", zh: "明暗切换", ja: "明暗切替", fr: "Mode clair/sombre", de: "Hell/Dunkel" },
    ],
    pricingLabel: { en: "One-time", zh: "一次性", ja: "買い切り", fr: "Paiement unique", de: "Einmalig" },
    pricingPrice: "$0",
    primaryCta: { en: "See the folio", zh: "看作品集", ja: "作品を見る", fr: "Voir le portfolio", de: "Portfolio sehen" },
  },
  {
    slug: "emerald-clinic",
    styleId: "emerald",
    category: { en: "Local", zh: "本地", ja: "地元", fr: "Local", de: "Lokal" },
    name: { en: "Emerald Care", zh: "翠安诊所", ja: "Emerald Care", fr: "Emerald Care", de: "Emerald Care" },
    heroTitle: {
      en: "Care that comes to you.",
      zh: "贴心的护理，送到身边。",
      ja: "あなたのそばに寄り添うケア。",
      fr: "Des soins qui vous accompagnent.",
      de: "Fürsorge, die zu Ihnen kommt.",
    },
    heroSubtitle: {
      en: "A clinic site with booking, services and hours.",
      zh: "含预约、服务与营业时间的诊所站点。",
      ja: "予約・サービス・営業時間付きクリニック。",
      fr: "Un site de clinique avec rendez-vous et horaires.",
      de: "Eine Klinik-Seite mit Termin, Leistungen, Öffnungszeiten.",
    },
    features: [
      { en: "Online booking", zh: "在线预约", ja: "オンライン予約", fr: "Prise de rendez-vous", de: "Online-Termin" },
      { en: "Service list", zh: "服务清单", ja: "サービス一覧", fr: "Liste des soins", de: "Leistungsliste" },
      { en: "Opening hours", zh: "营业时间", ja: "営業時間", fr: "Horaires", de: "Öffnungszeiten" },
    ],
    pricingLabel: { en: "Practice", zh: "诊所版", ja: "医院向け", fr: "Pratique", de: "Praxis" },
    pricingPrice: "$49/mo",
    primaryCta: { en: "Book a visit", zh: "预约到访", ja: "予約する", fr: "Prendre RDV", de: "Termin buchen" },
  },
];

export function getTemplate(slug: string): TemplateMeta | undefined {
  return TEMPLATES.find((t) => t.slug === slug);
}
