// Template gallery + sample-site (样板间) data.
//
// Each entry is a real make1day.dev starter template. The preview renders the
// surfaces the generator actually ships — landing, pricing, login, AI chat,
// RAG and the admin console — with the template's REAL theme variables from
// lib/generator/themes (not a screenshot), switchable via tabs.
//
// These are make1day.dev-site-only marketing assets (listed in
// lib/generator/prune.ts SITE_MARKETING_FILES) and never ship in a customer ZIP.

import type { Lang } from "@/lib/i18n-core";
import type { StyleId } from "@/lib/generator/config";

export type TText = Record<Lang, string>;

export interface TemplateTier {
  name: TText;
  /** Display price, e.g. "$29" — currency is intentionally uniform. */
  price: string;
  period: "mo" | "once";
  highlight?: boolean;
  features: TText[];
}

export interface TemplateMeta {
  slug: string;
  /** Scene grouping for the showroom: "ai" verticals first, classics below. */
  group: "ai" | "classic";
  styleId: StyleId;
  /** Short category chip shown on the card + preview nav. */
  category: TText;
  /** Brand / product name used as the generated site's wordmark. */
  name: TText;
  heroTitle: TText;
  heroSubtitle: TText;
  /** Three benefit lines rendered as the landing feature cards. */
  features: TText[];
  primaryCta: TText;
  /** Pricing surface. */
  tiers: TemplateTier[];
  /** AI chat surface: one sample exchange (only when the vertical has one). */
  chat?: { user: TText; assistant: TText };
  /** RAG surface: sample grounded question + cited answer (knowledge
   *  verticals only — a video or image pipeline does NOT get one). */
  rag?: { question: TText; answer: TText; sources: TText[] };
  /** Admin console surface: headline stats + recent activity. */
  admin: {
    stats: { users: string; licenses: string; revenue: string; tickets: string };
    activity: TText[];
    invoices?: { id: string; who: string; amount: string; status: TText }[];
  };
  /** Pipeline walkthrough surface for scene templates (video / image): the
   *  real production stages of the vertical, not a generic feature list. */
  workflow?: {
    note: TText;
    steps: { name: TText; detail: TText }[];
    gates: TText[];
  };
  /** Model-routing + billing plane: what admins actually configure in an
   *  AI SaaS (providers per task, fallbacks, unit economics). */
  ops?: {
    /** Lane rows for the interactive console demo: each lane lets you pick
     *  providers and see the unit price the shipped backend would meter. */
    lanes?: {
      task: TText;
      providers: string[];
      unitLabel: TText;
      unitPrice: TText;
    }[];
    routes: { task: TText; primary: string; fallback: string }[];
    billing: TText[];
  };
  /** Landing showcase: believable vertical output rendered in pure CSS —
   *  posters, storyboard frames, cited answers or dashboard tiles. */
  showcase?: {
    kind: "dash" | "posters" | "frames" | "answers";
    title: TText;
    items: { title: TText; meta: TText }[];
  };
  /** Landing social proof: one quote + author. */
  quote?: { text: TText; who: TText };
  /** Workspaces surface: scene-authentic multi-tenant spaces that show WHY
   *  isolation exists — own members, credits, assets and billing per space. */
  workspaces?: {
    note: TText;
    spaces: {
      name: TText;
      detail: TText;
      pools: { label: TText; value: string }[];
    }[];
  };
}

