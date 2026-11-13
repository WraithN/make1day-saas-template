// Localized comparison content (make1day.dev vs popular Next.js SaaS starters).
// Captures "ShipFast alternative", "Makerkit alternative", "Supastarter
// alternative" and "Best Next.js SaaS boilerplate 2026" search intent.
// Prices are one-time list prices checked against vendor sites / directories
// in 2026; launch discounts move often, so the copy says "about".

export type CompareRow = {
  feature: string;
  shipkit: string;
  shipfast: string;
  makerkit: string;
  supastarter: string;
};

export const compareContent: Record<
  string,
  {
    eyebrow: string;
    heading: string;
    subtitle: string;
    cols: { shipkit: string; shipfast: string; makerkit: string; supastarter: string };
    rows: CompareRow[];
    verdict: string;
  }
> = {
  en: {
    eyebrow: "COMPARE",
    heading: "make1day.dev vs the other Next.js SaaS starters",
    subtitle:
      "An honest, source-level comparison. Prices and feature sets shift — verify on each vendor's site before buying. See /blog and docs/competitive-analysis.md for the full 2026 review.",
    cols: {
      shipkit: "make1day.dev",
      shipfast: "ShipFast",
      makerkit: "Makerkit",
      supastarter: "Supastarter",
    },
    rows: [
      { feature: "One-time price", shipkit: "$249 one-time", shipfast: "~$199–249", makerkit: "$299–599", supastarter: "$299–1,499" },
      { feature: "Payment compliance", shipkit: "per-gateway machine-readable contract + npm run compliance:check", shipfast: "—", makerkit: "—", supastarter: "—" },
      { feature: "Durable AI pipelines", shipkit: "Inngest steps + admin canvas", shipfast: "—", makerkit: "—", supastarter: "—" },
      { feature: "Ongoing plan", shipkit: "12 mo free updates + optional $9/mo Care", shipfast: "None (lifetime updates)", makerkit: "Tiered licenses", supastarter: "All-access upgrade" },
      { feature: "Framework", shipkit: "Next.js 15 App Router", shipfast: "Next.js", makerkit: "Next.js (monorepo)", supastarter: "Next.js / Nuxt" },
      { feature: "Auth", shipkit: "Email + OAuth (Google/GitHub/Apple/Microsoft)", shipfast: "Google + magic link", makerkit: "Deep RBAC", supastarter: "Multiple providers" },
      { feature: "Payments", shipkit: "Creem (default), Stripe, PayPal, Waffo", shipfast: "Stripe", makerkit: "Stripe", supastarter: "Stripe + others" },
      { feature: "Multi-tenancy", shipkit: "Optional helper", shipfast: "No", makerkit: "Yes (deepest)", supastarter: "Yes" },
      { feature: "AI feature", shipkit: "Chat + working hybrid RAG", shipfast: "Minimal", makerkit: "Partial", supastarter: "Yes" },
      { feature: "Custom 1:1 work", shipkit: "30-min call, fixed quote", shipfast: "No", makerkit: "No", supastarter: "No" },
      { feature: "Ownership", shipkit: "Full source (rebrand before launch)", shipfast: "Full source", makerkit: "Full source", supastarter: "Full source" },
      { feature: "Updates after launch", shipkit: "Care subscription (drift-proof)", shipfast: "Community", makerkit: "Tiers", supastarter: "Tiers" },
      { feature: "Configurable generator (real pruning)", shipkit: "Yes — unselected modules are removed", shipfast: "No", makerkit: "No", supastarter: "No" },
      { feature: "AGENTS.md + design.md for AI coding", shipkit: "Root AGENTS.md + style-locked design.md", shipfast: "No", makerkit: "AGENTS.md + Cursor rules", supastarter: "AGENTS.md + .cursorrules" },
      { feature: "Scoped rules + skills in every ZIP", shipkit: "ai/rules/* + .cursor/rules/* + CLAUDE.md + 13 skills", shipfast: "No", makerkit: "Cursor rules only", supastarter: ".cursorrules only" },
      { feature: "Config change → AI docs rebuild", shipkit: "npm run ai:docs, one shared renderer", shipfast: "No", makerkit: "No", supastarter: "No" },
      { feature: "MCP tool for agent scaffolding", shipkit: "scaffold_project + llms.txt / OpenAPI / MCP", shipfast: "No", makerkit: "No", supastarter: "No" },
      { feature: "llms.txt / agent-readable SEO", shipkit: "Yes, plus JSON-LD", shipfast: "No", makerkit: "Not emphasised", supastarter: "Not emphasised" },
      { feature: "Working hybrid RAG (BM25 + vectors + RRF)", shipkit: "Built in, no key required to try", shipfast: "No", makerkit: "Premium template", supastarter: "No" },
      { feature: "Built-in i18n", shipkit: "EN / ZH / JA / FR", shipfast: "No", makerkit: "Yes", supastarter: "Yes" },
      { feature: "Merchant-of-Record checkout", shipkit: "Waffo Pancake (no company needed)", shipfast: "No", makerkit: "No", supastarter: "No" },
      { feature: "Machine-readable API contract", shipkit: "llms.txt + llms-full.txt + OpenAPI 3.1", shipfast: "No", makerkit: "Not emphasised", supastarter: "Not emphasised" },
      { feature: "Generated-project build matrix", shipkit: "18 CI cases, all 6 gateways / 11 styles, tsc on every ZIP", shipfast: "No", makerkit: "No", supastarter: "No" },
      { feature: "User console + admin console", shipkit: "Both included, five-language, selectable and fully pruned when unchecked", shipfast: "Account page only", makerkit: "Admin + RBAC", supastarter: "Admin basics" },
    ],
    verdict:
      "Pick make1day.dev if you build with an AI coding agent: it is the only starter here that generates AGENTS.md AND a style-specific design.md, prunes modules you did not select, ships working hybrid RAG, five-language i18n and agent-readable llms.txt — for a $249 one-time buyout that includes 12 months of updates. Choose ShipFast for the biggest community, Makerkit for deep B2B multi-tenancy, Supastarter for maximum breadth, or VibeReady ($149–399) if enforced commit-time quality gates and Terraform matter more than i18n and a visual generator. make1day.dev also ships scoped rules, 13 skills, `npm run ai:docs` for deterministic regeneration, an MCP `scaffold_project` tool, an OpenAPI 3.1 contract and a public 19-case build matrix, plus selectable /account and /admin consoles in every generated project, so an agent can both assemble a project and verify that its ZIP type-checks instead of trusting a README.",
  },
  zh: {
    eyebrow: "对比",
    heading: "make1day.dev 对比其他 Next.js SaaS 启动模板",
    subtitle: "基于源码的诚实对比。价格与功能会变动——购买前请以各官网为准；完整 2026 年调研见竞品分析文档。",
    cols: {
      shipkit: "make1day.dev",
      shipfast: "ShipFast",
      makerkit: "Makerkit",
      supastarter: "Supastarter",
    },
    rows: [
      { feature: "一次性价格", shipkit: "$249 一次性", shipfast: "约 $199–249", makerkit: "$299–599", supastarter: "$299–1,499" },
      { feature: "支付合规", shipkit: "各网关机器可读契约 + npm run compliance:check", shipfast: "—", makerkit: "—", supastarter: "—" },
      { feature: "耐用 AI 管线", shipkit: "Inngest 步骤 + 管理画布", shipfast: "—", makerkit: "—", supastarter: "—" },
      { feature: "持续服务", shipkit: "12 个月免费更新 + 可选 $9/月 Care", shipfast: "无（终身更新）", makerkit: "分级授权", supastarter: "全通升级" },
      { feature: "框架", shipkit: "Next.js 15 App Router", shipfast: "Next.js", makerkit: "Next.js（monorepo）", supastarter: "Next.js / Nuxt" },
      { feature: "登录", shipkit: "邮箱 + OAuth（Google/GitHub/Apple/Microsoft）", shipfast: "Google + magic link", makerkit: "深度 RBAC", supastarter: "多供应商" },
      { feature: "支付", shipkit: "Creem（默认）、Stripe、PayPal、Waffo", shipfast: "Stripe", makerkit: "Stripe", supastarter: "Stripe + 其他" },
      { feature: "多租户", shipkit: "可选辅助", shipfast: "否", makerkit: "是（最深入）", supastarter: "是" },
      { feature: "AI 功能", shipkit: "对话 + 可运行混合检索 RAG", shipfast: "极简", makerkit: "部分", supastarter: "是" },
      { feature: "定制 1V1", shipkit: "30 分钟沟通，固定报价", shipfast: "否", makerkit: "否", supastarter: "否" },
      { feature: "归属", shipkit: "完整源码（上线前需改品牌）", shipfast: "完整源码", makerkit: "完整源码", supastarter: "完整源码" },
      { feature: "上线后更新", shipkit: "Care 订阅（抗漂移）", shipfast: "社区", makerkit: "分级", supastarter: "分级" },
      { feature: "可配置生成器（真实剪枝）", shipkit: "是——未选模块从 ZIP 中移除", shipfast: "否", makerkit: "否", supastarter: "否" },
      { feature: "面向 AI coding 的 AGENTS.md + design.md", shipkit: "根 AGENTS.md + 锁定风格 design.md", shipfast: "否", makerkit: "AGENTS.md + Cursor rules", supastarter: "AGENTS.md + .cursorrules" },
      { feature: "每个 ZIP 的 scoped rules 与 skills", shipkit: "ai/rules/* + .cursor/rules/* + CLAUDE.md + 13 skills", shipfast: "否", makerkit: "仅 Cursor rules", supastarter: "仅 .cursorrules" },
      { feature: "改配置 → AI 文档重建", shipkit: "npm run ai:docs，单一渲染器", shipfast: "否", makerkit: "否", supastarter: "否" },
      { feature: "供智能体搭建工程的 MCP 工具", shipkit: "scaffold_project + llms.txt / OpenAPI / MCP", shipfast: "否", makerkit: "否", supastarter: "否" },
      { feature: "llms.txt / 面向智能体的 SEO", shipkit: "有，并含 JSON-LD", shipfast: "否", makerkit: "未强调", supastarter: "未强调" },
      { feature: "可运行的混合检索 RAG（BM25 + 向量 + RRF）", shipkit: "内置，无需密钥即可体验", shipfast: "否", makerkit: "付费模板", supastarter: "否" },
      { feature: "内置多语言", shipkit: "中 / 英 / 日 / 法", shipfast: "否", makerkit: "是", supastarter: "是" },
      { feature: "MoR 收款（无需公司实体）", shipkit: "Waffo Pancake", shipfast: "否", makerkit: "否", supastarter: "否" },
      { feature: "机器可读 API 契约", shipkit: "llms.txt + llms-full.txt + OpenAPI 3.1", shipfast: "否", makerkit: "未强调", supastarter: "未强调" },
      { feature: "生成产物构建矩阵", shipkit: "18 组 CI：6 支付商 / 11 风格全覆盖，每个 ZIP 跑 tsc", shipfast: "否", makerkit: "否", supastarter: "否" },
      { feature: "用户后台 + 管理员后台", shipkit: "两套五语后台，可勾选、未选即真剪枝", shipfast: "仅账户页", makerkit: "管理端 + RBAC", supastarter: "基础管理端" },
    ],
    verdict:
      "如果你用 AI coding agent 写代码：make1day.dev 是这批产品里唯一同时生成 AGENTS.md 与「随风格变化的 design.md」、按选项真实剪枝、内置可运行混合检索 RAG、五语 i18n 和面向智能体的 llms.txt 的启动包，$249 一次性买断并含 12 个月更新。要最大社区选 ShipFast，深度 B2B 多租户选 Makerkit，功能广度选 Supastarter；若更看重提交时质量门禁与 Terraform 且不需要 i18n，可看 VibeReady（$149–399）。此外 make1day.dev 还附带 scoped rules、13 份 skills、`npm run ai:docs` 确定性重建、MCP `scaffold_project` 工具、OpenAPI 3.1 契约与 19 组构建矩阵，并且每个生成工程都带可勾选的 /account 用户后台与 /admin 管理员后台——agent 既能自己组装工程，也能验证生成的 ZIP 能否通过类型检查，而不必只信 README。",
  },
};
