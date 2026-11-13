#!/usr/bin/env node
// setup-wizard v3 - the short key-entry page for this project.
//
//   node scripts/setup-wizard.mjs            http://127.0.0.1:7777
//   node scripts/setup-wizard.mjs --port N
//   node scripts/setup-wizard.mjs --no-open
//
// Design rules:
// - Logins and project wiring are CLI jobs the CODING AGENT runs for the
//   user (supabase/vercel/gh/wrangler). This page never executes commands -
//   a web form with a shell is a security hole; it records the few secrets
//   only a provider CONSOLE can issue.
// - Cards follow the build: app-template.config.json decides which gateway
//   tabs exist and which tab opens first (first selected). Everything else
//   sits in ONE "providers" tabbed card + a collapsed Advanced drawer.
// - OAuth client secrets live in SUPABASE DASHBOARD -> Authentication ->
//   Providers, not in .env.local; the OAuth tab says exactly where.
// - UI chrome is translated (en/zh/ja/fr/de, ?lang= + cookie). Dashboard
//   paths stay English because that is what the provider screens show.
// - Server binds 127.0.0.1 only; POST writes non-empty fields to
//   .env.local (mode 0600, blank = keep existing).
import fs from "node:fs";
import path from "node:path";
import http from "node:http";

const root = process.cwd();
const args = process.argv.slice(2);
const portIdx = args.indexOf("--port");
const port = Number(portIdx >= 0 ? args[portIdx + 1] || "7777" : "7777");
const noOpen = args.includes("--no-open");

const ENV_EXAMPLE = path.join(root, ".env.example");
const ENV_LOCAL = path.join(root, ".env.local");
const CONFIG_JSON = path.join(root, "app-template.config.json");

