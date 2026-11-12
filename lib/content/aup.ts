// Acceptable Use Policy — public compliance page (five languages).
// Required by Creem's account review for AI generation merchants; ships in
// every generated project so customer deployments carry the same policy
// surface. Keep bullets short: this is a policy summary, not legal advice
// (the /terms page carries the contractual version).

import type { Lang } from "@/lib/i18n-core";

export type TText = Record<Lang, string>;

export interface AucSection {
  id: string;
  title: TText;
  bullets: TText[];
}

export const AUP_INTRO: TText = {
  en: "This Acceptable Use Policy governs every AI generation surface on this site: the assistant chat, document Q&A and the AI video-workflow feature. Using any of them means you accept these rules. Violations lead to blocked requests, suspended accounts and, where required, reports to authorities.",
  zh: "本《可接受使用政策》适用于本站全部 AI 生成面：助手对话、文档问答与 AI 视频工作流功能。使用即视为接受下列规则。违规将导致请求被拦截、账号被停用，必要时依法向主管机关报告。",
  ja: "本利用許容ポリシーは、アシスタントチャット、ドキュメント Q&A、AI ビデオワークフロー機能を含むすべての AI 生成面に適用されます。利用は本ルールへの同意を意味します。違反はリクエスト遮断、アカウント停止、必要に応じた当局への報告の対象となります。",
  fr: "La présente politique d'utilisation acceptable régit toutes les surfaces de génération IA du site : chat assistant, Q&R documentaire et fonction de flux vidéo IA. Les utiliser vaut acceptation de ces règles. Les violations entraînent blocage, suspension et, si requis, signalement aux autorités.",
  de: "Diese Acceptable-Use-Policy gilt für alle KI-Erzeugungsflächen dieser Site: Assistent-Chat, Doku-Q&A und die KI-Video-Workflow-Funktion. Nutzung bedeutet Zustimmung. Verstöße führen zu Blocks, Kontosperrung und ggf. Meldung an Behörden.",
};

