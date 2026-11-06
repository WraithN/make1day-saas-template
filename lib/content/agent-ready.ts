// Five-language copy for /agent-ready. This page explains how AI agents and
// answer engines discover what ShipKit actually is — and how the downloaded
// project keeps an AI coding agent on the rails afterwards.

import type { Lang } from "@/lib/i18n-core";

export type AgentReadyCopy = {
  eyebrow: string;
  title: string;
  lede: string;
  stackTitle: string;
  stackSub: string;
  stack: { name: string; path: string; audience: string; desc: string }[];
  stepsTitle: string;
  steps: string[];
  codeTitle: string;
  codeHint: string;
  deliveryTitle: string;
  deliverySub: string;
  delivery: { file: string; desc: string }[];
  limitsTitle: string;
  limits: string[];
  ctaTitle: string;
  ctaText: string;
  ctaPrimary: string;
  ctaSecondary: string;
};

const EN: AgentReadyCopy = {
  eyebrow: "AGENT-NATIVE DELIVERY · GEO",
  title: "Readable by agents. Usable by coding agents.",
  lede: "Most starters are only readable by humans. ShipKit publishes machine-readable facts for answer engines, an MCP tool for agents that want to act, and a generated project that ships with its own AI coding contract.",
  stackTitle: "The discovery stack",
  stackSub: "Four layers, each answering a different question.",
  stack: [
    { name: "Short facts", path: "/llms.txt", audience: "Answer engines", desc: "What ShipKit is, what it costs, which pages and docs matter. The 30-second read." },
    { name: "Full facts", path: "/llms-full.txt", audience: "Selection agents", desc: "Every BuilderConfig enum, pruning rule, RAG parameter, payment protocol, license-gate order and known limitation." },
    { name: "Executable contract", path: "/openapi.json", audience: "Tool-using agents", desc: "OpenAPI 3.1 with request/response schemas, error codes and the 402 license-required response of /api/generate." },
    { name: "MCP endpoint", path: "/api/mcp", audience: "Coding agents", desc: "JSON-RPC 2.0 tools: get_product_info, get_builder_config, scaffold_project and get_agent_delivery. A stdio bridge ships for Cursor and Claude Code." },
  ],
  stepsTitle: "How an agent should read this site",
  steps: [
    "GET /llms.txt — decide whether this is worth reading at all.",
    "GET /llms-full.txt — get the exact options, prices and honest limitations.",
    "GET /openapi.json — learn the HTTP contract and the 402 gate.",
    "Call /api/mcp → scaffold_project — assemble a validated BuilderConfig.",
    "POST /api/generate, unzip, then read AGENTS.md + design.md before writing a line of code.",
  ],
  codeTitle: "One call to assemble a project",
  codeHint: "scaffold_project returns the exact POST body for /api/generate. Setting includeZip=true returns the ZIP as base64, behind the same license gate.",
  deliveryTitle: "What lands inside every ZIP",
  deliverySub: "The contract travels with the code. Change the config → npm run ai:docs → everything rebuilds.",
  delivery: [
    { file: "AGENTS.md", desc: "Root contract: selections, commands, boundaries, scoped-rule index, definition of done." },
    { file: "design.md", desc: "Style-locked visual system generated for the chosen palette." },
    { file: "ai/rules/*.md", desc: "Scoped rules with globs — core, style, api, auth, payments, database, rag, i18n, deploy, plus one per skill." },
    { file: ".cursor/rules/*.mdc + CLAUDE.md", desc: "Native Cursor rules and a Claude Code entry point that import the contract." },
    { file: "skills/*.md", desc: "12 focused playbooks (frontend, UI, backend, testing, SEO, auth, payments, database, RAG, i18n, deploy, agent workflow)." },
    { file: "npm run ai:docs / ai:setup", desc: "Deterministic regeneration from shipkit.config.json + the full catalogue in ai/doc-spec.json — no second copy to drift." },
  ],
  limitsTitle: "Honest boundaries",
  limits: [
    "The MCP endpoint is stateless JSON-RPC over HTTP — no sampling, prompts, subscriptions or SSE streaming.",
    "scaffold_project defaults to configuration JSON; includeZip=true is gated by the same license check as the website.",
    "The build matrix type-checks 14 generated ZIPs with tsc, not next build, and publishes no live pass-rate page.",
    "The multitenancy Builder flag still ships no org/RBAC tables; AI chat is not streamed and has no quota.",
    "Generated projects retain ShipKit branding and ship no LICENSE file yet.",
    "npm run ai:docs regenerates documents, not app/globals.css — changing the style needs a fresh ZIP from the Builder.",
  ],
  ctaTitle: "Start with a real download",
  ctaText: "Pick your modules, generate a ZIP, and see the agent contract that comes with it.",
  ctaPrimary: "Open the Builder",
  ctaSecondary: "Read the full facts",
};