// ── i18n (UI chrome only) ──────────────────────────────────────────────────
const LANGS = ["en", "zh", "ja", "fr", "de"];
const STR = {
  title: {
    en: "Setup wizard - the few keys the agent can't fetch",
    zh: "设置向导 - 只有这些密钥需要你自己拿",
    ja: "セットアップウィザード - ツールが取得できない鍵だけ",
    fr: "Assistant d'installation - les seules clés à récupérer vous-même",
    de: "Setup-Assistent - nur die Schlüssel, die der Agent nicht holen kann",
  },
  sub: {
    en: "Logins and project wiring are done FOR you by the coding agent (the commands are listed, nothing to type). This page only collects console-issued secrets. Served on 127.0.0.1; writes .env.local; blank = keep existing value.",
    zh: "登录、关联项目这些命令由 AI 助手代跑（下面只是留档，不用你敲）。本页只收集必须由控制台获取的密钥。服务只监听 127.0.0.1；写入 .env.local；留空 = 保持原值。",
    ja: "ログインやプロジェクト紐付けはコーディングエージェントが代行します（コマンドは記録用、入力不要）。このページはコンソール発行の秘密鍵だけを受け取ります。127.0.0.1 のみ、.env.local へ保存、空欄＝現状維持。",
    fr: "Connexions et associations de projet sont faites POUR vous par l'agent de code (commandes listées à titre de référence). Cette page ne collecte que les secrets émis par les consoles. Écoute 127.0.0.1 ; écrit .env.local ; champ vide = valeur conservée.",
    de: "Logins und Projekt-Verknüpfung erledigt der Coding-Agent für dich (Befehle nur zur Referenz). Diese Seite sammelt nur die von den Konsolen ausgestellten Secrets. Bindet 127.0.0.1; schreibt .env.local; leer = bisherigen Wert behalten.",
  },
  payments: { en: "Payments", zh: "支付网关", ja: "決済", fr: "Paiements", de: "Zahlungen" },
  providers: { en: "Providers & services", zh: "服务商配置", ja: "プロバイダー設定", fr: "Fournisseurs & services", de: "Anbieter & Dienste" },
  agentRuns: {
    en: "The AI agent runs these for you — no typing needed:",
    zh: "这些命令由 AI 助手替你执行（这里仅备查）：",
    ja: "これらはAIエージェントが代行します（入力不要、参考用）：",
    fr: "L'agent exécute ces commandes pour vous — rien à taper :",
    de: "Der Agent führt diese Befehle für dich aus — nichts zu tippen:",
  },
  copy: { en: "copy", zh: "复制", ja: "コピー", fr: "copier", de: "kopieren" },
  copied: { en: "copied", zh: "已复制", ja: "コピー済み", fr: "copié", de: "kopiert" },
  dash: { en: "Open the dashboard", zh: "打开控制台", ja: "ダッシュボードを開く", fr: "Ouvrir la console", de: "Dashboard öffnen" },
  where: { en: "Where to set it", zh: "在哪里配置", ja: "設定場所", fr: "Où le configurer", de: "Wo eingestellt" },
  save: { en: "Save to .env.local", zh: "保存到 .env.local", ja: ".env.local に保存", fr: "Enregistrer dans .env.local", de: "In .env.local speichern" },
  saved: { en: "saved", zh: "已保存", ja: "保存済み", fr: "enregistré(s)", de: "gespeichert" },
  keysWord: { en: "key(s)", zh: "个密钥", ja: "件のキー", fr: "clé(s)", de: "Schlüssel" },
  failed: { en: "failed", zh: "保存失败", ja: "失敗", fr: "échec", de: "fehlgeschlagen" },
  setTag: { en: "set", zh: "已配置", ja: "設定済", fr: "défini", de: "gesetzt" },
  keepPlaceholder: { en: "•••• leave blank to keep", zh: "•••• 留空即保持原值", ja: "•••• 空欄なら現状維持", fr: "•••• vide pour conserver", de: "•••• leer lassen = behalten" },
  pastePlaceholder: { en: "paste value", zh: "粘贴值", ja: "値を貼り付け", fr: "coller la valeur", de: "Wert einfügen" },
  advanced: {
    en: "Advanced - the other",
    zh: "高级 - 其余",
    ja: "詳細 - その他の",
    fr: "Avancé - les",
    de: "Erweitert - die übrigen",
  },
  advancedTail: {
    en: "env variables (normally you need none of these)",
    zh: "个环境变量（一般情况下一个都不用动）",
    ja: "個の環境変数（通常はすべて不要）",
    fr: "variables d'environnement (normalement aucune n'est nécessaire)",
    de: "Umgebungsvariablen (normalerweise keine nötig)",
  },
  nextSteps: {
    en: "After saving:",
    zh: "保存之后：",
    ja: "保存後：",
    fr: "Après l'enregistrement :",
    de: "Nach dem Speichern:",
  },
  webhookNote: {
    en: "Payment gateways: register the webhook endpoint /api/webhook in the provider dashboard (one URL for every gateway). Then run npm run compliance:check before deploying.",
    zh: "支付网关：在服务商后台登记 Webhook 地址 /api/webhook（所有网关都用这一个）。部署前先跑 npm run compliance:check。",
    ja: "決済ゲートウェイ：各プロバイダーのダッシュボードで Webhook 先に /api/webhook を登録（全ゲートウェイ共通）。デプロイ前に npm run compliance:check を実行。",
    fr: "Passerelles de paiement : déclarez l'endpoint webhook /api/webhook dans la console du fournisseur (une seule URL pour toutes). Puis lancez npm run compliance:check avant le déploiement.",
    de: "Zahlungs-Gateways: Webhook-Endpoint /api/webhook im Provider-Dashboard eintragen (eine URL für alle Gateways). Vor dem Deploy npm run compliance:check laufen lassen.",
  },
  oauthTab: { en: "OAuth / Sign-in", zh: "OAuth / 登录方式", ja: "OAuth / ログイン", fr: "OAuth / Connexion", de: "OAuth / Login" },
  oauthIntro: {
    en: "Create the OAuth CLIENT here, then paste its ID/secret in SUPABASE, not in this file:",
    zh: "先在下面各处创建 OAuth 客户端，然后把 Client ID/Secret 填到 SUPABASE 后台（Authentication → Providers），不要填进本文件：",
    ja: "まず各コンソールで OAuth クライアントを作成し、ID/シークレットは Supabase コンソール（Authentication → Providers）へ。このファイルには入れません：",
    fr: "Créez ici le client OAuth, puis collez son ID/secret dans SUPABASE (Authentication → Providers), pas dans ce fichier :",
    de: "OAuth-Client hier anlegen, dann ID/Secret in SUPABASE einfügen (Authentication → Providers), nicht in dieser Datei:",
  },
  oauthRedirect: {
    en: "Redirect URI for every provider:",
    zh: "所有 provider 的回调地址统一为：",
    ja: "全プロバイダーのリダイレクト URI（共通）：",
    fr: "URI de redirection identique pour tous les fournisseurs :",
    de: "Redirect-URI für alle Anbieter gleich:",
  },
  oauthEnvLine: {
    en: "Then list the enabled providers here:",
    zh: "然后把已启用的列表填在这里：",
    ja: "そして有効にした一覧をここに：",
    fr: "Puis indiquez ici les fournisseurs activés :",
    de: "Dann die aktivierten Anbieter hier eintragen:",
  },
  oauthSupaLine: {
    en: "Enable the provider (Client ID + Secret) inside Supabase - NOT in this file:",
    zh: "Client ID + Secret 要启用在 Supabase 后台，不是本文件：",
    ja: "Client ID + Secret は Supabase コンソールで有効化（このファイルではありません）：",
    fr: "Activez le fournisseur (Client ID + Secret) dans Supabase - PAS dans ce fichier :",
    de: "Anbieter (Client ID + Secret) in Supabase aktivieren - NICHT in dieser Datei:",
  },
  savedN: {
    en: "Saved {n} key(s) to .env.local",
    zh: "已保存 {n} 个密钥到 .env.local",
    ja: ".env.local に {n} 個のキーを保存しました",
    fr: "{n} clé(s) enregistrée(s) dans .env.local",
    de: "{n} Schlüssel in .env.local gespeichert",
  },
  failedN: { en: "Save failed", zh: "保存失败", ja: "保存に失敗", fr: "Échec d'enregistrement", de: "Speichern fehlgeschlagen" },
  providerPaths: {
    supabase: { en: "Supabase dashboard → Project settings → API", zh: "Supabase 控制台 → Project settings → API", ja: "Supabase コンソール → Project settings → API", fr: "Console Supabase → Project settings → API", de: "Supabase-Dashboard → Project settings → API" },
  },
};

function readConfigNow() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_JSON, "utf8"));
  } catch {
    return null;
  }
}