export const AUP_SECTIONS: AucSection[] = [
  {
    id: "prohibited",
    title: {
      en: "Prohibited uses (zero tolerance)",
      zh: "禁止用途（零容忍）",
      ja: "禁止事項（ゼロトレランス）",
      fr: "Usages interdits (tolérance zéro)",
      de: "Verbotene Nutzungen (Null-Toleranz)",
    },
    bullets: [
      {
        en: "NSFW or sexual content of any kind, and ANY sexualized depiction of minors — permanent ban and law-enforcement referral.",
        zh: "任何形式的色情/NSFW 内容，以及任何未成年人色情化表现——永久封禁并移交执法机关。",
        ja: "あらゆる NSFW/性的コンテンツ、および未成年の性的描写の一切——永久 BAN と法執行機関への通報。",
        fr: "Tout contenu NSFW ou sexuel, et TOUTE représentation sexualisée de mineurs — bannissement définitif et saisine des autorités.",
        de: "Jegliche NSFW-/sexuelle Inhalte und JEDE sexualisierte Minderjährigen-Darstellung — dauerhafter Bann und Meldung an Strafverfolgung.",
      },
      {
        en: "Non-consensual likenesses: face-swapping real people without written consent, intimate imagery, revenge-porn style content.",
        zh: "未经同意的肖像：无书面授权换脸真实人物、亲密影像、报复式色情内容。",
        ja: "同意なき肖像：書面同意のない実在人物の顔スワップ、親密映像、リベンジポルノ系コンテンツ。",
        fr: "Ressemblances non consenties : face-swap de personnes réelles sans consentement écrit, images intimes, type revenge porn.",
        de: "Nicht einwilligte Abbilder: Face-Swap realer Personen ohne schriftliche Einwilligung, Intimbilder, Revenge-Porn-Inhalte.",
      },
      {
        en: "Impersonation, fraud, deceptive political content or election interference, including deepfakes of public figures.",
        zh: "冒充他人、欺诈、误导性政治内容或干预选举，包括公众人物深度伪造。",
        ja: "なりすまし、詐欺、誤導的な政治コンテンツや選挙干渉（公人のディープフェイク含む）。",
        fr: "Usurpation, fraude, contenu politique trompeur ou ingérence électorale, y compris deepfakes de personnalités.",
        de: "Identitätsdiebstahl, Betrug, täuschende politische Inhalte oder Wahlbeeinflussung, inkl. Deepfakes öffentlicher Personen.",
      },
      {
        en: "Gratuitous violence, gore, weapons synthesis instructions, illegal acts, hate speech or harassment of individuals or groups.",
        zh: "无端暴力、血腥、武器合成指引、违法行为、仇恨言论或骚扰个人与群体。",
        ja: "無差別な暴力・ gore・武器作成手順・違法行為・ヘイトスピーチ・個人/集団への嫌がらせ。",
        fr: "Violence gratuite, gore, instructions de synthèse d'armes, actes illégaux, discours haineux ou harcèlement.",
        de: "Grundlose Gewalt, Gore, Waffen-Syntheseanleitungen, illegale Handlungen, Hassrede oder Belästigung.",
      },
      {
        en: "Removing, obscuring or bypassing the visible AI-generated label on outputs, or representing outputs as authentic recordings.",
        zh: "移除、遮挡或绕过成片上可见的 AI 生成标识，或将生成物冒充真实录制。",
        ja: "出力の可視 AI ラベルの除去・隠蔽・回避、または出力を実録として偽る行為。",
        fr: "Supprimer, masquer ou contourner le label IA visible, ou faire passer un rendu pour un enregistrement authentique.",
        de: "Entfernen/Umgehen des sichtbaren KI-Labels oder Ausgabe als echte Aufnahme darstellen.",
      },
    ],
  },
  {
    id: "nsfw-filtering",
    title: {
      en: "NSFW prohibition & automated filtering",
      zh: "NSFW 禁令与自动过滤",
      ja: "NSFW 禁止と自動フィルタ",
      fr: "Interdiction NSFW et filtrage automatisé",
      de: "NSFW-Verbot & automatische Filterung",
    },
    bullets: [
      {
        en: "Every user-supplied input that reaches a generation model is screened BEFORE generation by Creem's Moderation API; `deny` and `flag` decisions block the request.",
        zh: "所有进入生成模型的用户输入在生成前先经 Creem Moderation API 审查；`deny` 与 `flag` 均拦截请求。",
        ja: "生成モデルへ渡るユーザー入力はすべて生成前に Creem Moderation API で審査され、`deny`/`flag` はリクエストを遮断します。",
        fr: "Chaque entrée utilisateur destinée à un modèle est criblée AVANT génération par l'API de modération Creem ; `deny` et `flag` bloquent la requête.",
        de: "Jede Nutzereingabe, die ein Generierungsmodell erreicht, wird VOR der Erzeugung über die Creem-Moderations-API geprüft; `deny` und `flag` blockieren.",
      },
      {
        en: "If the moderation service is unreachable, generation fails closed (request rejected) — it never falls back to generating un-screened input.",
        zh: "审查服务不可用时生成fail closed（直接拒绝请求）——绝不会回退为未审查生成。",
        ja: "moderation 到達不能時は生成を fail closed（拒否）し、未審査入力の生成へフォールバックしません。",
        fr: "Si la modération est injoignable, la génération échoue en mode fermé (requête rejetée) — jamais de génération non criblée.",
        de: "Ist die Moderation nicht erreichbar, schlägt die Erzeugung fail-closed fehl (abgelehnt) — kein ungescreentes Erzeugen.",
      },
      {
        en: "Deployments without a moderation API key enforce a local prohibited-content blocklist as a fallback layer; video-workflow jobs additionally require a portrait-rights attestation and apply a visible AI label to every render.",
        zh: "未配置审查 API key 的部署以本地违禁词表作为兜底层；视频工作流任务另强制肖像权声明并对每条成片加可见 AI 标识。",
        ja: "モデレーション API キー未設定の環境はローカル禁止リストをフォールバックとし、ビデオワークフロージョブは肖像権確認と全出力への可視 AI ラベルを強制します。",
        fr: "Sans clé d'API de modération, une liste locale de contenus interdits sert de filet ; les tâches de flux vidéo exigent en plus l'attestation de droits à l'image et apposent un label IA visible.",
        de: "Ohne Moderations-API-Key greift eine lokale Sperrliste als Fallback; Video-Workflow-Jobs verlangen zusätzlich die Bildrechte-Bestätigung und setzen ein sichtbares KI-Label."
      },
      {
        en: "Sexual content involving minors is never filterable, never appealable: accounts are terminated and preserved for referral.",
        zh: "涉未成年性内容不可过滤豁免、不可申诉：账号终止并留证移交。",
        ja: "未成年に関わる性的コンテンツは免除も不服申立も不可：アカウント停止の上、証拠を保全し通報します。",
        fr: "Le contenu sexuel impliquant des mineurs n'est jamais filtrable ni contestable : comptes résiliés et preuves conservées pour signalement.",
        de: "Sexuelle Inhalte mit Minderjährigen sind nie ausnahme- oder berufungsfähig: Konten werden gesperrt und für Meldungen gesichert.",
      },
    ],
  },
  {
    id: "integration",
    title: {
      en: "Where screening happens (integration map)",
      zh: "审查接入点（集成地图）",
      ja: "スクリーニング実装箇所（統合マップ）",
      fr: "Où le criblage s'applique (carte d'intégration)",
      de: "Wo gescreent wird (Integrationskarte)",
    },
    bullets: [
      {
        en: "POST /api/ai — the chat message is screened before any model call; blocks return 400 prompt_rejected / prompt_flagged, screener outages return 503 moderation_unavailable (nothing generates).",
        zh: "POST /api/ai——聊天消息在任何模型调用前受审；拦截返回 400 prompt_rejected / prompt_flagged，审查服务不可用返回 503 moderation_unavailable（不会生成）。",
        ja: "POST /api/ai — チャットメッセージはモデル呼び出し前に審査。遮断は 400 prompt_rejected / prompt_flagged、審査不能は 503 moderation_unavailable（生成なし）。",
        fr: "POST /api/ai — le message est criblé avant tout appel au modèle ; blocages en 400 prompt_rejected / prompt_flagged, modération injoignable en 503 moderation_unavailable (rien n'est généré).",
        de: "POST /api/ai — die Chat-Nachricht wird vor jedem Modellaufruf gescreent; Blocks liefern 400 prompt_rejected / prompt_flagged, Ausfall 503 moderation_unavailable (nichts wird erzeugt).",
      },
      {
        en: "POST /api/rag/query — the question is screened before retrieval-augmented generation runs.",
        zh: "POST /api/rag/query——问题在检索增强生成运行前受审。",
        ja: "POST /api/rag/query — 質問は検索拡張生成の実行前に審査されます。",
        fr: "POST /api/rag/query — la question est criblée avant la génération augmentée.",
        de: "POST /api/rag/query — die Frage wird vor der Retrieval-Generierung gescreent.",
      },
      {
        en: "POST /api/video/jobs — the AI video-workflow feature (delivered to customers as a source module; this store operates no public generation entry point) accepts no free-text prompt; the only user-controlled string entering the pipeline (the hosted input URL) is screened before credits, queueing or the provider call. Extra layers: portrait-rights attestation, provider-side safety filters, visible AI label on every render.",
        zh: "POST /api/video/jobs——AI 视频工作流功能（作为源码模块交付给客户；本站不运营任何公开的生成入口）不接受自由文本 prompt；进入管线的唯一用户可控字符串（托管输入 URL）在扣额度、入队、调用供应商之前受审。附加层：肖像权声明、供应商侧安全过滤、每条成片的可见 AI 标识。",
        ja: "POST /api/video/jobs — AI ビデオワークフロー機能（顧客にはソースモジュールとして納品；本ストアは公開生成窓口を運営しない）に自由文本プロンプトはなく、パイプラインに入る唯一のユーザー制御文字列（ホスト入力 URL）をクレジット・キュー・プロバイダ呼び出しの前に審査。追加層：肖像権確認、プロバイダ側安全フィルタ、全出力の可視 AI ラベル。",
        fr: "POST /api/video/jobs — la fonction de flux vidéo IA (livrée aux clients comme module source ; cette boutique n'exploite aucun point d'entrée public de génération) n'accepte aucun prompt libre ; la seule chaîne contrôlée par l'utilisateur entrant dans le pipeline (l'URL d'entrée hébergée) est criblée avant crédits, file et appel prestataire. Couches supplémentaires : attestation de droits à l'image, filtres du prestataire, label IA visible.",
        de: "POST /api/video/jobs — die KI-Video-Workflow-Funktion (an Kunden als Quellmodul geliefert; dieser Shop betreibt keinen öffentlichen Generierungs-Einstieg) nimmt keinen Freitext-Prompt an; der einzige nutzerkontrollierte String in der Pipeline (die gehostete Eingabe-URL) wird vor Credits, Queue und Provider-Aufruf gescreent. Zusätzliche Ebenen: Bildrechte-Bestätigung, Provider-Safety-Filter, sichtbares KI-Label."
      },
      {
        en: "Screening runs on every deployment: via the Creem Moderation API when a Creem key is configured, otherwise via the local prohibited-content blocklist described above. There is no code path from user input to a generation model without a preceding screen.",
        zh: "所有部署都执行审查：配置 Creem key 时走 Creem Moderation API，否则走上述本地违禁词表。从用户输入到生成模型不存在任何绕过审查的代码路径。",
        ja: "全デプロイで審査を実行：Creem キー設定時は Creem Moderation API、それ以外は上記ローカル禁止リスト。ユーザー入力から生成モデルへ審査を bypass する経路は存在しません。",
        fr: "Le criblage s'exécute sur chaque déploiement : API de modération Creem si une clé est configurée, sinon liste locale ci-dessus. Aucun chemin de code ne relie une entrée utilisateur à un modèle sans criblage préalable.",
        de: "Screening läuft auf jedem Deployment: Creem-Moderations-API bei konfiguriertem Key, sonst lokale Sperrliste oben. Kein Codepfad führt von Nutzereingabe zu einem Modell ohne vorheriges Screening.",
      },
    ],
  },
  {
    id: "enforcement",
    title: {
      en: "Enforcement, appeals & reporting",
      zh: "执行、申诉与举报",
      ja: "執行・異議・通報",
      fr: "Application, appels et signalement",
      de: "Durchsetzung, Widerspruch & Meldung",
    },
    bullets: [
      {
        en: "Blocked requests return a policy error and consume no credits; repeated violations suspend or terminate the account without refund.",
        zh: "被拦截请求返回策略错误且不消耗额度；屡次违规将停用或终止账号且不予退款。",
        ja: "遮断されたリクエストはポリシーエラーを返しクレジットを消費しません。繰り返しの違反は返金なく停止/終了となります。",
        fr: "Une requête bloquée renvoie une erreur de politique sans consommer de crédits ; les récidives suspendent ou résilient sans remboursement.",
        de: "Blockierte Anfragen geben einen Policy-Fehler zurück und verbrauchen keine Credits; Wiederholungen sperren ohne Erstattung.",
      },
      {
        en: "Report abuse or submit a takedown (including non-consensual likeness) via /support; infringing outputs are removed within 24 hours of a validated notice.",
        zh: "通过 /support 举报滥用或提交下架请求（含未经同意肖像）；经核实的通知后 24 小时内移除侵权成片。",
        ja: "悪用の通報・削除依頼（同意なき肖像含む）は /support へ。検証済み通知後 24 時間以内に侵害出力を削除します。",
        fr: "Signalez un abus ou demandez un retrait (dont ressemblance non consentie) via /support ; retrait sous 24 h après notice validée.",
        de: "Missbrauch oder Takedown (inkl. nicht einwilligter Abbilder) über /support melden; Entfernung binnen 24 h nach validierter Meldung.",
      },
      {
        en: "Appeals: reply to the rejection notice with context; false positives are reversed and any reserved credits are restored.",
        zh: "申诉：对拒绝通知回复说明；误判将撤销并恢复已预留额度。",
        ja: "異議：拒否通知へ状況を追記して返信。誤検知は取り消し、予約済みクレジットを復元します。",
        fr: "Appels : répondez à l'avis de rejet avec le contexte ; les faux positifs sont annulés et les crédits réservés rendus.",
        de: "Widerspruch: auf die Ablehnung mit Kontext antworten; Fehlalarme werden aufgehoben und reservierte Credits erstattet.",
      },
    ],
  },
];