const ZH: AgentReadyCopy = {
  eyebrow: "AGENT 原生交付 · GEO",
  title: "既能被 agent 读懂，也能被 coding agent 直接用",
  lede: "大多数脚手架只写给人类看。ShipKit 为答案引擎提供机器可读事实，为想直接动手的 agent 提供 MCP 工具，并让下载的工程自带一份 AI 编码契约。",
  stackTitle: "四层发现入口",
  stackSub: "每一层回答一个不同的问题。",
  stack: [
    { name: "短版事实", path: "/llms.txt", audience: "答案引擎", desc: "ShipKit 是什么、卖多少钱、哪些页面和文档值得读。30 秒读完。" },
    { name: "完整事实", path: "/llms-full.txt", audience: "选型 agent", desc: "完整的 BuilderConfig 枚举、剪枝规则、RAG 参数、支付协议、授权门槛顺序与已知限制。" },
    { name: "可执行契约", path: "/openapi.json", audience: "工具型 agent", desc: "OpenAPI 3.1，含请求/响应 schema、错误码，以及 /api/generate 的 402 授权响应。" },
    { name: "MCP 端点", path: "/api/mcp", audience: "编码 agent", desc: "JSON-RPC 2.0 工具：get_product_info、get_builder_config、scaffold_project、get_agent_delivery；附带 Cursor / Claude Code 的 stdio 桥接脚本。" },
  ],
  stepsTitle: "建议的 agent 抓取顺序",
  steps: [
    "GET /llms.txt —— 先判断值不值得继续读。",
    "GET /llms-full.txt —— 拿到准确的选项、价格和诚实的限制。",
    "GET /openapi.json —— 了解 HTTP 契约与 402 授权门槛。",
    "调用 /api/mcp 的 scaffold_project —— 组装一份经过校验的 BuilderConfig。",
    "POST /api/generate 下载解压，写代码前先读 AGENTS.md 与 design.md。",
  ],
  codeTitle: "一次调用即可组装工程",
  codeHint: "scaffold_project 返回可直接用于 /api/generate 的 POST body；设 includeZip=true 会以 base64 返回 ZIP，并经过与网站相同的授权校验。",
  deliveryTitle: "每个 ZIP 里都带着什么",
  deliverySub: "契约随代码一起交付。改配置 → npm run ai:docs → 所有文档重新生成。",
  delivery: [
    { file: "AGENTS.md", desc: "根契约：本构建的选项、命令、边界、scoped rules 索引与完成定义。" },
    { file: "design.md", desc: "按所选风格生成的、锁定视觉系统的设计说明。" },
    { file: "ai/rules/*.md", desc: "带 globs 的 scoped rules：core、style、api、auth、payments、database、rag、i18n、deploy，外加每个 skill 一条。" },
    { file: ".cursor/rules/*.mdc + CLAUDE.md", desc: "Cursor 原生规则，以及导入根契约的 Claude Code 入口文件。" },
    { file: "skills/*.md", desc: "12 份聚焦 playbook：前端、UI、后端、测试、SEO、鉴权、支付、数据库、RAG、i18n、部署、agent 工作流。" },
    { file: "npm run ai:docs / ai:setup", desc: "以 shipkit.config.json 为主源、ai/doc-spec.json 提供完整目录，确定性重建，不存在第二份会漂移的副本。" },
  ],
  limitsTitle: "诚实边界",
  limits: [
    "MCP 端点是 HTTP 上的无状态 JSON-RPC，没有 sampling、prompts、订阅或 SSE 流式。",
    "scaffold_project 默认只返回配置 JSON；includeZip=true 与网站走同一个授权校验。",
    "构建矩阵用 tsc 校验 14 个生成 ZIP，尚未跑 next build，站点也没有实时通过率页。",
    "多租户勾选项仍不带 org/RBAC 表；AI chat 非流式且无配额。",
    "生成工程仍保留 ShipKit 品牌，且暂未附带 LICENSE 文件。",
    "npm run ai:docs 只重建文档、不重写 app/globals.css；真正换配色需要回 Builder 重新生成 ZIP。",
  ],
  ctaTitle: "从一次真实下载开始",
  ctaText: "选好模块、生成 ZIP，看看随包附带的 agent 契约。",
  ctaPrimary: "打开 Builder",
  ctaSecondary: "查看完整事实表",
};