// ── provider guides ────────────────────────────────────────────────────────
// vars = console-issued secrets worth typing. Everything else lives in Advanced.
const GUIDES = [
  {
    id: "supabase",
    group: "providers",
    match: (cfg) => !cfg || (cfg.skills || []).includes("database") || (cfg.auth || []).some((a) => a !== "email"),
    tab: { en: "Supabase", zh: "Supabase", ja: "Supabase", fr: "Supabase", de: "Supabase" },
    cli: ["npx supabase login", "npx supabase link --project-ref <ref>"],
    console: { url: "https://supabase.com/dashboard" },
    location: { en: "Project settings → API. Project ref sits in the dashboard URL.", zh: "Project settings → API；项目 ref 就在控制台 URL 里。", ja: "Project settings → API。ref はダッシュボードの URL にあります。", fr: "Project settings → API. Le ref est dans l'URL du dashboard.", de: "Project settings → API. Der Projekt-Ref steht in der Dashboard-URL." },
    vars: [
      { name: "NEXT_PUBLIC_SUPABASE_URL", label: "Project URL" },
      { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", label: "Anon public key", secret: false },
      { name: "SUPABASE_SERVICE_ROLE_KEY", label: "Service role key (SERVER ONLY)" },
    ],
  },
  {
    id: "waffo",
    group: "payments",
    match: (cfg) => cfg?.payment?.includes("waffo") ?? true,
    tab: { en: "Waffo", zh: "Waffo", ja: "Waffo", fr: "Waffo", de: "Waffo" },
    console: { url: "https://pancake.waffo.ai" },
    location: { en: "Products → create one-time + subscription (copy PROD_… ids). Developer → API keys → private key. Settings → webhooks → platform public key.", zh: "Products → 分别创建一次性商品和订阅商品（复制 PROD_… id）；Developer → API keys 拿私钥；Settings → webhooks 拿平台公钥。", ja: "Products で使い切り＋定期購入を作成（PROD_… id をコピー）。Developer → API keys で秘密鍵、Settings → webhooks で公開鍵。", fr: "Products → créez one-time + abonnement (copiez les ids PROD_…). Developer → API keys pour la clé privée. Settings → webhooks pour la clé publique.", de: "Products → einmalig + Abo anlegen (PROD_… ids kopieren). Developer → API keys für den privaten Schlüssel, Settings → webhooks für den öffentlichen." },
    vars: [
      { name: "WAFFO_ENVIRONMENT", label: "Environment (test | prod)", example: "test", secret: false },
      { name: "WAFFO_PRICE_ID_BUYOUT", label: "Buyout product id", example: "PROD_…", secret: false },
      { name: "WAFFO_PRICE_ID_CARE", label: "Care subscription id", example: "PROD_…", secret: false },
      { name: "WAFFO_PRIVATE_KEY", label: "Merchant private key" },
      { name: "WAFFO_WEBHOOK_PUBLIC_KEY_PROD", label: "Webhook public key (prod)" },
    ],
  },
  {
    id: "stripe",
    group: "payments",
    match: (cfg) => cfg?.payment?.includes("stripe") ?? true,
    tab: { en: "Stripe", zh: "Stripe", ja: "Stripe", fr: "Stripe", de: "Stripe" },
    console: { url: "https://dashboard.stripe.com/apikeys" },
    location: { en: "Developers → API keys (restricted key recommended) → Secret key. Developers → Webhooks → add /api/webhook → Signing secret. Products → prices (care must be recurring).", zh: "Developers → API keys（建议用 restricted key）取 Secret key；Developers → Webhooks 添加 /api/webhook 取 Signing secret；Products → prices 建一次性 + 订阅价格。", ja: "Developers → API keys（restricted 推奨）で Secret key。Developers → Webhooks に /api/webhook を追加し Signing secret を取得。Products → prices で都度＋定期。", fr: "Developers → API keys (clé restreinte conseillée). Developers → Webhooks → ajoutez /api/webhook → Signing secret. Products → prices (récurrent pour l'abo).", de: "Entwickler → API keys (restricted empfohlen). Entwickler → Webhooks → /api/webhook hinzufügen → Signing secret. Products → prices (Abo muss recurring sein)." },
    vars: [
      { name: "STRIPE_SECRET_KEY", label: "Secret / restricted key (sk_…)" },
      { name: "STRIPE_WEBHOOK_SECRET", label: "Webhook signing secret (whsec_…)" },
      { name: "STRIPE_PRICE_ID_BUYOUT", label: "Buyout price id (price_…)", secret: false },
      { name: "STRIPE_PRICE_ID_CARE", label: "Care recurring price id (price_…)", secret: false },
    ],
  },
  {
    id: "creem",
    group: "payments",
    match: (cfg) => cfg?.payment?.includes("creem") ?? true,
    tab: { en: "Creem", zh: "Creem", ja: "Creem", fr: "Creem", de: "Creem" },
    console: { url: "https://creem.io/dashboard" },
    location: { en: "Products → create one-time + subscription (copy product ids). Developers → API keys; Developers → Webhooks → signing key.", zh: "Products 建一次性 + 订阅商品（复制 product id）；Developers → API keys 与 Webhooks signing key。", ja: "Products で都度＋定期を作成（id をコピー）。Developers → API keys と Webhooks 署名鍵。", fr: "Products → one-time + abonnement (copiez les ids). Developers → API keys et clé de signature webhook.", de: "Products → einmalig + Abo (ids kopieren). Entwickler → API keys und Webhook-Signierschlüssel." },
    vars: [
      { name: "CREEM_API_KEY", label: "API key" },
      { name: "CREEM_WEBHOOK_SECRET", label: "Webhook secret" },
      { name: "CREEM_PRICE_ID_BUYOUT", label: "Buyout product id", example: "prod_…", secret: false },
      { name: "CREEM_PRICE_ID_CARE", label: "Care product id", example: "prod_…", secret: false },
    ],
  },
  {
    id: "paypal",
    group: "payments",
    match: (cfg) => cfg?.payment?.includes("paypal") ?? true,
    tab: { en: "PayPal", zh: "PayPal", ja: "PayPal", fr: "PayPal", de: "PayPal" },
    console: { url: "https://developer.paypal.com/dashboard/applications/live" },
    location: { en: "Apps & Credentials → Live app (Client ID + Secret). Subscriptions → Billing plans → plan ids (P-…). Webhooks → /api/webhook.", zh: "Apps & Credentials 建 Live app 取 Client ID/Secret；Billing → Subscriptions → Plans 取 plan id（P-…）；Webhooks 指到 /api/webhook。", ja: "Apps & Credentials で Live app（Client ID+Secret）。課金は Billing plans の id（P-…）。Webhook は /api/webhook。", fr: "Apps & Credentials → app Live (Client ID + Secret). Abonnements → plan ids (P-…). Webhook → /api/webhook.", de: "Apps & Credentials → Live-App (Client ID + Secret). Abos → Plan-IDs (P-…). Webhook → /api/webhook." },
    vars: [
      { name: "PAYPAL_CLIENT_ID", label: "Client ID", secret: false },
      { name: "PAYPAL_CLIENT_SECRET", label: "Client secret" },
      { name: "PAYPAL_PLAN_ID_BUYOUT", label: "One-time price id", example: "P-…", secret: false },
      { name: "PAYPAL_PLAN_ID_CARE", label: "Recurring plan id", example: "P-…", secret: false },
    ],
  },
  {
    id: "lemonsqueezy",
    group: "payments",
    match: (cfg) => cfg?.payment?.includes("lemonsqueezy") ?? true,
    tab: { en: "Lemon Squeezy", zh: "Lemon Squeezy", ja: "Lemon Squeezy", fr: "Lemon Squeezy", de: "Lemon Squeezy" },
    console: { url: "https://app.lemonsqueezy.com" },
    location: { en: "Products → variants (variant ids). Settings → API for the key; Developer → Webhooks for the secret.", zh: "Products → variants 取 variant id；Settings → API 取 key；Developer → Webhooks 取 secret。", ja: "Products → variants（id）。Settings → API で鍵、Developer → Webhooks で secret。", fr: "Products → variants (ids). Settings → API pour la clé ; Developer → Webhooks pour le secret.", de: "Products → Variants (IDs). Settings → API für den Schlüssel; Entwickler → Webhooks fürs Secret." },
    vars: [
      { name: "LEMONSQUEEZY_API_KEY", label: "API key" },
      { name: "LEMONSQUEEZY_WEBHOOK_SECRET", label: "Webhook secret" },
      { name: "LEMONSQUEEZY_VARIANT_ID_BUYOUT", label: "Buyout variant id", secret: false },
      { name: "LEMONSQUEEZY_VARIANT_ID_CARE", label: "Care variant id", secret: false },
    ],
  },
  {
    id: "ai",
    group: "providers",
    match: (cfg) => true,
    tab: { en: "AI keys", zh: "AI 密钥", ja: "AI キー", fr: "Clés IA", de: "AI-Keys" },
    console: { url: "https://platform.openai.com/api-keys" },
    location: { en: "Paste only what this build selected. OpenAI: platform.openai.com → API keys. Anthropic: console.anthropic.com. Gemini: aistudio.google.com. Groq: console.groq.com. DeepSeek: platform.deepseek.com. OpenRouter: openrouter.ai/keys. fal.ai: fal.ai/dashboard/keys.", zh: "只填本构建选中的。OpenAI: platform.openai.com → API keys；Anthropic: console.anthropic.com；Gemini: aistudio.google.com；Groq: console.groq.com；DeepSeek: platform.deepseek.com；OpenRouter: openrouter.ai/keys；fal: fal.ai/dashboard/keys。", ja: "このビルドが選んだものだけ入力。OpenAI: platform.openai.com → API keys、Anthropic: console.anthropic.com、Gemini: aistudio.google.com、Groq: console.groq.com、DeepSeek: platform.deepseek.com、OpenRouter: openrouter.ai/keys、fal: fal.ai/dashboard/keys。", fr: "Ne collez que ce que ce build a sélectionné. OpenAI : platform.openai.com → API keys ; Anthropic : console.anthropic.com ; Gemini : aistudio.google.com ; Groq : console.groq.com ; DeepSeek : platform.deepseek.com ; OpenRouter : openrouter.ai/keys ; fal : fal.ai/dashboard/keys.", de: "Nur das Ausgewählte eintragen. OpenAI: platform.openai.com → API keys; Anthropic: console.anthropic.com; Gemini: aistudio.google.com; Groq: console.groq.com; DeepSeek: platform.deepseek.com; OpenRouter: openrouter.ai/keys; fal: fal.ai/dashboard/keys." },
    vars: [
      { name: "OPENAI_API_KEY", label: "OpenAI" },
      { name: "ANTHROPIC_API_KEY", label: "Anthropic" },
      { name: "GEMINI_API_KEY", label: "Google Gemini" },
      { name: "GROQ_API_KEY", label: "Groq" },
      { name: "DEEPSEEK_API_KEY", label: "DeepSeek" },
      { name: "OPENROUTER_API_KEY", label: "OpenRouter" },
      { name: "FAL_KEY", label: "fal.ai (image/video)" },
    ],
  },
  {
    id: "mail",
    group: "providers",
    match: () => true,
    tab: { en: "Email", zh: "邮件", ja: "メール", fr: "E-mail", de: "E-Mail" },
    console: { url: "https://resend.com/api-keys" },
    location: { en: "Resend → API keys. Use a dedicated sending subdomain + SPF/DKIM verified in Resend → Domains. Provider=none only LOGS mail (degraded).", zh: "Resend → API keys；用独立发信子域并在 Resend → Domains 验证 SPF/DKIM。选 none 只记录不发送（降级）。", ja: "Resend → API keys。専用サブドメインで Resend → Domains の SPF/DKIM 検証を。none は記録のみ（劣化）。", fr: "Resend → API keys. Sous-domaine dédié + SPF/DKIM vérifiés dans Resend → Domains. none = journalisation seule (dégradé).", de: "Resend → API keys. Eigene Versand-Subdomain + SPF/DKIM in Resend → Domains verifizieren. none = nur Log (degradiert)." },
    vars: [
      { name: "MAIL_PROVIDER", label: "resend | webhook | none", example: "resend", secret: false },
      { name: "RESEND_API_KEY", label: "Resend API key" },
      { name: "MAIL_FROM", label: "From address", example: "app@yourdomain.dev", secret: false },
    ],
  },
  {
    id: "admin",
    group: "providers",
    match: () => true,
    tab: { en: "Admin", zh: "管理后台", ja: "管理画面", fr: "Admin", de: "Admin" },
    location: { en: "No console needed - pick a real password. Without these the /admin stays CLOSED (fails safe).", zh: "不需要去任何控制台——设一个真实密码即可。不填则 /admin 保持关闭（安全默认）。", ja: "コンソール不要・実パスワードを設定するだけ。未設定だと /admin は閉じたまま（安全側既定）。", fr: "Aucune console nécessaire — choisissez un vrai mot de passe. Sans cela /admin reste FERMÉ (sûr par défaut).", de: "Kein Dashboard nötig — echtes Passwort setzen. Ohne das bleibt /admin GESCHLOSSEN (sichere Voreinstellung)." },
    cli: [],
    vars: [
      { name: "ADMIN_USER", label: "Admin login", secret: false },
      { name: "ADMIN_PASSWORD", label: "Admin password" },
    ],
  },
  {
    id: "oauth",
    group: "providers",
    match: (cfg) => !cfg || (cfg.auth || []).some((a) => a !== "email"),
    tab: { en: "OAuth / Sign-in", zh: "OAuth / 登录", ja: "OAuth / ログイン", fr: "OAuth", de: "OAuth" },
    isOAuth: true,
    vars: [{ name: "NEXT_PUBLIC_OAUTH_PROVIDERS", label: "Enabled providers (comma list)", example: "google,github", secret: false }],
  },
  {
    id: "deploy",
    group: "providers",
    match: () => true,
    tab: { en: "Deploy", zh: "部署", ja: "デプロイ", fr: "Déploiement", de: "Deploy" },
    cliFor: (cfg) =>
      cfg?.deploy === "cloudflare"
        ? ["npm i -g wrangler", "wrangler login", "wrangler secret put LICENSE_SECRET", "npm run build && npx wrangler deploy"]
        : cfg?.deploy === "selfhost"
          ? []
          : ["npm i -g vercel", "vercel login", "vercel link", "vercel env add NEXT_PUBLIC_SITE_URL production"],
    links: [
      { url: "https://vercel.com/dashboard", label: { en: "Vercel dashboard", zh: "Vercel 控制台", ja: "Vercel コンソール", fr: "Console Vercel", de: "Vercel-Dashboard" } },
      { url: "https://one.dash.cloudflare.com", label: { en: "Cloudflare dashboard", zh: "Cloudflare 控制台", ja: "Cloudflare コンソール", fr: "Console Cloudflare", de: "Cloudflare-Dashboard" } },
    ],
    location: {
      en: "NEXT_PUBLIC_SITE_URL is baked in at BUILD time - set it before the first production build. Vercel: Project → Settings → Environment Variables (or vercel env add). Cloudflare: Workers & Pages → your app → Settings → Variables and Secrets (secrets via wrangler secret put; note Workers has no disk, so Supabase is mandatory there). Once the domain is live: register /api/webhook in each payment dashboard and schedule POST /api/cron/* with your host's timer.",
      zh: "NEXT_PUBLIC_SITE_URL 在构建期注入——首次生产构建前必须设好。Vercel：Project → Settings → Environment Variables（或 vercel env add）。Cloudflare：Workers & Pages → 应用 → Settings → Variables and Secrets（密钥用 wrangler secret put；Workers 无磁盘，必须配 Supabase）。域名生效后：去各支付后台登记 /api/webhook，并用宿主定时器排 POST /api/cron/* 任务。",
      ja: "NEXT_PUBLIC_SITE_URL はビルド時に焼き込まれます - 初回本番ビルド前に設定必須。Vercel: Project → Settings → Environment Variables。Cloudflare: Workers & Pages → アプリ → Settings → Variables and Secrets（secret は wrangler secret put。Workers にディスクはないため Supabase 必須）。ドメイン確定後に /api/webhook を各ゲートウェイへ登録し、ホストのタイマーで POST /api/cron/* を定期実行してください。",
      fr: "NEXT_PUBLIC_SITE_URL est injecté au BUILD - à définir avant le premier build de prod. Vercel : Project → Settings → Environment Variables. Cloudflare : Workers & Pages → app → Settings → Variables and Secrets (secrets via wrangler secret put ; pas de disque sur Workers, Supabase obligatoire). Domaine actif : déclarez /api/webhook dans chaque passerelle et planifiez POST /api/cron/* avec le timer de l'hôte.",
      de: "NEXT_PUBLIC_SITE_URL wird beim BUILD eingebrannt - vor dem ersten Produktiv-Build setzen. Vercel: Project → Settings → Environment Variables. Cloudflare: Workers & Pages → App → Settings → Variables and Secrets (Secrets über wrangler secret put; Workers haben keine Disk, Supabase Pflicht). Nach der Domain: /api/webhook in jedem Gateway eintragen und POST /api/cron/* mit dem Host-Timer planen.",
    },
    vars: [
      { name: "NEXT_PUBLIC_SITE_URL", label: "Public site URL (set BEFORE first build)", example: "https://app.yourdomain.dev", secret: false },
      { name: "CRON_SECRET", label: "Cron endpoints token" },
      { name: "ADMIN_EMAILS", label: "Admin email allowlist (comma list)", secret: false },
    ],
  },
];

function guideVars(g, config) {
  if (g.id === "ai" && config?.ai?.length) {
    const keep = new Set(config.ai.map((p) => `${String(p).toUpperCase()}_API_KEY`));
    if (config.skills?.includes("video")) keep.add("FAL_KEY");
    return g.vars.filter((v) => keep.has(v.name));
  }
  return g.vars;
}

function parseExample() {
  if (!fs.existsSync(ENV_EXAMPLE)) return [];
  const names = [];
  for (const raw of fs.readFileSync(ENV_EXAMPLE, "utf8").replace(/\r\n/g, "\n").split("\n")) {
    const m = /^#?\s*([A-Z][A-Z0-9_]*)=/.exec(raw.trim());
    if (m && !names.includes(m[1])) names.push(m[1]);
  }
  return names;
}

const guideVarNames = new Set(GUIDES.flatMap((g) => g.vars.map((v) => v.name)));
const advancedVars = parseExample().filter((n) => !guideVarNames.has(n));

function existingEnv() {
  const out = new Map();
  if (!fs.existsSync(ENV_LOCAL)) return out;
  for (const l of fs.readFileSync(ENV_LOCAL, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z][A-Z0-9_]*)=(.*)$/.exec(l);
    if (m) out.set(m[1], m[2]);
  }
  return out;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function pickLang(req) {
  const url = new URL(req.url, "http://localhost");
  const q = url.searchParams.get("lang");
  if (q && LANGS.includes(q)) return { lang: q, setCookie: true };
  const cookie = /setup_lang=([a-z]{2})/.exec(req.headers.cookie || "");
  if (cookie && LANGS.includes(cookie[1])) return { lang: cookie[1], setCookie: false };
  const accept = (req.headers["accept-language"] || "").toLowerCase();
  for (const l of LANGS) if (accept.includes(l)) return { lang: l, setCookie: false };
  return { lang: "en", setCookie: false };
}

function fieldHtml(v, have, T) {
  const filled = (have.get(v.name) || "").trim();
  return `<label class="field${filled ? " filled" : ""}">
  <span class="k">${esc(v.label || v.name)}${filled ? ` <em class="ok">${T("setTag")}</em>` : ""}</span>
  <span class="kname">${esc(v.name)}</span>
  <input name="${esc(v.name)}" type="${v.secret === false ? "text" : "password"}" placeholder="${esc(filled ? T("keepPlaceholder") : v.example || T("pastePlaceholder"))}" autocomplete="off" spellcheck="false">
</label>`;
}

function guideInner(g, vars, have, L, T, config) {
  const parts = [];
  const cli = typeof g.cliFor === "function" ? g.cliFor(config || {}) || [] : g.cli || [];
  if (cli.length) {
    parts.push(`<p class="agenthint">🤖 ${T("agentRuns")}</p><div class="cmds">${cli
      .map((c) => `<div class="cmd"><code>${esc(c)}</code><button type="button" class="cp" data-cmd="${esc(c)}">${T("copy")}</button></div>`)
      .join("")}</div>`);
  }
  if (g.links) {
    parts.push(g.links.map((a) => `<a class="dash" href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.label[L] || a.label.en)} ↗</a>`).join(" "));
  } else if (g.console) {
    parts.push(`<a class="dash" href="${esc(g.console.url)}" target="_blank" rel="noopener">${T("dash")} ↗</a>`);
  }
  if (g.isOAuth) {
    parts.push(`<p class="where">${T("oauthIntro")}</p>
<ol class="oauth">
  <li><b>Google</b> — console.cloud.google.com → APIs &amp; Services → Credentials → “OAuth client ID” (Web)</li>
  <li><b>GitHub</b> — github.com → Settings → Developer settings → OAuth Apps → New</li>
  <li><b>Apple</b> — developer.apple.com → Certificates, Identifiers &amp; Profiles → Services &amp; IDs</li>
  <li><b>Microsoft</b> — portal.azure.com → App registrations → New registration</li>
</ol>
<p class="where"><b>${T("oauthRedirect")}</b> <code>https://&lt;project-ref&gt;.supabase.co/auth/v1/callback</code></p>
<p class="where"><b>${T("oauthSupaLine")}</b> supabase.com/dashboard → Authentication → Sign In / Providers</p>
<p class="where">${T("oauthEnvLine")}</p>`);
  }
  if (g.location?.[L] || g.location?.en) parts.push(`<p class="where"><b>${T("where")}:</b> ${esc(g.location[L] || g.location.en)}</p>`);
  parts.push(vars.map((v) => fieldHtml(v, have, T)).join("\n"));
  return parts.join("\n");
}

function tabbedCard(id, title, groups, have, L, T, config) {
  const total = groups.reduce((n, x) => n + x.vars.length, 0);
  const done = groups.reduce((n, x) => n + x.vars.filter((v) => (have.get(v.name) || "").trim().length > 0).length, 0);
  const tabs = groups
    .map((x, i) => `<button type="button" role="tab" aria-selected="${i === 0}" class="tab${i === 0 ? " active" : ""}" data-tab="${x.g.id}">${esc(x.g.tab[L] || x.g.tab.en)}</button>`)
    .join("");
  const panels = groups
    .map((x, i) => `<div class="panel${i === 0 ? " active" : ""}" id="tab-${x.g.id}"${i === 0 ? "" : " hidden"}>${guideInner(x.g, x.vars, have, L, T, config)}</div>`)
    .join("\n");
  return `<section class="card wide" id="${id}">
  <header><h2>${esc(title)}</h2><span class="badge" data-total="${total}" data-done="${done}">${done}/${total}</span></header>
  <div class="tabs" role="tablist">${tabs}</div>
  ${panels}
</section>`;
}

function render(L) {
  const T = (k) => STR[k]?.[L] ?? STR[k]?.en ?? k;
  const config = readConfigNow();
  const have = existingEnv();
  const visible = [];
  for (const g of GUIDES) {
    if (!g.match(config)) continue;
    const vars = guideVars(g, config);
    if (!vars.length && g.id !== "oauth") continue;
    visible.push({ g, vars });
  }
  const paySel = (config?.payment || []).filter((p) => visible.some((x) => x.g.id === p));
  const payments = visible
    .filter((x) => x.g.group === "payments")
    .sort((a, b) => {
      const ia = paySel.indexOf(a.g.id);
      const ib = paySel.indexOf(b.g.id);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  const others = visible.filter((x) => x.g.group === "providers");
  // Providers first: the database / AI / deploy wiring happens before a
  // gateway product even exists - payment configuration comes later.
  const cards = [];
  if (others.length) cards.push(tabbedCard("providers", T("providers"), others, have, L, T, config));
  if (payments.length) cards.push(tabbedCard("payments", T("payments"), payments, have, L, T, config));
  const advFields = advancedVars
    .map((n) => {
      const filled = (have.get(n) || "").trim();
      const secret = /KEY|SECRET|TOKEN|PASSWORD|PRIVATE/i.test(n);
      return `<label class="field afield${filled ? " filled" : ""}"><span class="kname">${esc(n)}${filled ? ` <em class="ok">${T("setTag")}</em>` : ""}</span><input name="${esc(n)}" type="${secret ? "password" : "text"}" placeholder="${filled ? T("keepPlaceholder") : T("pastePlaceholder")}" autocomplete="off" spellcheck="false"></label>`;
    })
    .join("\n");
  const langBar = LANGS.map((l) => `<a class="lang${l === L ? " on" : ""}" href="/?lang=${l}">${l.toUpperCase()}</a>`).join("");

  return `<!doctype html><html lang="${L}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Setup wizard</title>
<style>
 body{font:16px/1.65 -apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei UI","Noto Sans CJK SC",Arial,sans-serif;background:#0a0c0f;color:#e9edf2;margin:0;padding:30px 16px 70px}
 main{max-width:1100px;margin:0 auto}
 h1{font-size:24px;margin:0 0 6px;font-weight:700;letter-spacing:-.01em}
 .sub{color:#aeb8c2;font-size:14.5px;margin:0 0 14px;max-width:900px}
 .toprow{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:8px}
 .langbar{display:flex;gap:4px}
 .lang{font-size:12px;font-weight:700;color:#8b95a1;text-decoration:none;border:1px solid #232830;border-radius:8px;padding:4px 8px}
 .lang:hover{color:#e9edf2}
 .lang.on{color:#07211c;background:#5eead4;border-color:#5eead4}
 .bar{height:6px;border-radius:99px;background:#1c2128;margin:0 0 24px;overflow:hidden}
 .bar i{display:block;height:100%;background:#5eead4;width:0}
 .card{border:1px solid #262c35;border-radius:16px;background:#12161b;padding:20px 22px;margin:0 0 16px}
 .card header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
 .card h2{font-size:17px;margin:0;font-weight:700;color:#5eead4;letter-spacing:.02em}
 .badge{font-family:ui-monospace,Menlo,monospace;font-size:13px;border:1px solid #2c333d;border-radius:99px;padding:3px 11px;color:#aeb8c2}
 .badge.complete{color:#07211c;background:#5eead4;border-color:#5eead4;font-weight:700}
 .tabs{display:flex;flex-wrap:wrap;gap:7px;margin:2px 0 16px}
 .tab{background:transparent;border:1px solid #2c333d;border-radius:99px;color:#aeb8c2;font-size:14px;font-weight:600;padding:7px 16px;cursor:pointer}
 .tab:hover{color:#e9edf2;border-color:#3a4250}
 .tab.active{background:#5eead4;border-color:#5eead4;color:#07211c}
 .panel[hidden]{display:none}
 .agenthint{font-size:14px;color:#7fd6c0;margin:0 0 8px}
 .cmds{margin:0 0 12px}
 .cmd{display:flex;align-items:center;gap:8px;margin:5px 0}
 .cmd code{flex:1;background:#0a0c0f;border:1px solid #262c35;border-radius:8px;padding:6px 10px;font-size:13px;color:#cdeade}
 .cp{background:transparent;border:1px solid #2c333d;border-radius:8px;color:#aeb8c2;font-size:12.5px;padding:4px 10px;cursor:pointer}
 .cp:hover{color:#5eead4;border-color:#5eead4}
 .dash{display:inline-block;font-size:14px;color:#7cc7f5;text-decoration:none;margin:0 0 10px}
 .dash:hover{text-decoration:underline}
 .where{font-size:13.5px;line-height:1.6;color:#aeb8c2;margin:4px 0 12px;max-width:860px}
 .where code{color:#cdeade;background:#0a0c0f;padding:1px 6px;border-radius:5px;font-size:12.5px}
 .oauth{margin:2px 0 12px;padding-left:22px;font-size:13.5px;color:#aeb8c2}
 .oauth li{margin:4px 0}
 .field{display:block;margin:0 0 12px;padding:10px 12px;border:1px solid #222831;border-radius:12px;background:#0e1216}
 .field.filled{border-color:#24463b;background:#0f1815}
 .k{display:block;font-size:14px;font-weight:600;color:#e9edf2}
 .k .ok{color:#5eead4;font-style:normal;font-size:12px;margin-left:6px}
 .kname{display:block;font-family:ui-monospace,Menlo,monospace;font-size:12px;color:#8b95a1;margin:2px 0 6px}
 input{width:100%;box-sizing:border-box;background:#0a0c0f;border:1px solid #2c333d;border-radius:9px;color:#e9edf2;padding:9px 11px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:14px}
 input:focus{outline:none;border-color:#5eead4}
 .actions{position:sticky;bottom:0;margin-top:20px;padding:12px 0;background:linear-gradient(transparent,#0a0c0f 45%);display:flex;gap:14px;align-items:center}
 button.save{background:#5eead4;color:#07211c;font-weight:700;border:0;border-radius:12px;padding:12px 24px;font-size:15px;cursor:pointer}
 .done{font-size:14px;color:#5eead4;font-weight:600}
 details{margin-top:8px;border:1px dashed #262c35;border-radius:12px;padding:12px 16px}
 summary{cursor:pointer;font-size:14px;color:#aeb8c2}
 .afield{margin:8px 0;padding:8px 10px}
 .privacy{color:#8b95a1;font-size:13px;margin-top:18px;max-width:860px}
</style></head><body><main>
 <div class="toprow">
  <div><h1>${T("title")}</h1></div>
  <div class="langbar">${langBar}</div>
 </div>
 <p class="sub">${T("sub")}</p>
 <div class="bar"><i id="prog"></i></div>
 <form id="f">${cards.join("\n")}
 <div class="actions"><button type="button" class="save" onclick="save()">${T("save")}</button><span class="done" id="done"></span></div></form>
 <details><summary>${T("advanced")} ${advancedVars.length} ${T("advancedTail")}</summary>${advFields}</details>
 <p class="privacy">${T("nextSteps")} <code>npm run dev</code> · ${T("webhookNote")}</p>
</main>
<script>
const L=${JSON.stringify(L)};
function refresh(){
  let t=0,d=0;
  document.querySelectorAll(".badge").forEach(b=>{t+=+b.dataset.total;d+=+b.dataset.done;b.classList.toggle("complete",( +b.dataset.done)>=+b.dataset.total)});
  document.getElementById("prog").style.width=(100*d/Math.max(t,1))+"%";
}
document.addEventListener("click",e=>{
  const cp=e.target.closest(".cp");
  if(cp){navigator.clipboard.writeText(cp.dataset.cmd);cp.textContent=${JSON.stringify(STR.copied[L] ?? "copied")};setTimeout(()=>cp.textContent=${JSON.stringify(STR.copy[L] ?? "copy")},1200);return;}
  const tab=e.target.closest(".tab");
  if(tab){
    const card=tab.closest(".card");
    card.querySelectorAll(".tab").forEach(x=>{const on=x===tab;x.classList.toggle("active",on);x.setAttribute("aria-selected",on);});
    card.querySelectorAll(".panel").forEach(p=>{const on=p.id==="tab-"+tab.dataset.tab;p.hidden=!on;p.classList.toggle("active",on);});
  }
});
async function save(){
  const data={};
  new FormData(document.getElementById("f")).forEach((v,k)=>{if(String(v).trim())data[k]=String(v).trim();});
  const r=await fetch("/save",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
  const j=await r.json();
  const msg=${JSON.stringify(STR.savedN[L] ?? STR.savedN.en)};
  const failMsg=${JSON.stringify(STR.failedN[L] ?? STR.failedN.en)};
  document.getElementById("done").textContent=j.ok?msg.replace("{n}",j.written):failMsg+": "+j.error;
  if(j.ok)setTimeout(()=>location.reload(),900);
}
refresh();
</script></body></html>`;
}

function mergeSave(updates) {
  const lines = fs.existsSync(ENV_LOCAL) ? fs.readFileSync(ENV_LOCAL, "utf8").replace(/\r\n/g, "\n").split("\n") : [];
  let written = 0;
  for (const [k, v] of Object.entries(updates)) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(k)) continue;
    const live = lines.findIndex((l) => l.trim().startsWith(k + "="));
    if (live >= 0) lines[live] = `${k}=${v}`;
    else {
      const commented = lines.findIndex((l) => new RegExp(`^#\\s*${k}=`).test(l.trim()));
      if (commented >= 0) lines.splice(commented + 1, 0, `${k}=${v}`);
      else lines.push(`${k}=${v}`);
    }
    written++;
  }
  fs.writeFileSync(ENV_LOCAL, lines.join("\n") + "\n", { mode: 0o600 });
  return written;
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET") {
    const { lang, setCookie } = pickLang(req);
    if (setCookie) res.setHeader("set-cookie", `setup_lang=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`);
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(render(lang));
    return;
  }
  if (req.method === "POST" && req.url === "/save") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const written = mergeSave(JSON.parse(body || "{}"));
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true, written }));
      } catch (e) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(port, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${port}`;
  console.log(`setup wizard: ${url}  (Ctrl+C to stop; keys stay local)`);
  if (!noOpen) {
    const cmd = process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";
    import("node:child_process").then(({ exec }) => exec(`${cmd} ${url}`, () => {}));
  }
});