export const TEMPLATES: TemplateMeta[] = [
  {
    slug: "aurora-saas",
    group: "classic" as const,
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
    primaryCta: { en: "Try the demo", zh: "试演示", ja: "デモを試す", fr: "Essayer la démo", de: "Demo testen" },
    tiers: [
      {
        name: { en: "Starter", zh: "入门", ja: "スターター", fr: "Démarrage", de: "Starter" },
        price: "$0",
        period: "mo",
        features: [
          { en: "1 project", zh: "1 个项目", ja: "プロジェクト 1 件", fr: "1 projet", de: "1 Projekt" },
          { en: "Email support", zh: "邮件支持", ja: "メールサポート", fr: "Support par e-mail", de: "E-Mail-Support" },
        ],
      },
      {
        name: { en: "Pro", zh: "专业版", ja: "Pro", fr: "Pro", de: "Pro" },
        price: "$29",
        period: "mo",
        highlight: true,
        features: [
          { en: "Unlimited projects", zh: "不限项目", ja: "プロジェクト無制限", fr: "Projets illimités", de: "Unbegrenzte Projekte" },
          { en: "AI assistant included", zh: "含 AI 助手", ja: "AI アシスタント込み", fr: "Assistant IA inclus", de: "KI-Assistent inklusive" },
          { en: "Priority support", zh: "优先支持", ja: "優先サポート", fr: "Support prioritaire", de: "Prio-Support" },
        ],
      },
    ],
    showcase: {
      kind: "dash",
      title: { en: "Inside the dashboard", zh: "仪表盘实时画面", ja: "ダッシュボードの現在", fr: "Dans le tableau de bord", de: "Im Dashboard live" },
      items: [
        {
          title: { en: "MRR", zh: "月度经常性收入", ja: "月次経常収益", fr: "MRR", de: "MRR" },
          meta: { en: "$41.2k · +18% MoM", zh: "$41.2k · 环比 +18%", ja: "$41.2k・前月比+18%", fr: "41,2 k$ · +18 %", de: "$41,2k · +18 % MoM" },
        },
        {
          title: { en: "Activation", zh: "激活", ja: "激活", fr: "Activation", de: "Aktivierung" },
          meta: { en: "trial → paid 32%", zh: "试用→付费 32%", ja: "トライアル→有料 32%", fr: "essai → payant 32 %", de: "Trial → zahlend 32 %" },
        },
        {
          title: { en: "Tickets", zh: "工单", ja: "チケット", fr: "Tickets", de: "Tickets" },
          meta: { en: "open 4 · first reply 2h", zh: "在办 4 · 首响 2 小时", ja: "未対応4・一次返信2h", fr: "4 ouverts · 1re réponse 2 h", de: "4 offen · Antwort 2 h" },
        },
      ],
    },
    quote: {
      text: { en: "We replaced a Notion + Stripe + Zendesk patchwork with one login and one bill.", zh: "我们把 Notion+Stripe+Zendesk 的拼接摊子，换成了统一登录和一张账单。", ja: "Notion＋Stripe＋Zendesk の寄せ集めが、ログイン一つに集約。", fr: "Le patchwork Notion+Stripe+Zendesk est devenu une seule connexion.", de: "Ein Login statt Notion+Stripe+Zendesk-Flickwerk." },
      who: { en: "Maya K. — founder, invoicing startup", zh: "Maya K.——发票应用创始人", ja: "Maya K.——請求アプリ創業者", fr: "Maya K. — fondatrice, startup de facturation", de: "Maya K. — Gründerin, Rechnungs-Startup" },
    },
    workspaces: {
      note: { en: "Multi-tenant out of the box: your team and every client get an isolated space — own members, own data, own billing.", zh: "自带多租户：你的团队和每个客户各占独立空间——成员、数据、账单互不可见。", ja: "マルチテナント標準搭載：チームとクライアントごとに、メンバー・データ・課金を隔離。", fr: "Multi-tenant d’office : chaque client a son espace isolé — membres, données, facturation.", de: "Mandantenfähig ab Werk: pro Kunde ein isolierter Bereich — Mitglieder, Daten, Abrechnung." },
      spaces: [
        {
          name: { en: "HQ", zh: "总部", ja: "本社", fr: "Siège", de: "HQ" },
          detail: { en: "core team · global roles", zh: "核心团队 · 全局角色", ja: "コアチーム・全体ロール", fr: "équipe centrale · rôles globaux", de: "Kernteam · globale Rollen" },
          pools: [
            {
              label: { en: "seats", zh: "席位", ja: "席数", fr: "sièges", de: "Seats" },
              value: "18 / 25",
            },
            {
              label: { en: "spend this month", zh: "本月花费", ja: "今月の支出", fr: "dépenses du mois", de: "Ausgaben/Monat" },
              value: "$310",
            },
          ],
        },
        {
          name: { en: "Client · Northwind", zh: "客户 · Northwind", ja: "クライアント · Northwind", fr: "Client · Northwind", de: "Kunde · Northwind" },
          detail: { en: "scoped to this client only", zh: "仅此客户可见", ja: "このクライアントのみ閲覧可", fr: "limité à ce client", de: "nur dieser Kunde" },
          pools: [
            {
              label: { en: "seats", zh: "席位", ja: "席数", fr: "sièges", de: "Seats" },
              value: "6 / 10",
            },
            {
              label: { en: "invoices", zh: "账单", ja: "請求書", fr: "factures", de: "Rechnungen" },
              value: "24 paid",
            },
          ],
        },
      ],
    },
    admin: {
      stats: { users: "1,284", licenses: "96", revenue: "$8.4k", tickets: "3" },
      activity: [
        { en: "k@loom.dev upgraded to Pro", zh: "k@loom.dev 升级到 Pro", ja: "k@loom.dev が Pro にアップグレード", fr: "k@loom.dev est passé à Pro", de: "k@loom.dev hat auf Pro upgegradet" },
        { en: "New signup: mira@feld.io", zh: "新注册：mira@feld.io", ja: "新規登録: mira@feld.io", fr: "Nouvelle inscription : mira@feld.io", de: "Neue Anmeldung: mira@feld.io" },
        { en: "Ticket #482 resolved", zh: "工单 #482 已解决", ja: "チケット #482 解決", fr: "Ticket #482 résolu", de: "Ticket #482 gelöst" },
      ],
    },
  },
  {
    slug: "pixel-store",
    group: "classic" as const,
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
    primaryCta: { en: "Open the store", zh: "逛商店", ja: "ストアを開く", fr: "Ouvrir la boutique", de: "Shop öffnen" },
    tiers: [
      {
        name: { en: "Solo", zh: "个人", ja: "Solo", fr: "Solo", de: "Solo" },
        price: "$19",
        period: "mo",
        features: [
          { en: "1 storefront", zh: "1 个店面", ja: "ストアフロント 1 つ", fr: "1 vitrine", de: "1 Storefront" },
          { en: "Weekly payouts", zh: "每周结算", ja: "週次払い出し", fr: "Virements hebdo", de: "Wöchentliche Auszahlung" },
        ],
      },
      {
        name: { en: "Studio", zh: "工作室", ja: "Studio", fr: "Studio", de: "Studio" },
        price: "$49",
        period: "mo",
        highlight: true,
        features: [
          { en: "5 storefronts", zh: "5 个店面", ja: "ストアフロント 5 つ", fr: "5 vitrines", de: "5 Storefronts" },
          { en: "Instant payouts", zh: "即时结算", ja: "即時払い出し", fr: "Virements instantanés", de: "Sofort-Auszahlung" },
          { en: "Discount engine", zh: "折扣引擎", ja: "割引エンジン", fr: "Moteur de remises", de: "Rabatt-Engine" },
        ],
      },
    ],
    showcase: {
      kind: "dash",
      title: { en: "The store, both ends", zh: "店铺的前后场", ja: "店舗の表と裏", fr: "La boutique, des deux côtés", de: "Der Shop von beiden Seiten" },
      items: [
        {
          title: { en: "GMV today", zh: "今日成交额", ja: "本日GMV", fr: "CA du jour", de: "Umsatz heute" },
          meta: { en: "$12.4k · conv 3.1%", zh: "$12.4k · 转化 3.1%", ja: "$12.4k・CVR 3.1%", fr: "12,4 k$ · conv 3,1 %", de: "$12,4k · CVR 3,1 %" },
        },
        {
          title: { en: "Refunds", zh: "退款", ja: "返金", fr: "Remboursements", de: "Rückerstattungen" },
          meta: { en: "0.4% · auto-approve under $10", zh: "0.4% · <$10 自动同意", ja: "0.4%・$10未満自動承認", fr: "0,4 % · auto sous 10 $", de: "0,4 % · auto unter $10" },
        },
        {
          title: { en: "Stock alerts", zh: "补货提醒", ja: "在庫アラート", fr: "Alertes stock", de: "Bestandswarnungen" },
          meta: { en: "2 SKUs below cover", zh: "2 个 SKU 低于安全库存", ja: "2SKUが安全在庫割れ", fr: "2 SKU sous le seuil", de: "2 SKU unter Schwelle" },
        },
      ],
    },
    quote: {
      text: { en: "Black Friday without a single spreadsheet in sight.", zh: "整个黑五，我们没有碰一张表格。", ja: "ブラックフライデーをスプレッドシートなしで乗り切った。", fr: "Un Black Friday sans le moindre tableur.", de: "Schwarzer Freitag ohne einzige Tabelle." },
      who: { en: "Owen L. — owner, DTC skincare brand", zh: "Owen L.——DTC 护肤品牌主", ja: "Owen L.——DTCスキンケア運営", fr: "Owen L. — fondateur d’une marque skincare", de: "Owen L. — DTC-Skincare-Gründer" },
    },
    workspaces: {
      note: { en: "Run many shops from one install: each storefront is a space with its own catalogue, payouts and members.", zh: "一套系统管多店：每个店铺独立空间——商品、回款、成员各自隔离。", ja: "1インストールで多店舗運営：店舗ごとに商品・入金・メンバーを分離。", fr: "Une instance, plusieurs boutiques : catalogue, paiements et membres isolés.", de: "Eine Installation, viele Shops — pro Shop ein eigener Bereich." },
      spaces: [
        {
          name: { en: "Flagship", zh: "自营旗舰店", ja: "直営店", fr: "Boutique phare", de: "Flagship" },
          detail: { en: "Shopify-synced catalogue", zh: "Shopify 同步的商品目录", ja: "Shopify同期カタログ", fr: "catalogue synchronisé Shopify", de: "Shopify-Synchron-Katalog" },
          pools: [
            {
              label: { en: "SKUs synced", zh: "已同步 SKU", ja: "SKU同期", fr: "SKU synchronisés", de: "SKUs synchronisiert" },
              value: "1,240",
            },
            {
              label: { en: "payouts this month", zh: "本月回款", ja: "今月の入金", fr: "paiements du mois", de: "Auszahlungen/Monat" },
              value: "$8,410",
            },
          ],
        },
        {
          name: { en: "Client · Bloomly", zh: "客户 · Bloomly", ja: "クライアント · Bloomly", fr: "Client · Bloomly", de: "Kunde · Bloomly" },
          detail: { en: "agency access, owner billing separate", zh: "代理权限与业主账单分离", ja: "代理アクセスと請求を分離", fr: "accès agence, facturation à part", de: "Agentur-Zugang, eigene Abrechnung" },
          pools: [
            {
              label: { en: "SKUs synced", zh: "已同步 SKU", ja: "SKU同期", fr: "SKU synchronisés", de: "SKUs synchronisiert" },
              value: "310",
            },
            {
              label: { en: "payouts this month", zh: "本月回款", ja: "今月の入金", fr: "paiements du mois", de: "Auszahlungen/Monat" },
              value: "$2,180",
            },
          ],
        },
      ],
    },
    admin: {
      stats: { users: "3,420", licenses: "517", revenue: "$12.9k", tickets: "7" },
      activity: [
        { en: "Order #1042 paid $49", zh: "订单 #1042 已付 $49", ja: "注文 #1042 $49 支払済", fr: "Commande #1042 payée 49 $", de: "Bestellung #1042: $49 bezahlt" },
        { en: "Refund issued #1039", zh: "已退款 #1039", ja: "返金対応 #1039", fr: "Remboursement #1039 émis", de: "Erstattung #1039 ausgezahlt" },
        { en: "New review ★★★★★", zh: "新评价 ★★★★★", ja: "新レビュー ★★★★★", fr: "Nouvel avis ★★★★★", de: "Neue Bewertung ★★★★★" },
      ],
    },
  },
  {
    slug: "emerald-clinic",
    group: "classic" as const,
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
    primaryCta: { en: "Book a visit", zh: "预约到访", ja: "予約する", fr: "Prendre RDV", de: "Termin buchen" },
    tiers: [
      {
        name: { en: "Visit", zh: "单次到访", ja: "訪問", fr: "Visite", de: "Besuch" },
        price: "$59",
        period: "once",
        features: [
          { en: "45-min consultation", zh: "45 分钟问诊", ja: "45 分の相談", fr: "Consultation 45 min", de: "45-Min-Beratung" },
          { en: "Care plan PDF", zh: "护理计划 PDF", ja: "ケア計画 PDF", fr: "Plan de soins PDF", de: "Pflegeplan als PDF" },
        ],
      },
      {
        name: { en: "Membership", zh: "会员", ja: "メンバー", fr: "Abonnement", de: "Mitgliedschaft" },
        price: "$25",
        period: "mo",
        highlight: true,
        features: [
          { en: "Monthly check-ins", zh: "每月随访", ja: "月次のフォロー", fr: "Suivis mensuels", de: "Monatliche Checks" },
          { en: "Same-day booking", zh: "当日可约", ja: "当日予約可", fr: "RDV le jour même", de: "Termin same-day" },
          { en: "10% off visits", zh: "到访 9 折", ja: "訪問 10% OFF", fr: "-10 % sur les visites", de: "10 % Rabatt" },
        ],
      },
    ],
    showcase: {
      kind: "dash",
      title: { en: "Today’s clinic board", zh: "今日诊所看板", ja: "本日の診察ボード", fr: "Tableau du jour du cabinet", de: "Tagesboard der Praxis" },
      items: [
        {
          title: { en: "Next patient", zh: "下一位患者", ja: "次の患者", fr: "Patient suivant", de: "Nächster Patient" },
          meta: { en: "14:20 · Dr. Lin · room 3", zh: "14:20 · 林医生 · 3 诊室", ja: "14:20・林医師・診察室3", fr: "14 h 20 · Dr Lin · salle 3", de: "14:20 · Dr. Lin · Raum 3" },
        },
        {
          title: { en: "No-show rate", zh: "爽约率", ja: "無断キャンセル率", fr: "Taux d’absence", de: "No-Show-Quote" },
          meta: { en: "4% · SMS reminders on", zh: "4% · 短信提醒已开启", ja: "4%・SMSリマインダー稼働", fr: "4 % · rappels SMS actifs", de: "4 % · SMS-Reminder an" },
        },
        {
          title: { en: "Revenue / visit", zh: "客单收入", ja: "来院あたり売上", fr: "Revenu / visite", de: "Umsatz / Besuch" },
          meta: { en: "$68 · +6% QoQ", zh: "$68 · 环比 +6%", ja: "$68・前四半期比+6%", fr: "68 $ · +6 %", de: "$68 · +6 %" },
        },
      ],
    },
    quote: {
      text: { en: "The phone stopped being our calendar.", zh: "电话不再是我们的排班表。", ja: "電話がカレンダーではなくなった。", fr: "Le téléphone n’est plus notre agenda.", de: "Das Telefon ist nicht mehr unser Kalender." },
      who: { en: "Priya S. — practice manager", zh: "Priya S.——诊所运营负责人", ja: "Priya S.——クリニック管理者", fr: "Priya S. — gestionnaire de cabinet", de: "Priya S. — Praxismanagerin" },
    },
    workspaces: {
      note: { en: "Branch-per-space: staff, appointment books and billing stay scoped to the clinic each team belongs to.", zh: "一店一空间：员工、预约账本与账单按分院隔离。", ja: "分院ごとのスペース：スタッフ・予約台帳・請求を分院単位で分離。", fr: "Un espace par cabinet : personnel, agenda et facturation cloisonnés.", de: "Pro Filiale ein Bereich — Personal, Agenda und Abrechnung getrennt." },
      spaces: [
        {
          name: { en: "Riverside branch", zh: "滨江门诊", ja: "リバーサイド院", fr: "Cabinet Riverside", de: "Filiale Riverside" },
          detail: { en: "11 chairs · 3 dentists", zh: "11 张牙椅 · 3 名医生", ja: "椅11・歯科医3", fr: "11 fauteuils · 3 dentistes", de: "11 Stühle · 3 Zahnärzte" },
          pools: [
            {
              label: { en: "appointments/wk", zh: "每周预约", ja: "予約/週", fr: "rendez-vous / sem", de: "Termine/Woche" },
              value: "312",
            },
            {
              label: { en: "patients", zh: "在册患者", ja: "患者数", fr: "patients", de: "Patienten" },
              value: "4,900",
            },
          ],
        },
        {
          name: { en: "Uptown branch", zh: "城北门诊", ja: "アプタウン院", fr: "Cabinet Uptown", de: "Filiale Uptown" },
          detail: { en: "hygiene-only schedule", zh: "仅洁牙号源", ja: "クリーニング枠のみ", fr: "agenda hygiène uniquement", de: "nur Prophylaxe-Termine" },
          pools: [
            {
              label: { en: "appointments/wk", zh: "每周预约", ja: "予約/週", fr: "rendez-vous / sem", de: "Termine/Woche" },
              value: "188",
            },
            {
              label: { en: "patients", zh: "在册患者", ja: "患者数", fr: "patients", de: "Patienten" },
              value: "2,140",
            },
          ],
        },
      ],
    },
    admin: {
      stats: { users: "860", licenses: "41", revenue: "$6.2k", tickets: "2" },
      activity: [
        { en: "Booking confirmed: May 12, 09:30", zh: "预约确认：5 月 12 日 09:30", ja: "予約確定: 5/12 09:30", fr: "RDV confirmé : 12 mai, 09 h 30", de: "Termin bestätigt: 12.05., 09:30" },
        { en: "Intake form completed", zh: "登记表已完成", ja: "受付フォーム完了", fr: "Formulaire d'admission complété", de: "Aufnahmebogen ausgefüllt" },
        { en: "Reminder sent for May 12", zh: "已发送 5 月 12 日提醒", ja: "5/12 のリマインド送信済", fr: "Rappel envoyé pour le 12 mai", de: "Erinnerung für den 12.05. gesendet" },
      ],
    },
  },
  {
    slug: "ignite-fit",
    group: "classic" as const,
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
    primaryCta: { en: "Start free trial", zh: "免费试用", ja: "無料トライアル", fr: "Essai gratuit", de: "Kostenlos testen" },
    tiers: [
      {
        name: { en: "Drop-in", zh: "单次课", ja: "ドロップイン", fr: "À la séance", de: "Einzelkurs" },
        price: "$15",
        period: "once",
        features: [
          { en: "Single class", zh: "单节课", ja: "1 クラス", fr: "1 cours", de: "1 Kurs" },
          { en: "Locker access", zh: "储物柜使用", ja: "ロッカー利用", fr: "Accès casier", de: "Spind-Zugang" },
        ],
      },
      {
        name: { en: "Unlimited", zh: "不限次", ja: "通い放題", fr: "Illimité", de: "Unlimited" },
        price: "$79",
        period: "mo",
        highlight: true,
        features: [
          { en: "All classes", zh: "全部课程", ja: "全クラス", fr: "Tous les cours", de: "Alle Kurse" },
          { en: "Monthly guest pass", zh: "每月访客券", ja: "月次ゲストパス", fr: "Pass invité mensuel", de: "Monatlicher Gast-Pass" },
          { en: "Progress tracking", zh: "进度追踪", ja: "進捗トラッキング", fr: "Suivi de progression", de: "Fortschritts-Tracking" },
        ],
      },
    ],
    showcase: {
      kind: "dash",
      title: { en: "Studio today", zh: "今日工作室", ja: "本日のスタジオ", fr: "Studio du jour", de: "Studio heute" },
      items: [
        {
          title: { en: "Active members", zh: "活跃会员", ja: "アクティブ会員", fr: "Membres actifs", de: "Aktive Mitglieder" },
          meta: { en: "612 · churn 3.1%", zh: "612 · 月流失 3.1%", ja: "612・解約率3.1%", fr: "612 · churn 3,1 %", de: "612 · Churn 3,1 %" },
        },
        {
          title: { en: "Class fill", zh: "课程满员率", ja: "クラス充足率", fr: "Remplissage des cours", de: "Kursauslastung" },
          meta: { en: "78% · 4 waitlisted today", zh: "78% · 今日候补 4 人", ja: "78%・本日待機4", fr: "78 % · 4 en attente", de: "78 % · 4 Wartende heute" },
        },
        {
          title: { en: "PT hours", zh: "私教课时", ja: "パーソナル数", fr: "Heures PT", de: "PT-Stunden" },
          meta: { en: "168 billed this month", zh: "本月已结 168 节", ja: "今月168コマ請求", fr: "168 facturées ce mois", de: "168 abgerechnet diesen Monat" },
        },
      ],
    },
    quote: {
      text: { en: "Members sign up from Instagram; we never touch a paper form.", zh: "会员从 Instagram 进来报名，我们再没摸过纸质表。", ja: "会員はInstagramから申込、紙の申込書は消えた。", fr: "Les membres s’inscrivent via Instagram — fini le papier.", de: "Mitglieder buchen via Instagram — kein Papier mehr." },
      who: { en: "Dana W. — studio owner", zh: "Dana W.——工作室主理人", ja: "Dana W.——スタジオオーナー", fr: "Dana W. — propriétaire de studio", de: "Dana W. — Studio-Inhaberin" },
    },
    workspaces: {
      note: { en: "Every venue gets its own space — schedules, member lists and billing never leak across locations.", zh: "每个场馆一个空间——排期、会员名册和账单互不串门。", ja: "会場ごとにスペース：スケジュール・会員・請求が会場間で混ざらない。", fr: "Chaque salle a son espace — plannings, listes et facturation isolés.", de: "Jeder Standort ein Bereich — Pläne, Listen, Abrechnung getrennt." },
      spaces: [
        {
          name: { en: "Riverside studio", zh: "滨江馆", ja: "リバーサイド店", fr: "Studio Riverside", de: "Studio Riverside" },
          detail: { en: "26 classes/wk · 2 coaches", zh: "每周 26 节课 · 2 名教练", ja: "週26クラス・コーチ2", fr: "26 cours/sem · 2 coachs", de: "26 Kurse/Woche · 2 Coaches" },
          pools: [
            {
              label: { en: "members", zh: "会员", ja: "会員", fr: "membres", de: "Mitglieder" },
              value: "612",
            },
            {
              label: { en: "check-ins today", zh: "今日签到", ja: "本日チェックイン", fr: "pointages du jour", de: "Check-ins heute" },
              value: "143",
            },
          ],
        },
        {
          name: { en: "Harbor studio", zh: "海港馆", ja: "ハーバー店", fr: "Studio Harbor", de: "Studio Harbor" },
          detail: { en: "shared equipment catalogue", zh: "共用器材目录", ja: "共用設備カタログ", fr: "catalogue matériel partagé", de: "geteilter Gerätekatalog" },
          pools: [
            {
              label: { en: "members", zh: "会员", ja: "会員", fr: "membres", de: "Mitglieder" },
              value: "208",
            },
            {
              label: { en: "check-ins today", zh: "今日签到", ja: "本日チェックイン", fr: "pointages du jour", de: "Check-ins heute" },
              value: "61",
            },
          ],
        },
      ],
    },
    admin: {
      stats: { users: "2,140", licenses: "128", revenue: "$9.7k", tickets: "5" },
      activity: [
        { en: "Check-in: ana@run.club", zh: "签到：ana@run.club", ja: "チェックイン: ana@run.club", fr: "Check-in : ana@run.club", de: "Check-in: ana@run.club" },
        { en: "Class full: Power 18:00", zh: "课程满员：Power 18:00", ja: "満員: Power 18:00", fr: "Cours complet : Power 18 h", de: "Kurs voll: Power 18:00" },
        { en: "New member: leo@lift.gg", zh: "新会员：leo@lift.gg", ja: "新会員: leo@lift.gg", fr: "Nouveau membre : leo@lift.gg", de: "Neues Mitglied: leo@lift.gg" },
      ],
    },
  },
  {
    slug: "reel-forge",
    group: "ai",
    styleId: "midnight",
    category: { en: "AI Video Ads", zh: "AI 视频广告", ja: "AI 動画広告", fr: "Pub vidéo IA", de: "KI-Werbevideo" },
    name: { en: "Reel Forge", zh: "Reel 锻造坊", ja: "Reel Forge", fr: "Reel Forge", de: "Reel Forge" },
    heroTitle: { en: "Paste a script. Get a ready-to-run 9:16 ad.", zh: "贴一段脚本，产出可直接投放的 9:16 广告视频。", ja: "台本を貼ると、そのまま出稿できる 9:16 広告動画に。", fr: "Collez un script. Obtenez une pub 9:16 prête à diffuser.", de: "Skript rein, fertige 9:16-Meta-Ad raus." },
    heroSubtitle: { en: "An ad-video pipeline SaaS: script → storyboard → voice → visuals → captions → music → rendered MP4. Revisions re-render only the scenes you touched.", zh: "广告视频流水线 SaaS：脚本→分镜→配音→画面→字幕→音乐→成片；改哪儿，只重渲哪儿。", ja: "広告動画パイプライン SaaS：台本→絵コンテ→音声→映像→字幕→音楽→完成版。触ったシーンだけ再レンダリング。", fr: "Un SaaS de pipeline pub vidéo : script → storyboard → voix → visuels → sous-titres → musique → MP4. Seules les scènes touchées sont relues.", de: "Ein Werbevideo-Pipeline-SaaS: Skript → Storyboard → Voice → Visuals → Captions → Musik → MP4. Nur geänderte Szenen rendern neu." },
    features: [
      { en: "Scene-graph storyboard (shot / angle / camera)", zh: "分镜表带镜别/角度/运镜", ja: "絵コンテ（ショット／角度／カメラ）", fr: "Storyboard par scène (plan / angle / caméra)", de: "Storyboard pro Szene (Shot / Winkel / Kamera)" },
      { en: "Conversational edits — diff re-render only", zh: "对话式修改，只重渲改动镜头", ja: "対話編集——差分だけ再レンダリング", fr: "Édition conversationnelle — re-rendu par delta", de: "Konversationelle Edits — nur Delta nachrendern" },
      { en: "Per-run cost ledger you can actually read", zh: "每次运行的成本账单一目了然", ja: "実行ごとのコスト台帳をそのまま提示", fr: "Journal de coûts par run, lisible", de: "Kosten-Ledger pro Run, direkt lesbar" },
    ],
    primaryCta: { en: "Forge a reel", zh: "生成一条", ja: "リールを作る", fr: "Créer un reel", de: "Reel erstellen" },
    tiers: [
      {
        name: { en: "Draft", zh: "草稿", ja: "下書き", fr: "Brouillon", de: "Entwurf" },
        price: "$0",
        period: "mo",
        features: [
          { en: "1 render / month, watermarked", zh: "每月 1 条·带水印", ja: "月1本・透かし付き", fr: "1 rendu / mois, filigrané", de: "1 Render/Monat, Wasserzeichen" },
          { en: "Rule-based edits only", zh: "仅规则式修改", ja: "ルール編集のみ", fr: "Éditions par règles", de: "Nur Regel-Edits" },
        ],
      },
      {
        name: { en: "Creator", zh: "创作者", ja: "クリエイター", fr: "Créateur", de: "Creator" },
        price: "$29",
        period: "mo",
        highlight: true,
        features: [
          { en: "40 renders / month, HD clean", zh: "每月 40 条·高清无水印", ja: "月40本・HD・透かしなし", fr: "40 rendus / mois, HD propre", de: "40 Renders/Monat, HD" },
          { en: "LLM conversational editing", zh: "LLM 对话式修改", ja: "LLM対話編集", fr: "Édition LLM conversationnelle", de: "LLM-Chat-Edits" },
          { en: "Cost ledger + resume without re-spend", zh: "成本账单 + 断点续渲不重复花钱", ja: "コスト台帳＋再開で二重支出なし", fr: "Ledger + reprise sans double dépense", de: "Ledger + Resume ohne Doppel-Ausgabe" },
        ],
      },
    ],
    workflow: {
      note: { en: "Static pipeline demo — in a real build every model runs on YOUR provider keys.", zh: "静态流水线演示——真实部署里所有模型都跑在你自己的供应商密钥上。", ja: "静的パイプラインデモ——実運用では全モデルを自分のプロバイダキーで。", fr: "Démo statique — en production chaque modèle tourne sur VOS clés.", de: "Statische Demo — im Ernstlauf laufen alle Modelle auf DEINEN Keys." },
      steps: [
        {
          name: { en: "Product brief", zh: "产品简报", ja: "ブリーフ", fr: "Brief produit", de: "Produkt-Briefing" },
          detail: { en: "traits + selling points + audience → four competing concepts (pain→solution, seeding, review, story)", zh: "填特质/卖点/受众 → 产出 4 套竞争脚本（痛点方案、种草、测评、故事）", ja: "特徴・訴求・対象 → 競合する4本の案（課題解決・種明かし・レビュー・ストーリー）", fr: "traits + arguments + cible → 4 concepts (pain→solution, seeding, review, story)", de: "Traits + USPs + Zielgruppe → 4 Wettbewerbskonzepte" },
        },
        {
          name: { en: "Script", zh: "脚本", ja: "台本", fr: "Script", de: "Skript" },
          detail: { en: "pick one concept and polish the copy — it stays the single source of truth", zh: "选定一版并打磨文案——它始终是唯一事实源", ja: "1案を選び文言を磨く——それが唯一の真実ソース", fr: "on choisit un concept — il reste la source unique", de: "ein Konzept wählen — es bleibt die Wahrheitsquelle" },
        },
        {
          name: { en: "Storyboard", zh: "分镜", ja: "絵コンテ", fr: "Storyboard", de: "Storyboard" },
          detail: { en: "every scene carries shot / angle / camera move / elements — nothing renders yet", zh: "每个分镜带镜别/角度/运镜/画面元素——此刻还不渲染", ja: "各シーンにショット・角度・カメラ・要素——まだ描画しない", fr: "chaque scène porte plan/angle/mouvement/éléments — rien ne rend", de: "jede Szene mit Shot/Winkel/Kamera/Elementen — nichts rendert" },
        },
        {
          name: { en: "Cost quote", zh: "成本预估", ja: "コスト見積", fr: "Devis de coût", de: "Kostenangebot" },
          detail: { en: "the render price is quoted and confirmed BEFORE any credit is spent", zh: "渲染前先报价、待确认——额度一分都不冤枉", ja: "描画前に金額提示・確認後クレジット消費", fr: "le prix est annoncé et confirmé AVANT toute dépense", de: "Preis vor jeder Ausgabe angekündigt und bestätigt" },
        },
        {
          name: { en: "Visuals + voice", zh: "画面与配音", ja: "映像＋音声", fr: "Visuels + voix", de: "Visuals + Voice" },
          detail: { en: "per-scene video generation, neural voiceover with word-level timings, kinetic captions, music bed", zh: "逐镜生成视频、词级时间轴配音、动效字幕、音乐铺底", ja: "シーン別映像、語レベル音声、動的字幕、BGM", fr: "vidéo par scène, voix au timing mot-à-mot, sous-titres animés, musique", de: "Video pro Szene, Voice mit Wort-Timings, Kinetik-Captions, Musik" },
        },
        {
          name: { en: "Assembly + revise", zh: "合成与修改", ja: "合成と修正", fr: "Montage + révisions", de: "Assembly + Revision" },
          detail: { en: "segments stitched into the 9:16 MP4; “make the hook punchier” only re-renders the targeted scenes", zh: "拼接成片 9:16；说“开场更抓人”只重渲命中的镜头", ja: "9:16完成品へ；「冒頭をもっと強く」で対象シーンだけ再描画", fr: "assemblé en MP4 9:16 ; « rends le hook punchy » ne relit que les scènes visées", de: "MP4 9:16 gefügt; „Hook punchiger“ rendert nur die Zielszenen" },
        },
      ],
      gates: [
        { en: "Storyboard approval before spend", zh: "分镜确认前不渲染", ja: "絵コンテ承認まで描画しない", fr: "Validation du storyboard avant dépense", de: "Storyboard-Freigabe vor Ausgabe" },
        { en: "Content-addressed cache: 85–95% of segments reused on edits", zh: "内容寻址缓存：改动复用 85–95% 已渲段", ja: "内容アドレスキャッシュ：編集の85–95%を再利用", fr: "Cache par contenu : 85–95 % des segments réutilisés", de: "Content-Addressed-Cache: 85–95 % Reuse" },
        { en: "Fail loud — never fake footage when a key is missing", zh: "缺密钥直接报错，绝不产出假画面", ja: "キー欠落は即エラー——偽映像を出さない", fr: "Échec franc — jamais de fausses images", de: "Lauter Fehler — nie Fake-Clips" },
      ],
    },
    ops: {
      lanes: [
      {
        task: { en: "Script & chat edits", zh: "脚本与对话修改", ja: "脚本・対話編集", fr: "Script & éditions", de: "Skript & Edits" },
        providers: ["DeepSeek", "OpenAI", "Anthropic", "Gemini", "Local rule templates (offline)"],
        unitLabel: { en: "$/1k tokens in/out", zh: "$/1k token 入/出", ja: "$/1kトークン 入出力", fr: "$/1k jetons in/out", de: "$/1k Tokens ein/aus" },
        unitPrice: { en: "$0.15 / $0.60", zh: "$0.15 / $0.60", ja: "$0.15/$0.60", fr: "$0.15/$0.60", de: "$0.15/$0.60" },
      },
      {
        task: { en: "Scene videos", zh: "分镜视频", ja: "シーン動画", fr: "Vidéos de scène", de: "Szenen-Videos" },
        providers: ["Seedance", "Kling", "Veo", "Wan", "Hailuo", "CogVideoX", "Jimeng"],
        unitLabel: { en: "$/clip", zh: "$/条片段", ja: "$/クリップ", fr: "$/clip", de: "$/Clip" },
        unitPrice: { en: "$0.20–1.20", zh: "$0.20–1.20", ja: "$0.20–1.20", fr: "$0,20–1,20", de: "$0,20–1,20" },
      },
      {
        task: { en: "Voiceover", zh: "配音", ja: "ナレーション", fr: "Voix off", de: "Synchronisation" },
        providers: ["edge-tts (free)", "ElevenLabs", "CosyVoice"],
        unitLabel: { en: "$/1k characters", zh: "$/1k 字符", ja: "$/1k文字", fr: "$/1k caractères", de: "$/1k Zeichen" },
        unitPrice: { en: "$0 / $1.40", zh: "$0 / $1.40", ja: "$0/$1.40", fr: "$0/$1,40", de: "$0/$1,40" },
      },
      {
        task: { en: "Music & SFX", zh: "音乐音效", ja: "音楽・SE", fr: "Musique & SFX", de: "Musik & SFX" },
        providers: ["Local synth (zero cost)", "Licensed library"],
        unitLabel: { en: "$/track", zh: "$/轨", ja: "$/トラック", fr: "$/piste", de: "$/Track" },
        unitPrice: { en: "$0–3", zh: "$0–3", ja: "$0–3", fr: "$0–3", de: "$0–3" },
      },
      ],

      routes: [
        {
          task: { en: "Script & chat edits", zh: "脚本与对话修改", ja: "脚本・対話編集", fr: "Script & éditions", de: "Skript & Edits" },
          primary: "DeepSeek / any OpenAI-compatible LLM",
          fallback: "deterministic rule templates (offline)",
        },
        {
          task: { en: "Scene video", zh: "分镜视频", ja: "シーン映像", fr: "Vidéo de scène", de: "Szenen-Video" },
          primary: "Seedance · Kling · Veo",
          fallback: "Wan / Hailuo / CogVideoX / Jimeng",
        },
        {
          task: { en: "Voiceover", zh: "配音", ja: "ナレーション", fr: "Voix off", de: "Voice" },
          primary: "edge-tts (free)",
          fallback: "ElevenLabs / CosyVoice",
        },
        {
          task: { en: "Music & SFX", zh: "音乐音效", ja: "音楽・SE", fr: "Musique & SFX", de: "Musik & SFX" },
          primary: "local synth (zero cost)",
          fallback: "licensed library",
        },
      ],
      billing: [
        { en: "$0.03–0.15 per rendered scene at draft tier", zh: "草渲档每镜 $0.03–0.15", ja: "下書きはシーン$0.03–0.15", fr: "0,03–0,15 $ par scène (brouillon)", de: "$0,03–0,15 pro Szene (Draft)" },
        { en: "A 60s ad: ~$0.5–1.5 with edge-tts + Seedance mini; $4–16 fully premium", zh: "60 秒成片约 $0.5–1.5（edge-tts+Seedance mini），全顶配 $4–16", ja: "60秒は$0.5–1.5（edge-tts+Seedance mini）・最高構成で$4–16", fr: "Pub 60 s : 0,5–1,5 $ (edge-tts + Seedance mini), 4–16 $ full premium", de: "60-Sekunden-Ad: $0,5–1,5 bzw. $4–16 premium" },
        { en: "Every provider's spend rolls into per-run totals and monthly invoices", zh: "各供应商花费自动汇总为单次运行与月度账单", ja: "プロバイダ別支出を実行別・月次請求に集計", fr: "Chaque dépense agrégée par run et par facture", de: "Provider-Ausgaben pro Run und Rechnung aggregiert" },
      ],
    },
    showcase: {
      kind: "frames",
      title: { en: "Storyboard approved before any credit is spent", zh: "花额度之前，先审分镜", ja: "クレジット使用前に絵コンテ承認", fr: "Le storyboard validé avant toute dépense", de: "Storyboard-Freigabe vor jeder Ausgabe" },
      items: [
        {
          title: { en: "Hook — pain", zh: "开场·痛点", ja: "Hook・課題", fr: "Accroche · douleur", de: "Hook · Schmerz" },
          meta: { en: "close-up · dolly in · 0–3s", zh: "特写 · 推进 · 0–3s", ja: "接写・イン・0-3s", fr: "gros plan · travelling avant · 0–3 s", de: "Close-up · Dolly-in · 0–3 s" },
        },
        {
          title: { en: "Problem", zh: "冲突", ja: "問題", fr: "Problème", de: "Problem" },
          meta: { en: "over-shoulder · static · 3–8s", zh: "过肩 · 固定 · 3–8s", ja: "肩越し・固定・3-8s", fr: "par-dessus l’épaule · fixe · 3–8 s", de: "Over-shoulder · statisch · 3–8 s" },
        },
        {
          title: { en: "Product demo", zh: "产品展示", ja: "商品デモ", fr: "Démo produit", de: "Produkt-Demo" },
          meta: { en: "macro pan · spin · 8–14s", zh: "微移 · 旋转 · 8–14s", ja: "マクロ・回転・8-14s", fr: "macro · rotation · 8–14 s", de: "Macro-Schwenk · Spin · 8–14 s" },
        },
        {
          title: { en: "CTA", zh: "行动号召", ja: "コールトゥアクション", fr: "Appel à l’action", de: "Handlungsaufruf" },
          meta: { en: "medium · whip to logo · 14–18s", zh: "中景 · 甩镜到品牌 · 14–18s", ja: "ミディアム・ロゴへ・14-18s", fr: "plan moyen · fouetté au logo · 14–18 s", de: "Medium · Whip-to-Logo · 14–18 s" },
        },
      ],
    },
    quote: {
      text: { en: "Approve the storyboard, then only the scenes I changed re-render. A 60-second ad cost $1.12.", zh: "确认分镜后才扣额度；改了哪几镜，就只重渲哪几镜。一条 60 秒广告 1.12 美元。", ja: "絵コンテ承認後に従量課金、変更したシーンだけ再描画。60秒広告で$1.12。", fr: "J’approuve le storyboard, seules les scènes modifiées sont relues. Une pub de 60 s : 1,12 $.", de: "Storyboard bestätigen, nur geänderte Szenen rendern — 60-Sekunden-Ad für $1,12." },
      who: { en: "Jules R. — paid-social lead", zh: "Jules R.——投放负责人", ja: "Jules R.——広告運用リード", fr: "Jules R. — responsable social paid", de: "Jules R. — Paid-Social-Lead" },
    },
    workspaces: {
      note: { en: "Agencies isolate every advertiser: own provider keys, brand rules and a separate cost ledger.", zh: "代运营按客户隔离：各家自己的模型密钥、品牌规范和独立成本账。", ja: "代理店は広告主ごとに分離：プロバイダキー・ブランドルール・コスト台帳を個別に。", fr: "Chaque annonceur a son espace : clés, règles de marque et ledger séparés.", de: "Jeder Advertiser ein Bereich: eigene Keys, Brand-Regeln, Kosten-Ledger." },
      spaces: [
        {
          name: { en: "Client · Kettle & Co", zh: "客户 · Kettle & Co", ja: "クライアント · Kettle & Co", fr: "Client · Kettle & Co", de: "Kunde · Kettle & Co" },
          detail: { en: "2 campaigns rendering · shared brand kit", zh: "2 个在渲项目 · 共享品牌套件", ja: "2 campaign・キット共有", fr: "2 campagnes en cours · kit partagé", de: "2 Kampagnen · geteiltes Brand-Kit" },
          pools: [
            {
              label: { en: "renders this month", zh: "本月渲染", ja: "今月の描画", fr: "rendus du mois", de: "Renders/Monat" },
              value: "118",
            },
            {
              label: { en: "cost ledger", zh: "成本账", ja: "コスト台帳", fr: "journal de coûts", de: "Kosten-Ledger" },
              value: "$132.40",
            },
          ],
        },
        {
          name: { en: "Client · Lumen Skin", zh: "客户 · Lumen Skin", ja: "クライアント · Lumen Skin", fr: "Client · Lumen Skin", de: "Kunde · Lumen Skin" },
          detail: { en: "voice + palette locked to its brand kit", zh: "配音与色板锁进该品牌套件", ja: "音声と色をキットに固定", fr: "voix + palette verrouillées sur son kit", de: "Voice + Palette aufs Kit gesperrt" },
          pools: [
            {
              label: { en: "renders this month", zh: "本月渲染", ja: "今月の描画", fr: "rendus du mois", de: "Renders/Monat" },
              value: "42",
            },
            {
              label: { en: "cost ledger", zh: "成本账", ja: "コスト台帳", fr: "journal de coûts", de: "Kosten-Ledger" },
              value: "$51.10",
            },
          ],
        },
      ],
    },
    admin: {
      stats: {
        users: "5,012",
        licenses: "1,208",
        revenue: "$21.4k",
        tickets: "4",
      },
      activity: [
        { en: "Run #231 done · 8 scenes · $1.12 cost logged", zh: "任务 #231 完成·8 镜·入账成本 $1.12", ja: "実行#231完了・8シーン・$1.12計上", fr: "Run #231 fini · 8 scènes · 1,12 $ notés", de: "Run #231 fertig · 8 Szenen · $1,12 erfasst" },
        { en: "Resume: only scene 4 re-rendered after top-up, 7 from cache", zh: "断点续渲：补余额后仅重渲第 4 镜，其余 7 镜走缓存", ja: "再開：シーン4のみ再描画・7件キャッシュ", fr: "Reprise : seule la scène 4 relue, 7 en cache", de: "Resume: nur Szene 4 neu, 7 aus Cache" },
        { en: "Edit plan: pacing → 4 scenes invalidated, 16 reused", zh: "对话修改：节奏调整 → 失效 4 镜、复用 16 镜", ja: "編集プラン：pacing→4シーン無効・16再利用", fr: "Plan d'édition : rythme → 4 invalidées, 16 réutilisées", de: "Edit-Plan: Pacing → 4 invalidiert, 16 reuse" },
      ],
      invoices: [
        {
          id: "INV-2301",
          who: "growth@dtc-store.com",
          amount: "$29.00",
          status: { en: "Paid", zh: "已支付", ja: "支払済", fr: "Payée", de: "Bezahlt" },
        },
        {
          id: "INV-2302",
          who: "media@brandlab.io",
          amount: "$29.00",
          status: { en: "Paid", zh: "已支付", ja: "支払済", fr: "Payée", de: "Bezahlt" },
        },
        {
          id: "INV-2303",
          who: "solo@creator.dev",
          amount: "$9.90",
          status: { en: "Refunded", zh: "已退款", ja: "返金済", fr: "Remboursée", de: "Erstattet" },
        },
      ],
    },
  },
  {
    slug: "poster-forge",
    group: "ai",
    styleId: "candy",
    category: { en: "AI Image", zh: "AI 图片", ja: "AI 画像", fr: "Image IA", de: "KI-Bild" },
    name: { en: "Poster Forge", zh: "海报熔炉", ja: "Poster Forge", fr: "Poster Forge", de: "Poster Forge" },
    heroTitle: { en: "One brand kit. Every campaign image.", zh: "一套品牌套件，产出所有营销图。", ja: "ブランドキット一つから、全キャンペーン画像を。", fr: "Un brand kit, tous vos visuels de campagne.", de: "Ein Brand-Kit, alle Kampagnen-Bilder." },
    heroSubtitle: { en: "An image-generation SaaS shape: brand-locked prompts, model routing per task, async jobs, upscale chain, API delivery.", zh: "图片生成 SaaS 形态：品牌锁定提示词、按任务路由模型、异步任务、放大精修链、API 交付。", ja: "画像生成SaaSの型：ブランド固定プロンプト・タスク別ルーティング・非同期ジョブ・拡大加工・API納品。", fr: "Un SaaS d'image : prompts verrouillés marque, routage par tâche, jobs asynchrones, chaîne d'upscaling, livraison API.", de: "Ein KI-Bild-SaaS: markenfixierte Prompts, Routing pro Aufgabe, Async-Jobs, Upscale-Kette, API-Auslieferung." },
    features: [
      { en: "Brand kit locks palette, type, product", zh: "品牌套件锁定色板/字体/产品", ja: "キットで色・書体・商品を固定", fr: "Le kit verrouille palette, typo, produit", de: "Kit fixiert Palette, Typo, Produkt" },
      { en: "Style-specific model routing", zh: "按风格路由到最合适模型", ja: "スタイル別ルーティング", fr: "Routage de modèle par style", de: "Style-spezifisches Routing" },
      { en: "Credit-metered, batch-friendly", zh: "额度计量，天然适合批量", ja: "クレジット計量・バッチ向き", fr: "Crédits meterés, adapté au batch", de: "Credit-gemessen, batch-freundlich" },
    ],
    primaryCta: { en: "Forge a poster", zh: "生成一张海报", ja: "ポスターを作る", fr: "Créer une affiche", de: "Poster erstellen" },
    tiers: [
      {
        name: { en: "Free", zh: "免费", ja: "無料", fr: "Gratuit", de: "Gratis" },
        price: "$0",
        period: "mo",
        features: [
          { en: "10 images / month", zh: "每月 10 张", ja: "月10枚", fr: "10 images / mois", de: "10 Bilder/Monat" },
          { en: "Watermarked exports", zh: "带水印导出", ja: "透かし付き", fr: "Exports filigranés", de: "Mit Wasserzeichen" },
        ],
      },
      {
        name: { en: "Brand", zh: "品牌版", ja: "ブランド", fr: "Marque", de: "Brand" },
        price: "$29",
        period: "mo",
        highlight: true,
        features: [
          { en: "200 images / month", zh: "每月 200 张", ja: "月200枚", fr: "200 images / mois", de: "200 Bilder/Monat" },
          { en: "Custom brand styles + 4K upscale", zh: "自定义品牌风格 + 4K 放大", ja: "ブランドスタイル自作＋4K拡大", fr: "Styles perso + upscale 4K", de: "Eigene Styles + 4K-Upscale" },
          { en: "Delivery API + per-key spend caps", zh: "交付 API + 按密钥限额", ja: "配信API＋キー別上限", fr: "API + plafonds par clé", de: "Delivery-API + Key-Limits" },
        ],
      },
    ],
    workflow: {
      note: { en: "Static pipeline demo — in a real build every model runs on YOUR provider keys.", zh: "静态流水线演示——真实部署里所有模型都跑在你自己的供应商密钥上。", ja: "静的パイプラインデモ——実運用は自分のプロバイダキーで。", fr: "Démo statique — en production, sur VOS clés.", de: "Statische Demo — im Ernstlauf auf DEINEN Keys." },
      steps: [
        {
          name: { en: "Brand kit", zh: "品牌套件", ja: "ブランドキット", fr: "Brand kit", de: "Brand-Kit" },
          detail: { en: "palette, typography, product photos and reference angles locked as anchors for every render", zh: "色板/字体/产品图/参考角度全部锁定，作为每次生成的锚点", ja: "配色・書体・商品写真・参照アングルを固定条件に", fr: "palette, typo, photos, angles verrouillés comme ancres", de: "Palette, Typo, Fotos, Winkel als Anker fixiert" },
        },
        {
          name: { en: "Prompt recipe", zh: "提示词配方", ja: "プロンプトレシピ", fr: "Recette de prompt", de: "Prompt-Rezept" },
          detail: { en: "users supply variables; the server supplies style prefix, negative terms and size — never raw prompting", zh: "用户只填变量；前缀/负面词/尺寸由服务端配方注入——绝不裸奔 prompt", ja: "ユーザーは変数のみ、前置き・否定語・サイズはサーバー側レシピ", fr: "l'utilisateur donne les variables ; le serveur la recette — jamais de prompt brut", de: "Nutzer liefern Variablen, der Server das Rezept — nie Roh-Prompts" },
        },
        {
          name: { en: "Routing + queue", zh: "路由与队列", ja: "ルーティング＋キュー", fr: "Routage + file", de: "Routing + Queue" },
          detail: { en: "drafts on the fast cheap model, finals on the pro route, edits on a multimodal route; async job row with progress", zh: "草稿走快而省、定稿走 Pro、改图走多模态路由；异步任务带进度", ja: "下書きは高速モデル・決定稿はPro・編集はマルチモーダル、非同期ジョブ", fr: "brouillon rapide, final pro, édition multimodale ; job avec progression", de: "Draft schnell, Finale pro, Edits multimodal; Async-Job mit Status" },
        },
        {
          name: { en: "Refine chain", zh: "精修链", ja: "加工チェーン", fr: "Chaîne de finition", de: "Veredelungskette" },
          detail: { en: "upscale to 4K, inpaint regions, swap backgrounds — every step metered in credits", zh: "4K 放大、局部重绘、换背景——每一步都按额度计量", ja: "4K拡大・部分再描画・背景置換を全てクレジット計量", fr: "upscale 4K, inpainting, fond remplacé — chaque étape métrée", de: "4K-Upscale, Inpainting, Hintergrundtausch — jeder Schritt gemessen" },
        },
        {
          name: { en: "Persist + deliver", zh: "落地与交付", ja: "保存と納品", fr: "Stockage + livraison", de: "Persistenz + Delivery" },
          detail: { en: "provider URLs expire within an hour — each accepted image lands in YOUR storage before the UI ever shows it", zh: "供应商链接一小时即失效——每张被采纳的图先落到你自己的存储再展示", ja: "プロバイダURLは1時間で失効、採用画像はまず自ストレージへ", fr: "les URLs expirent dans l'heure — chaque visuel est d'abord copié chez vous", de: "Provider-URLs verfallen — jedes Bild zuerst ins eigene Storage" },
        },
        {
          name: { en: "Batch + API", zh: "批量与 API", ja: "バッチ＋API", fr: "Batch + API", de: "Batch + API" },
          detail: { en: "50–500 SKUs per run with parallel rendering; every published workflow is also a stable HTTP endpoint", zh: "50–500 个 SKU 并行跑；每个工作流同时是一个稳定的 HTTP 端点", ja: "50–500 SKU並列、各ワークフローがHTTPエンドポイントにも", fr: "50–500 SKU en parallèle ; chaque flux devient un endpoint HTTP", de: "50–500 SKUs parallel; jeder Workflow wird ein HTTP-Endpoint" },
        },
      ],
      gates: [
        { en: "Prompt screened by the moderation gate before generation", zh: "生成前先过提示词审查门", ja: "生成前にプロンプト審査ゲート", fr: "Prompt criblé avant génération", de: "Prompt vor Generierung gescreent" },
        { en: "Credits reserved atomically, committed once per accepted image", zh: "额度原子预扣，仅在图被采纳时一次性结算", ja: "クレジットは原子的仮押さえ・採用時のみ確定", fr: "Crédits réservés atomiquement, commit par visuel accepté", de: "Credits atomisch reserviert, pro accepted Bild committet" },
        { en: "Accepted cost = raw price × regenerate ratio (plan for 3–8)", zh: "单图有效成本 = 单价 × 重生成系数（按 3–8 预估）", ja: "実効コスト＝単価×再生成係数（3–8）", fr: "Coût réel = prix × ratio de régénération (3–8)", de: "Real cost = Preis × Regenerations-Faktor (3–8)" },
      ],
    },
    ops: {
      lanes: [
      {
        task: { en: "Drafts & thumbnails", zh: "草稿缩略", ja: "下書き", fr: "Brouillons", de: "Drafts" },
        providers: ["Flux schnell-class", "SDXL-turbo"],
        unitLabel: { en: "$/image", zh: "$/图", ja: "$/枚", fr: "$/image", de: "$/Bild" },
        unitPrice: { en: "$0.003", zh: "$0.003", ja: "$0.003", fr: "$0.003", de: "$0.003" },
      },
      {
        task: { en: "Final brand assets", zh: "品牌定稿", ja: "決定稿", fr: "Visuels finaux", de: "Finale" },
        providers: ["Flux 2 Pro", "SD 3.5", "GPT-Image"],
        unitLabel: { en: "$/image", zh: "$/图", ja: "$/枚", fr: "$/image", de: "$/Bild" },
        unitPrice: { en: "$0.05", zh: "$0.05", ja: "$0.05", fr: "$0.05", de: "$0.05" },
      },
      {
        task: { en: "Product edits", zh: "产品改图", ja: "商品編集", fr: "Éditions produit", de: "Produkt-Edits" },
        providers: ["Multimodal edit (Nano-Banana class)", "Inpaint chain"],
        unitLabel: { en: "$/image", zh: "$/图", ja: "$/枚", fr: "$/image", de: "$/Bild" },
        unitPrice: { en: "$0.039", zh: "$0.039", ja: "$0.039", fr: "$0.039", de: "$0.039" },
      },
      {
        task: { en: "Upscale", zh: "放大", ja: "拡大", fr: "Upscale", de: "Upscale" },
        providers: ["Real-ESRGAN 4K", "Provider-native upscale"],
        unitLabel: { en: "$/image", zh: "$/图", ja: "$/枚", fr: "$/image", de: "$/Bild" },
        unitPrice: { en: "$0.002", zh: "$0.002", ja: "$0.002", fr: "$0.002", de: "$0.002" },
      },
      ],

      routes: [
        {
          task: { en: "Draft / thumbnails", zh: "草稿缩略", ja: "下書き", fr: "Brouillons", de: "Drafts" },
          primary: "Flux schnell-class (sub-second)",
          fallback: "SDXL-turbo route",
        },
        {
          task: { en: "Final brand assets", zh: "品牌定稿", ja: "決定稿", fr: "Visuels finaux", de: "Finale" },
          primary: "Flux 2 Pro",
          fallback: "SD 3.5 / GPT-Image",
        },
        {
          task: { en: "Product edits", zh: "产品改图", ja: "商品編集", fr: "Éditions produit", de: "Produkt-Edits" },
          primary: "multimodal edit route (Nano-Banana class)",
          fallback: "inpaint chain",
        },
        {
          task: { en: "Upscale", zh: "放大", ja: "拡大", fr: "Upscale", de: "Upscale" },
          primary: "Real-ESRGAN 4K",
          fallback: "provider-native upscale",
        },
      ],
      billing: [
        { en: "Credits per model × resolution tier — never raw calls", zh: "按模型×分辨率档位扣额度——不按裸调用", ja: "モデル×解像度のクレジット制（生コール不可）", fr: "Crédits par modèle × résolution — jamais brut", de: "Credits pro Modell × Auflösung — nie roh" },
        { en: "Admin sees accepted-image cost, latency by route and spend per account from day one", zh: "后台从第一天就展示单图有效成本、路由延迟、账户花费", ja: "管理画面は初日から実効コスト・ルート別遅延・口座別支出", fr: "La console montre dès le jour 1 coût réel, latence par route, dépense par compte", de: "Admin zeigt ab Tag 1: echte Kosten, Latenz je Route, Spend pro Konto" },
        { en: "Per-key caps + queue isolation stop batch jobs starving live requests", zh: "按密钥限额 + 队列隔离，批量任务挤不掉实时请求", ja: "キー上限＋キュー分離でバッチがリアルタイムを圧迫しない", fr: "Plafonds par clé + file isolée contre les voisins bruyants", de: "Key-Limits + Queue-Isolation gegen Noisy Neighbours" },
      ],
    },
    showcase: {
      kind: "posters",
      title: { en: "Four campaigns, one brand kit", zh: "一套品牌套件，四路投放", ja: "キット一つ、展開四本", fr: "Quatre campagnes, un seul brand kit", de: "Vier Kampagnen, ein Brand-Kit" },
      items: [
        {
          title: { en: "Hero drop", zh: "主打上新", ja: "ヒーロー画像", fr: "Visuel phare", de: "Hero-Motiv" },
          meta: { en: "Flux 2 Pro · 3:4 · palette locked", zh: "Flux 2 Pro · 3:4 · 锁色板", ja: "Flux2Pro・3:4・色固定", fr: "Flux 2 Pro · 3:4 · palette verrouillée", de: "Flux 2 Pro · 3:4 · Palette fix" },
        },
        {
          title: { en: "Sale story", zh: "促销故事图", ja: "セール絵巻", fr: "Story promo", de: "Sale-Story" },
          meta: { en: "draft → final chain · 2.6 regen", zh: "草稿→定稿链 · 重生成 2.6", ja: "下書き→決定稿・係数2.6", fr: "brouillon → final · ratio 2,6", de: "Draft → Finale · Ratio 2,6" },
        },
        {
          title: { en: "Product cutout", zh: "产品精修图", ja: "商品切り抜き", fr: "Découpe produit", de: "Produkt-Freisteller" },
          meta: { en: "inpaint + 4K upscale", zh: "局部重绘 + 4K 放大", ja: "部分再描画＋4K", fr: "inpainting + upscale 4K", de: "Inpainting + 4K-Upscale" },
        },
        {
          title: { en: "UGC test", zh: "达人种草图", ja: "UGC風テスト", fr: "Test UGC", de: "UGC-Test" },
          meta: { en: "edit route · 1:1 · 3 variants", zh: "改图路由 · 1:1 · 3 版", ja: "編集ルート・1:1・3案", fr: "édition · 1:1 · 3 variantes", de: "Edit-Route · 1:1 · 3 Varianten" },
        },
      ],
    },
    quote: {
      text: { en: "One kit in, every platform out — the designer bottleneck is gone.", zh: "一套套件进去，全平台物料出来——设计师不再是瓶颈。", ja: "キット一つで全プラットフォーム対応、デザイナーがボトルネックでない。", fr: "Un kit entrant, toutes les plateformes sortantes — le goulot design a disparu.", de: "Ein Kit rein, alle Plattformen raus — kein Designer-Flaschenhals." },
      who: { en: "Sana B. — DTC brand owner", zh: "Sana B.——DTC 品牌主", ja: "Sana B.——DTCブランドオーナー", fr: "Sana B. — fondatrice DTC", de: "Sana B. — DTC-Gründerin" },
    },
    workspaces: {
      note: { en: "Each advertiser gets an isolated kit: its own palette, product library, credits and per-key spend cap.", zh: "每个广告主一套独立套件：自己的色板、产品库、额度和按密钥限额。", ja: "広告主ごとにキットを分離：色・商品ライブラリ・クレジット・キー別上限。", fr: "Chaque annonceur a son kit isolé : palette, produits, crédits, plafond par clé.", de: "Jeder Kunde ein isoliertes Kit: Palette, Produktbibliothek, Credits, Key-Limit." },
      spaces: [
        {
          name: { en: "Agency · Northwind", zh: "代理 · Northwind", ja: "代理店 · Northwind", fr: "Agence · Northwind", de: "Agentur · Northwind" },
          detail: { en: "3 brand kits · 12 members", zh: "3 套品牌套件 · 12 名成员", ja: "キット3・メンバー12", fr: "3 brand kits · 12 membres", de: "3 Brand-Kits · 12 Mitglieder" },
          pools: [
            {
              label: { en: "credits left", zh: "剩余额度", ja: "残クレジット", fr: "crédits restants", de: "Credits übrig" },
              value: "2,140",
            },
            {
              label: { en: "per-key cap", zh: "单密钥限额", ja: "キー別上限", fr: "plafond par clé", de: "Key-Limit" },
              value: "$80/mo",
            },
          ],
        },
        {
          name: { en: "Agency · Bloomly", zh: "代理 · Bloomly", ja: "代理店 · Bloomly", fr: "Agence · Bloomly", de: "Agentur · Bloomly" },
          detail: { en: "separate keys and storage", zh: "独立密钥与存储", ja: "キーとストレージ分離", fr: "clés et stockage séparés", de: "eigene Keys & Storage" },
          pools: [
            {
              label: { en: "credits left", zh: "剩余额度", ja: "残クレジット", fr: "crédits restants", de: "Credits übrig" },
              value: "960",
            },
            {
              label: { en: "per-key cap", zh: "单密钥限额", ja: "キー別上限", fr: "plafond par clé", de: "Key-Limit" },
              value: "$40/mo",
            },
          ],
        },
      ],
    },
    admin: {
      stats: {
        users: "2,760",
        licenses: "612",
        revenue: "$14.8k",
        tickets: "5",
      },
      activity: [
        { en: "Batch #48: 40 posters · $0.31 accepted-image cost at 2.6 regen ratio", zh: "批量 #48：40 张·重生成系数 2.6，单图有效成本 $0.31", ja: "バッチ#48：40枚・実効$0.31/枚（係数2.6）", fr: "Lot #48 : 40 affiches · 0,31 $/visuel (ratio 2,6)", de: "Batch #48: 40 Poster · $0,31/Bild (Ratio 2,6)" },
        { en: "Prompt blocked by moderation (brand impersonation) — user notified", zh: "提示词被审查拦截（冒用品牌），已通知用户", ja: "プロンプト審査で遮断（ブランド偽装）・通知済み", fr: "Prompt bloqué (imitation de marque) — notifié", de: "Prompt blockiert (Markenimitation) — gemeldet" },
        { en: "Flux route degraded → traffic auto-fell back to SD 3.5", zh: "Flux 路由劣化——流量自动回落到 SD 3.5", ja: "Flux劣化→SD3.5へ自動フォールバック", fr: "Route Flux dégradée → repli auto SD 3.5", de: "Flux degradiert → Auto-Fallback SD 3.5" },
      ],
      invoices: [
        {
          id: "INV-2301",
          who: "studio@adagency.fr",
          amount: "$29.00",
          status: { en: "Paid", zh: "已支付", ja: "支払済", fr: "Payée", de: "Bezahlt" },
        },
        {
          id: "INV-2302",
          who: "ecom@brandkit.jp",
          amount: "$29.00",
          status: { en: "Paid", zh: "已支付", ja: "支払済", fr: "Payée", de: "Bezahlt" },
        },
        {
          id: "INV-2303",
          who: "indie@printlab.de",
          amount: "$9.90",
          status: { en: "Refunded", zh: "已退款", ja: "返金済", fr: "Remboursée", de: "Erstattet" },
        },
      ],
    },
  },
  {
    slug: "askdocs",
    ops: {
      lanes: [
      {
        task: { en: "Query routing", zh: "查询路由", ja: "クエリルーティング", fr: "Routage de requête", de: "Query-Routing" },
        providers: ["GPT-4o-mini", "DeepSeek", "Heuristic rules (no key)"],
        unitLabel: { en: "$/1k tokens", zh: "$/1k token", ja: "$/1kトークン", fr: "$/1k jetons", de: "$/1k Tokens" },
        unitPrice: { en: "$0.00015–0.0006", zh: "$0.00015–0.0006", ja: "$0.00015–0.0006", fr: "$0.00015–0.0006", de: "$0.00015–0.0006" },
      },
      {
        task: { en: "Final answers", zh: "最终回答", ja: "最終回答", fr: "Réponses finales", de: "Finale Antworten" },
        providers: ["Frontier model per plan", "Extractive answer (no key)"],
        unitLabel: { en: "$/1k tokens", zh: "$/1k token", ja: "$/1kトークン", fr: "$/1k jetons", de: "$/1k Tokens" },
        unitPrice: { en: "$0.0006–0.01", zh: "$0.0006–0.01", ja: "$0.0006–0.01", fr: "$0.0006–0.01", de: "$0.0006–0.01" },
      },
      {
        task: { en: "Embeddings", zh: "向量化", ja: "埋め込み", fr: "Plongements", de: "Embeddings" },
        providers: ["text-embedding-3-small", "BM25-only (no vectors)"],
        unitLabel: { en: "$/1M tokens", zh: "$/1M token", ja: "$/1Mトークン", fr: "$/1M jetons", de: "$/1M Tokens" },
        unitPrice: { en: "$0.02 / $0", zh: "$0.02 / $0", ja: "$0.02/$0", fr: "$0.02/$0", de: "$0.02/$0" },
      },
      ],

      routes: [
        {
          task: { en: "Query routing", zh: "查询路由", ja: "クエリルーティング", fr: "Routage de requête", de: "Query-Routing" },
          primary: "small fast model for routing & rewrites",
          fallback: "heuristic classifier",
        },
        {
          task: { en: "Final answers", zh: "最终回答", ja: "最終回答", fr: "Réponses finales", de: "Finale-Antworten" },
          primary: "frontier model per plan",
          fallback: "extractive answer (no LLM key)",
        },
        {
          task: { en: "Embeddings", zh: "向量化", ja: "埋め込み", fr: "Plongements", de: "Embeddings" },
          primary: "provider embedding lane",
          fallback: "BM25-only degradation",
        },
      ],
      billing: [
        { en: "Per-seat plans + usage credits for heavy queryers", zh: "按席位订阅 + 重度使用者的额度计量", ja: "座席課金＋多用者の従量クレジット", fr: "Plans par siège + crédits pour gros usagers", de: "Seats + Credits für Vielnutzer" },
        { en: "Token spend tracked per workspace and rolled into the invoice", zh: "Token 花费按工作区归集进账单", ja: "トークン支出はワークスペース別に請求へ集計", fr: "Spend de tokens agrégé par espace dans la facture", de: "Token-Spend pro Workspace in der Rechnung" },
        { en: "Cache hits metered at zero — visible in the ledger", zh: "缓存命中零计量，账目可见", ja: "キャッシュ命中はゼロ計量・台帳表示", fr: "Cache à zéro — visible au registre", de: "Cache-Hits mit null gemessen — im Ledger sichtbar" },
      ],
    },
    group: "ai" as const,
    styleId: "ocean",
    category: { en: "AI Q&A", zh: "AI 问答", ja: "AI Q&A", fr: "Q&R IA", de: "KI-Q&A" },
    name: { en: "AskDocs", zh: "文档问答", ja: "AskDocs", fr: "AskDocs", de: "AskDocs" },
    heroTitle: {
      en: "Ask your documents. Get answers with receipts.",
      zh: "向你的文档提问，答案自带出处。",
      ja: "ドキュメントに質問、根拠付きで回答。",
      fr: "Interrogez vos documents. Réponses avec sources.",
      de: "Frag deine Dokumente. Antworten mit Belegen.",
    },
    heroSubtitle: {
      en: "A knowledge Q&A SaaS: hybrid retrieval, cited answers, your data stays yours.",
      zh: "知识问答 SaaS：混合检索、引用作答，数据始终归你。",
      ja: "知識 Q&A SaaS：ハイブリッド検索と引用回答、データはあなたのもの。",
      fr: "Un SaaS de Q&R documentaire : retrieval hybride, réponses citées, données privées.",
      de: "Ein Wissens-Q&A-SaaS: hybride Suche, zitierte Antworten, deine Daten bleiben deine.",
    },
    features: [
      { en: "Cited answers, always", zh: "答案必带引用", ja: "必ず引用付き回答", fr: "Réponses citées, toujours", de: "Immer mit Quellenangabe" },
      { en: "Vector + keyword hybrid", zh: "向量+关键词混合检索", ja: "ベクトル+キーワード検索", fr: "Hybride vectoriel + mots-clés", de: "Vektor + Keyword hybrid" },
      { en: "Per-workspace isolation", zh: "按工作区隔离数据", ja: "ワークスペース別分離", fr: "Isolation par espace", de: "Mandantentrennung" },
    ],
    primaryCta: { en: "Ask something", zh: "提个问题", ja: "質問してみる", fr: "Posez une question", de: "Frag etwas" },
    tiers: [
      {
        name: { en: "Solo", zh: "个人", ja: "ソロ", fr: "Solo", de: "Solo" },
        price: "$0",
        period: "mo",
        features: [
          { en: "1 workspace, 50 docs", zh: "1 个工作区，50 篇文档", ja: "1 WS・ドキュメント50件", fr: "1 espace, 50 docs", de: "1 Workspace, 50 Docs" },
          { en: "Email support", zh: "邮件支持", ja: "メールサポート", fr: "Support par e-mail", de: "E-Mail-Support" },
        ],
      },
      {
        name: { en: "Team", zh: "团队版", ja: "チーム", fr: "Équipe", de: "Team" },
        price: "$39",
        period: "mo",
        highlight: true,
        features: [
          { en: "Unlimited docs", zh: "文档不限量", ja: "ドキュメント無制限", fr: "Docs illimitées", de: "Unbegrenzte Docs" },
          { en: "SSO + audit trail", zh: "SSO 与审计日志", ja: "SSO＋監査ログ", fr: "SSO + journal d'audit", de: "SSO + Audit-Log" },
          { en: "Priority answers", zh: "优先算力", ja: "優先処理", fr: "Calcul prioritaire", de: "Vorrang-Berechnung" },
        ],
      },
    ],
    chat: {
      user: {
        en: "Summarize the termination clauses in our vendor contract.",
        zh: "总结我们供应商合同的终止条款。",
        ja: "ベンダー契約の解約条項をまとめて。",
        fr: "Résume les clauses de résiliation du contrat fournisseur.",
        de: "Fasse die Kündigungsklauseln des Lieferantenvertrags zusammen.",
      },
      assistant: {
        en: "Three paths to exit: 30-day convenience clause [p.4], material breach with 15-day cure [p.7], and insolvency trigger [p.9]. Want the exact wording?",
        zh: "三种退出路径：30 天任意解约 [第4页]、重大违约 15 天补救期 [第7页]、破产触发 [第9页]。要原文吗？",
        ja: "退卡路線は3つ：30日任意解除[p.4]、重大违约＋15日治癒[p.7]、破産トリガー[p.9]。原文が必要ですか？",
        fr: "Trois sorties : résiliation 30 j [p.4], manquement grave + 15 j [p.7], insolvabilité [p.9]. Le texte exact ?",
        de: "Drei Auswege: 30-Tage-Kündigung [S.4], Verstoß + 15 Tage [S.7], Insolvenz [S.9]. Wortlaut gefällig?",
      },
    },
    rag: {
      question: {
        en: "Is our data used to train any model?",
        zh: "我们的数据会被拿去训练模型吗？",
        ja: "データはモデル学習に使われますか？",
        fr: "Nos données servent-elles à entraîner un modèle ?",
        de: "Werden unsere Daten zum Training genutzt?",
      },
      answer: {
        en: "No — retrieval runs over your workspace only, prompts are screened before generation, and nothing is used for training.",
        zh: "不会——检索仅在你的工作区内进行，提示词在生成前经过审查，绝不用于训练。",
        ja: "いいえ——検索は自分のワークスペースのみ。プロンプトは生成前に審査され、学習には使いません。",
        fr: "Non — retrieval uniquement sur votre espace, prompts criblés avant génération, zéro entraînement.",
        de: "Nein — Retrieval nur in deinem Workspace, Prompts vor Generierung gescreent, kein Training damit.",
      },
      sources: [
        { en: "Security overview", zh: "安全总览", ja: "セキュリティ概要", fr: "Vue d'ensemble sécurité", de: "Security-Überblick" },
        { en: "DPA", zh: "数据处理协议", ja: "DPA", fr: "DPA", de: "DPA" },
      ],
    },
    showcase: {
      kind: "answers",
      title: { en: "Answers arrive with receipts", zh: "回答自带出处", ja: "回答には出典が付く", fr: "Les réponses viennent avec leurs sources", de: "Antworten mit Belegen" },
      items: [
        {
          title: { en: "How do I rotate my API key?", zh: "如何轮换 API Key？", ja: "APIキーのローテーション方法は？", fr: "Comment pivoter ma clé API ?", de: "Wie rotiere ich meinen API-Key?" },
          meta: { en: "2 sources · Settings → API", zh: "2 处引用 · 设置→API", ja: "2引用・設定→API", fr: "2 sources · Réglages → API", de: "2 Quellen · Settings → API" },
        },
        {
          title: { en: "Is there a student discount?", zh: "有学生折扣吗？", ja: "学生割引はある？", fr: "Y a-t-il un tarif étudiant ?", de: "Gibt es Studentenrabatt?" },
          meta: { en: "cited quote · Billing FAQ", zh: "引用原文 · 计费 FAQ", ja: "引用・Billing FAQ", fr: "citation · FAQ facturation", de: "Zitat · Billing-FAQ" },
        },
        {
          title: { en: "Where is our data processed?", zh: "我们在哪处理数据？", ja: "データ処理の所在地は？", fr: "Où sont traitées nos données ?", de: "Wo werden unsere Daten verarbeitet?" },
          meta: { en: "4 sources · DPA template", zh: "4 处引用 · DPA 模板", ja: "4引用・DPAテンプレ", fr: "4 sources · modèle DPA", de: "4 Quellen · DPA-Vorlage" },
        },
      ],
    },
    quote: {
      text: { en: "Support volume fell 40% because the first answer is already the right one.", zh: "首答即对，客服总量掉了 40%。", ja: "最初の回答が正しいので、問い合わせが40%減った。", fr: "Le volume de support a baissé de 40 % — la première réponse est déjà la bonne.", de: "Support-Pensum −40 %, weil die erste Antwort schon stimmt." },
      who: { en: "Tom H. — head of CX", zh: "Tom H.——客户体验负责人", ja: "Tom H.——CX責任者", fr: "Tom H. — responsable CX", de: "Tom H. — CX-Leiter" },
    },
    workspaces: {
      note: { en: "Each customer — or each corpus — lives in its own workspace: separate connectors, indexes and members.", zh: "每个客户（或每套文档）一个工作区：连接器、索引、成员各自独立。", ja: "顧客ごと・コーパスごとにワークスペース：コネクタ・索引・メンバーを分離。", fr: "Chaque client — ou corpus — a son espace : connecteurs, index et membres distincts.", de: "Pro Kunde — oder Korpus — ein eigener Workspace: Konnektoren, Index, Mitglieder getrennt." },
      spaces: [
        {
          name: { en: "Acme IT docs", zh: "Acme IT 文档", ja: "Acme IT ドキュメント", fr: "Docs IT Acme", de: "Acme-IT-Docs" },
          detail: { en: "2 connectors · Confluence + PDF", zh: "2 个连接器 · Confluence + PDF", ja: "2コネクタ・Confluence+PDF", fr: "2 connecteurs · Confluence + PDF", de: "2 Konnektoren · Confluence + PDF" },
          pools: [
            {
              label: { en: "indexed chunks", zh: "索引分块", ja: "インデックス分割", fr: "segments indexés", de: "indexierte Chunks" },
              value: "18.4k",
            },
            {
              label: { en: "answers/wk", zh: "每周回答", ja: "回答/週", fr: "réponses / sem", de: "Antworten/Woche" },
              value: "3,110",
            },
          ],
        },
        {
          name: { en: "HR handbook", zh: "HR 手册", ja: "HRハンドブック", fr: "Manual RH", de: "HR-Handbuch" },
          detail: { en: "restricted index, editors only", zh: "受限索引 · 仅编辑可见", ja: "閲覧は編集者のみ", fr: "index restreint · éditeurs seuls", de: "index beschränkt · nur Editoren" },
          pools: [
            {
              label: { en: "indexed chunks", zh: "索引分块", ja: "インデックス分割", fr: "segments indexés", de: "indexierte Chunks" },
              value: "4.2k",
            },
            {
              label: { en: "answers/wk", zh: "每周回答", ja: "回答/週", fr: "réponses / sem", de: "Antworten/Woche" },
              value: "640",
            },
          ],
        },
      ],
    },
    admin: {
      stats: { users: "1,890", licenses: "433", revenue: "$11.2k", tickets: "3" },
      activity: [
        { en: "Workspace 'Legal' indexed 210 docs", zh: "工作区「Legal」已索引 210 篇文档", ja: "WS 'Legal'：210件をインデックス", fr: "Espace « Legal » : 210 docs indexés", de: "Workspace 'Legal': 210 Docs indexiert" },
        { en: "SSO login: finance@corp.io", zh: "SSO 登录：finance@corp.io", ja: "SSO ログイン: finance@corp.io", fr: "Connexion SSO : finance@corp.io", de: "SSO-Login: finance@corp.io" },
        { en: "Query screened + answered with 4 citations", zh: "问题通过审查并带 4 条引用作答", ja: "審査済み・引用4件で回答", fr: "Question criblée + 4 citations", de: "Abfrage gescreent + 4 Quellen" },
      ],
    },
  },

];

export function getTemplate(slug: string): TemplateMeta | undefined {
  return TEMPLATES.find((t) => t.slug === slug);
}
