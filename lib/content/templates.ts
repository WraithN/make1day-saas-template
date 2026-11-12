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
    routes: { task: TText; primary: string; fallback: string }[];
    billing: TText[];
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
          { en: "Community support", zh: "社区支持", ja: "コミュニティ支援", fr: "Support communautaire", de: "Community-Support" },
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
    chat: {
      user: {
        en: "Draft a launch email for my waitlist.",
        zh: "给我的等待列表写一封上线邮件。",
        ja: "ウェイトリスト向け公開メールを作って。",
        fr: "Rédige un email de lancement pour ma liste d'attente.",
        de: "Entwirf eine Launch-Mail für meine Warteliste.",
      },
      assistant: {
        en: "Here's a 90-word draft with one clear CTA — want a shorter variant for social?",
        zh: "这是一版 90 字草稿、只含一个明确 CTA——需要更短的社媒版吗？",
        ja: "CTA 1 つの 90 語ドラフトです——SNS 用の短縮版も出せます。",
        fr: "Voici un brouillon de 90 mots avec un seul CTA — version courte pour les réseaux ?",
        de: "Hier ein 90-Wort-Entwurf mit einem klaren CTA — Kürzer für Social?",
      },
    },
    rag: {
      question: {
        en: "How do I invite teammates?",
        zh: "如何邀请团队成员？",
        ja: "チームメンバーの招待方法は？",
        fr: "Comment inviter des coéquipiers ?",
        de: "Wie lade ich Teammitglieder ein?",
      },
      answer: {
        en: "Settings → Members → invite by email. Seats are prorated to your billing cycle.",
        zh: "设置 → 成员 → 通过邮箱邀请；席位按账单周期折算计费。",
        ja: "設定 → メンバー → メールで招待。席数は請求サイクルで日割りです。",
        fr: "Réglages → Membres → invitation par email. Les sièges sont proratisés sur votre cycle.",
        de: "Einstellungen → Mitglieder → per E-Mail einladen. Sitze werden anteilig im Zyklus berechnet.",
      },
      sources: [
        { en: "Docs → Teams", zh: "文档 → 团队", ja: "ドキュメント → チーム", fr: "Docs → Équipes", de: "Doku → Teams" },
        { en: "Billing FAQ", zh: "计费 FAQ", ja: "請求 FAQ", fr: "FAQ facturation", de: "Abrechnungs-FAQ" },
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
    chat: {
      user: {
        en: "Write copy for an 8-bit font pack.",
        zh: "给一个 8-bit 字体包写文案。",
        ja: "8bit フォントパックの説明文を書いて。",
        fr: "Rédige une fiche pour un pack de polices 8-bit.",
        de: "Schreib einen Text für ein 8-Bit-Fontpack.",
      },
      assistant: {
        en: "Pixel-perfect type for retro builds: 6 weights, hinting for low-res screens, OFL licensed.",
        zh: "为复古项目打造的像素级字体：6 个字重、低分辨率屏_hinting_、OFL 授权。",
        ja: "レトロ制作向け完璧なピクセル書体：6 ウェイト、低解像度ヒントング、OFL ライセンス。",
        fr: "Une typo pixel-perfect pour vos builds rétro : 6 graisses, hinting basse résolution, licence OFL.",
        de: "Pixelgenaue Type für Retro-Builds: 6 Schnitte, Hinting für Low-Res, OFL-Lizenz.",
      },
    },
    rag: {
      question: {
        en: "When do payouts arrive?",
        zh: "结算款什么时候到账？",
        ja: "払い出しはいつ届きますか？",
        fr: "Quand arrivent les virements ?",
        de: "Wann kommen Auszahlungen an?",
      },
      answer: {
        en: "Balances over $50 settle every Monday; Studio plans can payout instantly.",
        zh: "余额满 $50 每周一结算；Studio 方案可即时结算。",
        ja: "$50 以上の残高は毎週月曜に決済。Studio は即時払い出し可能です。",
        fr: "Les soldes > 50 $ sont réglés chaque lundi ; le plan Studio permet le virement instantané.",
        de: "Guthaben über $50 werden montags ausgezahlt; Studio sofort.",
      },
      sources: [
        { en: "Payments guide", zh: "支付指南", ja: "決済ガイド", fr: "Guide paiements", de: "Zahlungs-Guide" },
        { en: "Plan comparison", zh: "方案对比", ja: "プラン比較", fr: "Comparatif", de: "Plan-Vergleich" },
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
    chat: {
      user: {
        en: "What should I bring to a first visit?",
        zh: "第一次到访需要带什么？",
        ja: "初回訪問の持ち物は？",
        fr: "Qu'apporter pour une première visite ?",
        de: "Was bringe ich zum Ersttermin mit?",
      },
      assistant: {
        en: "Photo ID, current medication list and recent labs. Arrive 10 min early for intake.",
        zh: "身份证件、当前用药清单与近期化验单；请提前 10 分钟到院登记。",
        ja: "身分証、服用薬リスト、直近の検査結果を。受付のため 10 分前にお越しください。",
        fr: "Pièce d'identité, liste des traitements et analyses récentes. Arrivez 10 min en avance.",
        de: "Ausweis, Medikamentenliste, aktuelle Befunde. Bitte 10 Min früher da sein.",
      },
    },
    rag: {
      question: {
        en: "Do you offer home visits?",
        zh: "提供上门服务吗？",
        ja: "自宅への訪問はありますか？",
        fr: "Proposez-vous des visites à domicile ?",
        de: "Bieten Sie Hausbesuche an?",
      },
      answer: {
        en: "Yes — within 8 km on weekdays, booked at least 24 h ahead.",
        zh: "提供——工作日 8 公里范围内，需提前 24 小时预约。",
        ja: "はい——平日、8 km 圏内、24 時間前までの予約制です。",
        fr: "Oui — dans un rayon de 8 km en semaine, réservées 24 h à l'avance.",
        de: "Ja — werktags im Umkreis von 8 km, Buchung 24 h im Voraus.",
      },
      sources: [
        { en: "Service area", zh: "服务范围", ja: "対応エリア", fr: "Zone desservie", de: "Einzugsgebiet" },
        { en: "Booking policy", zh: "预约政策", ja: "予約ポリシー", fr: "Politique de RDV", de: "Terminrichtlinie" },
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
    chat: {
      user: {
        en: "Build me a 3-day strength split.",
        zh: "给我排一个三天力量分化计划。",
        ja: "3 日の筋力分割メニューを作って。",
        fr: "Crée-moi un split force sur 3 jours.",
        de: "Erstelle mir einen 3-Tage-Kraftsplit.",
      },
      assistant: {
        en: "Push / pull / legs+core, 45 min each at RPE 7, warm-ups linked.",
        zh: "推 / 拉 / 腿+核心，每次 45 分钟、RPE 7，热身链接已附。",
        ja: "プッシュ／プル／脚+コア、各 45 分・RPE 7、ウォームアップ 링크付き。",
        fr: "Push / pull / jambes+core, 45 min à RPE 7, échauffements liés.",
        de: "Push / Pull / Beine+Core, je 45 Min bei RPE 7, Warm-ups verlinkt.",
      },
    },
    rag: {
      question: {
        en: "Can I pause my membership?",
        zh: "可以暂停会员吗？",
        ja: "メンバーシップは休止できますか？",
        fr: "Puis-je suspendre mon abonnement ?",
        de: "Kann ich meine Mitgliedschaft pausieren?",
      },
      answer: {
        en: "Up to 8 weeks per year from the member portal; billing resumes automatically.",
        zh: "每年最多 8 周，在会员门户操作；到期自动恢复计费。",
        ja: "年最大 8 週まで会員ポータルから休止可。終了後、請求は自動再開。",
        fr: "Jusqu'à 8 semaines par an via le portail ; la facturation reprend automatiquement.",
        de: "Bis 8 Wochen/Jahr im Portal; Abrechnung läuft automatisch weiter.",
      },
      sources: [
        { en: "Membership terms", zh: "会员条款", ja: "会員規約", fr: "Conditions d'abonnement", de: "Mitgliedsbedingungen" },
        { en: "Portal guide", zh: "门户指南", ja: "ポータルガイド", fr: "Guide du portail", de: "Portal-Handbuch" },
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
          { en: "Community support", zh: "社区支持", ja: "コミュニティ支援", fr: "Support communautaire", de: "Community-Support" },
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
