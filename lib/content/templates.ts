// Template gallery + sample-site (样板间) data.
//
// Each entry is a real make1day starter template. The preview renders the
// surfaces the generator actually ships — landing, pricing, login, AI chat,
// RAG and the admin console — with the template's REAL theme variables from
// lib/generator/themes (not a screenshot), switchable via tabs.
//
// These are make1day-site-only marketing assets (listed in
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
  /** AI chat surface: one sample exchange. */
  chat: { user: TText; assistant: TText };
  /** RAG surface: sample grounded question + cited answer. */
  rag: { question: TText; answer: TText; sources: TText[] };
  /** Admin console surface: headline stats + recent activity. */
  admin: {
    stats: { users: string; licenses: string; revenue: string; tickets: string };
    activity: TText[];
  };
}

export const TEMPLATES: TemplateMeta[] = [
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
];

export function getTemplate(slug: string): TemplateMeta | undefined {
  return TEMPLATES.find((t) => t.slug === slug);
}