const JA: AgentReadyCopy = {
  eyebrow: "AGENT ネイティブ配信 · GEO",
  title: "エージェントが読め、コーディングエージェントが使える。",
  lede: "多くのスターターは人間しか読めません。ShipKit は回答エンジン向けの機械可読な事実、実際に操作したいエージェント向けの MCP ツール、そして AI コーディング契約を同梱した生成プロジェクトを提供します。",
  stackTitle: "4 層のディスカバリースタック",
  stackSub: "それぞれ異なる問いに答えます。",
  stack: [
    { name: "短い事実", path: "/llms.txt", audience: "回答エンジン", desc: "ShipKit の概要、価格、重要なページとドキュメント。30 秒で読めます。" },
    { name: "完全な事実", path: "/llms-full.txt", audience: "選定エージェント", desc: "BuilderConfig の全列挙、prune 規則、RAG パラメータ、決済プロトコル、ライセンスゲートの順序、既知の制限。" },
    { name: "実行可能な契約", path: "/openapi.json", audience: "ツール利用エージェント", desc: "OpenAPI 3.1。リクエスト/レスポンス schema、エラーコード、/api/generate の 402 応答を含みます。" },
    { name: "MCP エンドポイント", path: "/api/mcp", audience: "コーディングエージェント", desc: "JSON-RPC 2.0 ツール：get_product_info / get_builder_config / scaffold_project / get_agent_delivery。Cursor・Claude Code 用 stdio ブリッジ付き。" },
  ],
  stepsTitle: "推奨される読み順",
  steps: [
    "GET /llms.txt —— 読む価値があるか判断する。",
    "GET /llms-full.txt —— 正確な選択肢・価格・制限を得る。",
    "GET /openapi.json —— HTTP 契約と 402 ゲートを理解する。",
    "/api/mcp の scaffold_project —— 検証済み BuilderConfig を組み立てる。",
    "POST /api/generate → 解凍 → コードを書く前に AGENTS.md と design.md を読む。",
  ],
  codeTitle: "1 回の呼び出しでプロジェクトを組み立てる",
  codeHint: "scaffold_project は /api/generate にそのまま渡せる POST body を返します。includeZip=true は base64 の ZIP を返し、サイトと同じライセンスゲートが適用されます。",
  deliveryTitle: "すべての ZIP に同梱されるもの",
  deliverySub: "契約はコードと一緒に届きます。設定変更 → npm run ai:docs → 全ドキュメントを再生成。",
  delivery: [
    { file: "AGENTS.md", desc: "ルート契約：選択内容、コマンド、境界、scoped rules 一覧、完了定義。" },
    { file: "design.md", desc: "選択したスタイルにロックされたビジュアル仕様。" },
    { file: "ai/rules/*.md", desc: "globs 付き scoped rules：core / style / api / auth / payments / database / rag / i18n / deploy + 各 skill。" },
    { file: ".cursor/rules/*.mdc + CLAUDE.md", desc: "Cursor ネイティブ規則と、契約を import する Claude Code のエントリ。" },
    { file: "skills/*.md", desc: "12 の playbook：frontend / UI / backend / testing / SEO / auth / payments / database / RAG / i18n / deploy / agent workflow。" },
    { file: "npm run ai:docs / ai:setup", desc: "shipkit.config.json を主源とし ai/doc-spec.json の全カタログから決定的に再生成。二重管理による乖離がありません。" },
  ],
  limitsTitle: "正直な制限",
  limits: [
    "MCP エンドポイントは HTTP 上のステートレス JSON-RPC で、sampling / prompts / 購読 / SSE は未対応です。",
    "scaffold_project は既定で設定 JSON のみ。includeZip=true はサイトと同じライセンスチェックを受けます。",
    "ビルド行列は 14 個の ZIP を tsc で検証するのみで、next build とリアルタイム合格率ページは未実装です。",
    "multitenancy フラグは org/RBAC テーブルを生成しません。AI chat はストリーミング非対応・クォータなしです。",
    "生成プロジェクトには ShipKit のブランドが残り、LICENSE ファイルもまだありません。",
    "npm run ai:docs はドキュメントのみを再生成し app/globals.css は書き換えません。配色変更には Builder からの再生成が必要です。",
  ],
  ctaTitle: "実際のダウンロードから始める",
  ctaText: "モジュールを選んで ZIP を生成し、同梱の agent 契約を確認してください。",
  ctaPrimary: "Builder を開く",
  ctaSecondary: "完全な事実表",
};

const FR: AgentReadyCopy = {
  eyebrow: "LIVRAISON AGENT-NATIVE · GEO",
  title: "Lisible par les agents. Utilisable par les agents de code.",
  lede: "La plupart des starters ne s'adressent qu'aux humains. ShipKit publie des faits lisibles par machine pour les moteurs de réponse, un outil MCP pour les agents qui veulent agir, et un projet généré livré avec son propre contrat de codage IA.",
  stackTitle: "Les quatre couches de découverte",
  stackSub: "Chaque couche répond à une question différente.",
  stack: [
    { name: "Faits courts", path: "/llms.txt", audience: "Moteurs de réponse", desc: "Ce qu'est ShipKit, son prix, les pages et documents importants. Lecture en 30 secondes." },
    { name: "Faits complets", path: "/llms-full.txt", audience: "Agents de sélection", desc: "Toutes les valeurs de BuilderConfig, règles d'élagage, paramètres RAG, protocole de paiement, ordre du gate de licence et limites connues." },
    { name: "Contrat exécutable", path: "/openapi.json", audience: "Agents outillés", desc: "OpenAPI 3.1 avec schémas requête/réponse, codes d'erreur et la réponse 402 de /api/generate." },
    { name: "Endpoint MCP", path: "/api/mcp", audience: "Agents de code", desc: "Outils JSON-RPC 2.0 : get_product_info, get_builder_config, scaffold_project, get_agent_delivery. Un pont stdio est fourni pour Cursor et Claude Code." },
  ],
  stepsTitle: "Ordre de lecture recommandé",
  steps: [
    "GET /llms.txt — décider si la lecture vaut le détour.",
    "GET /llms-full.txt — obtenir les options, les prix et les limites réelles.",
    "GET /openapi.json — comprendre le contrat HTTP et le gate 402.",
    "Appeler /api/mcp → scaffold_project — assembler un BuilderConfig validé.",
    "POST /api/generate, dézipper, puis lire AGENTS.md et design.md avant d'écrire du code.",
  ],
  codeTitle: "Un appel pour assembler un projet",
  codeHint: "scaffold_project renvoie le corps POST exact pour /api/generate. Avec includeZip=true, le ZIP est renvoyé en base64, soumis au même contrôle de licence.",
  deliveryTitle: "Contenu de chaque ZIP",
  deliverySub: "Le contrat voyage avec le code. Config modifiée → npm run ai:docs → tout est régénéré.",
  delivery: [
    { file: "AGENTS.md", desc: "Contrat racine : sélections, commandes, frontières, index des règles, définition de « terminé »." },
    { file: "design.md", desc: "Système visuel verrouillé sur le style choisi." },
    { file: "ai/rules/*.md", desc: "Règles ciblées avec globs : core, style, api, auth, payments, database, rag, i18n, deploy + une par compétence." },
    { file: ".cursor/rules/*.mdc + CLAUDE.md", desc: "Règles natives Cursor et point d'entrée Claude Code important le contrat." },
    { file: "skills/*.md", desc: "12 playbooks ciblés : frontend, UI, backend, tests, SEO, auth, paiements, base de données, RAG, i18n, déploiement, workflow agent." },
    { file: "npm run ai:docs / ai:setup", desc: "Régénération déterministe depuis shipkit.config.json + le catalogue complet de ai/doc-spec.json — aucune seconde copie ne peut diverger." },
  ],
  limitsTitle: "Limites, en toute honnêteté",
  limits: [
    "L'endpoint MCP est un JSON-RPC sans état sur HTTP : pas de sampling, prompts, abonnements ni streaming SSE.",
    "scaffold_project renvoie du JSON par défaut ; includeZip=true passe le même contrôle de licence que le site.",
    "La matrice de build vérifie 14 ZIP avec tsc, pas next build, et aucun taux de réussite en direct n'est publié.",
    "L'option multitenancy ne génère aucune table org/RBAC ; le chat IA n'est pas streamé et n'a pas de quota.",
    "Les projets générés gardent la marque ShipKit et aucun fichier LICENSE n'est encore fourni.",
    "npm run ai:docs régénère les documents, pas app/globals.css — changer de style nécessite un nouveau ZIP depuis le Builder.",
  ],
  ctaTitle: "Commencez par un vrai téléchargement",
  ctaText: "Choisissez vos modules, générez un ZIP et découvrez le contrat agent livré avec.",
  ctaPrimary: "Ouvrir le Builder",
  ctaSecondary: "Voir les faits complets",
};

const DE: AgentReadyCopy = {
  eyebrow: "AGENT-NATIVE LIEFERUNG · GEO",
  title: "Von Agents lesbar. Von Coding-Agents nutzbar.",
  lede: "Die meisten Starter sind nur für Menschen lesbar. ShipKit veröffentlicht maschinenlesbare Fakten für Answer-Engines, ein MCP-Tool für Agents, die handeln wollen, und ein generiertes Projekt, das mit einem eigenen KI-Coding-Vertrag ausgeliefert wird.",
  stackTitle: "Der Discovery-Stack",
  stackSub: "Vier Ebenen, jede beantwortet eine andere Frage.",
  stack: [
    { name: "Kurze Fakten", path: "/llms.txt", audience: "Answer-Engines", desc: "Was ShipKit ist, was es kostet, welche Seiten und Docs zählen. Die 30-Sekunden-Lektüre." },
    { name: "Volle Fakten", path: "/llms-full.txt", audience: "Selektions-Agents", desc: "Jede BuilderConfig-Enum, Pruning-Regel, RAG-Parameter, Zahlungsprotokoll, Lizenz-Gate-Reihenfolge und bekannte Limitierungen." },
    { name: "Ausführbarer Vertrag", path: "/openapi.json", audience: "Werkzeug-Agents", desc: "OpenAPI 3.1 mit Request/Response-Schemas, Fehlercodes und der 402-Lizenz-Antwort von /api/generate." },
    { name: "MCP-Endpoint", path: "/api/mcp", audience: "Coding-Agents", desc: "JSON-RPC-2.0-Tools: get_product_info, get_builder_config, scaffold_project und get_agent_delivery. Eine stdio-Brücke für Cursor und Claude Code ist enthalten." },
  ],
  stepsTitle: "Wie ein Agent diese Seite lesen sollte",
  steps: [
    "GET /llms.txt — entscheiden, ob sich das weitere Lesen lohnt.",
    "GET /llms-full.txt — die exakten Optionen, Preise und ehrlichen Limitierungen abrufen.",
    "GET /openapi.json — den HTTP-Vertrag und das 402-Gate kennenlernen.",
    "Aufruf /api/mcp → scaffold_project — eine validierte BuilderConfig zusammenstellen.",
    "POST /api/generate, entpacken, dann AGENTS.md + design.md lesen, bevor eine Zeile Code geschrieben wird.",
  ],
  codeTitle: "Ein Aufruf, um ein Projekt zusammenzustellen",
  codeHint: "scaffold_project liefert den exakten POST-Body für /api/generate. Mit includeZip=true wird das ZIP als base64 zurückgegeben, hinter demselben Lizenz-Gate.",
  deliveryTitle: "Was in jedem ZIP landet",
  deliverySub: "Der Vertrag reist mit dem Code. Config ändern → npm run ai:docs → alles wird neu gebaut.",
  delivery: [
    { file: "AGENTS.md", desc: "Root-Vertrag: Auswahl, Befehle, Grenzen, Index der Scoped-Rules, Definition von fertig." },
    { file: "design.md", desc: "Stilfestes visuelles System, generiert für die gewählte Palette." },
    { file: "ai/rules/*.md", desc: "Scoped Rules mit Globs — core, style, api, auth, payments, database, rag, i18n, deploy, plus eine pro Skill." },
    { file: ".cursor/rules/*.mdc + CLAUDE.md", desc: "Native Cursor-Regeln und ein Claude-Code-Einstiegspunkt, die den Vertrag importieren." },
    { file: "skills/*.md", desc: "12 fokussierte Playbooks (frontend, UI, backend, testing, SEO, auth, payments, database, RAG, i18n, deploy, agent workflow)." },
    { file: "npm run ai:docs / ai:setup", desc: "Deterministische Regenerierung aus shipkit.config.json + dem vollständigen Katalog in ai/doc-spec.json — keine zweite Kopie, die abweichen kann." },
  ],
  limitsTitle: "Ehrliche Grenzen",
  limits: [
    "Der MCP-Endpoint ist zustandsloses JSON-RPC über HTTP — kein Sampling, keine Prompts, keine Subscriptions oder SSE-Streaming.",
    "scaffold_project liefert standardmäßig Konfigurations-JSON; includeZip=true wird vom selben Lizenz-Check wie die Website abgesichert.",
    "Die Build-Matrix prüft 14 generierte ZIPs mit tsc, nicht mit next build, und veröffentlicht keine Live-Erfolgsrate.",
    "Das Multi-Tenancy-Builder-Flag liefert weiterhin keine org/RBAC-Tabellen; der KI-Chat wird nicht gestreamt und hat kein Kontingent.",
    "Generierte Projekte behalten das ShipKit-Branding und liefern noch keine LICENSE-Datei mit.",
    "npm run ai:docs regeneriert Dokumente, nicht app/globals.css — für einen anderen Stil ist ein frisches ZIP aus dem Builder nötig.",
  ],
  ctaTitle: "Beginnen Sie mit einem echten Download",
  ctaText: "Wählen Sie Ihre Module, generieren Sie ein ZIP und sehen Sie den mitgelieferten Agent-Vertrag.",
  ctaPrimary: "Builder öffnen",
  ctaSecondary: "Vollständige Fakten lesen",
};

export const AGENT_READY: Record<Lang, AgentReadyCopy> = {
  en: EN,
  zh: ZH,
  ja: JA,
  fr: FR,
  de: DE,
};
