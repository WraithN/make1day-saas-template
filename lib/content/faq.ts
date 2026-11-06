// Localized FAQ content. Keyed by language; JA/FR/DE fall back to EN via the
// rendering layer. Questions are chosen to capture long-tail search intent
// ("how to build a SaaS with Next.js", "Next.js SaaS boilerplate with Stripe").

export type FaqItem = { q: string; a: string };

export const faqContent: Record<string, { heading: string; eyebrow: string; subtitle: string; items: FaqItem[] }> = {
  en: {
    eyebrow: "FAQ",
    heading: "Questions indie founders actually ask",
    subtitle:
      "Everything about using ShipKit to ship your AI SaaS — auth, checkout, AI, deployment and licensing.",
    items: [
      {
        q: "Does the starter include a user dashboard and an admin dashboard?",
        a: "Yes — two separate consoles. /account is the signed-in user area (profile, subscription, issued license keys, settings) and /admin is the operator area (users, licenses, traffic, runtime status). Both are five-language (EN/ZH/JA/FR/DE) and included in generated projects by default. In the Builder they are the `account` and `admin` features: unchecking one removes its entire route tree from the ZIP, and navigation plus post-login redirects are rewritten so no dead links remain. They are read-only starters: there is no profile editing endpoint and no org/RBAC table. Protect /admin before deploying: ADMIN_USER / ADMIN_PASSWORD create an operator account that signs in through /admin's own form, and a Supabase user with an admin/staff role (or an ADMIN_EMAILS allowlist entry) is accepted too.",
      },
      {
        q: "Do I need a license to download the generated project?",
        a: "The full source ZIP requires a license — a Buyout license ($99) or an active Care plan: the key is issued automatically after checkout, redeem it at /license, or sign in with the email you paid with to claim it automatically. Without a license you can still download a free preview: the complete file inventory of your build plus the design tokens (no source code). The gate protects ShipKit's site only; the project you download ships with it disabled.",
      },
      {
        q: "What is a Next.js SaaS boilerplate?",
        a: "It's a prebuilt, production-grade starting point for a SaaS: authentication, database, billing, an admin area and often a working AI feature — so you skip 4–8 weeks of commodity setup and build only what makes your product unique.",
      },
      {
        q: "How do I build a SaaS with Next.js?",
        a: "Clone a starter like ShipKit, set your env vars (Supabase, Waffo, an AI key), pick your stack in the Builder, download the scaffold and deploy to Vercel or Cloudflare. Most founders reach a launchable MVP in days, not months.",
      },
      {
        q: "Does ShipKit include subscription billing and Stripe support?",
        a: "Yes. The generated app ships with hosted checkout (Waffo Pancake by default) and webhook-synced plan status. You can switch the payment provider to Stripe, Creem or PayPal in the Builder — the checkout and webhook routes are provider-agnostic. Trial periods are configured in your payment provider's dashboard, not hardcoded in the scaffold.",
      },
      {
        q: "Does the starter include authentication?",
        a: "Yes — email magic-link plus OAuth (Google/GitHub/Apple/Microsoft) via Supabase, with row-level security on by default. You choose which providers to include in the Builder.",
      },
      {
        q: "Is there multi-tenancy?",
        a: "Not yet. The Builder shows a multi-tenancy toggle, but the generated project currently has no org/workspace tables and the flag does not change the output. Pick Makerkit or Supastarter if you need teams and RBAC on day one.",
      },
      {
        q: "Which AI providers are supported?",
        a: "OpenAI-compatible (OpenAI / OpenRouter / DeepSeek / Groq), Anthropic (Claude) and Google Gemini. The chat endpoint returns a single completion (not token streaming); per-user quotas are not implemented yet — add them before exposing AI to end users.",
      },
      {
        q: "What AI coding documents come inside the downloaded ZIP?",
        a: "A root AGENTS.md (repo contract and definition of done), a style-locked design.md, scoped rules in ai/rules/*.md, .cursor/rules/*.mdc for Cursor, CLAUDE.md for Claude Code, and up to 12 skills/*.md playbooks. After changing shipkit.config.json, run npm run ai:docs to rebuild all of them from one shared renderer; npm run ai:setup refreshes only the tool integrations. The site also exposes an MCP scaffold_project tool at /api/mcp — see /agent-ready.",
      },
      {
        q: "Can I reskin or white-label it?",
        a: "The source is yours to rename and restyle — 10 visual styles are generated into design.md. Note that the ZIP still contains ShipKit's marketing pages and brand strings today, so remove/replace those before shipping. There is no runtime watermark or phone-home.",
      },
      {
        q: "Is it a one-time buyout or a subscription?",
        a: "The source is a one-time buyout you own forever at a launch price well below most competitors. ShipKit Care is an optional monthly subscription for ongoing updates, hosting help and priority support. See the pricing page for current prices and the full rules.",
      },
      {
        q: "Do you offer custom development or a 1:1 call?",
        a: "Yes. Custom components, private deployment, AI/RAG integration with your own data, migrations and audits are scoped in a free 30-minute 1:1 call, then quoted at a fixed price before work starts. There is no self-checkout and no automatic charge — use the Book a 1:1 call button on the pricing page.",
      },
      {
        q: "How do I deploy the generated app?",
        a: "It's Vercel-ready and also runs on Cloudflare Pages or your own Node server. The README includes a one-click deploy button and the env vars you need.",
      },
      {
        q: "Is ShipKit open source?",
        a: "The marketing site and demo are open; the generated template is a paid, licensed product you receive as source after purchase. You can inspect the live stack this site is built on.",
      },
    ],
  },
  zh: {
    eyebrow: "常见问题",
    heading: "独立开发者真正会问的问题",
    subtitle: "关于用 ShipKit 构建 AI SaaS 的一切——登录、收款、AI、部署与授权。",
    items: [
      {
        q: "模板里有用户后台和管理员后台吗？",
        a: "有，而且是两套独立后台：/account 是登录用户区（资料、订阅、已签发授权码、设置），/admin 是运营区（用户、授权、流量、运行时状态）。两套都支持中英日法德五语，默认随生成工程一起交付。在 Builder 里对应 `account` 与 `admin` 两个可勾选项：取消勾选会把该后台整棵路由树从 ZIP 中剪掉，并同步改写导航与登录后跳转，不会留下死链。目前是只读起步版：没有资料修改接口，也没有 org/RBAC 表。上线前务必保护 /admin：用 ADMIN_USER / ADMIN_PASSWORD 创建运营者账号（在 /admin 页面内登录），带 admin/staff 角色的 Supabase 用户或 ADMIN_EMAILS 白名单成员同样可以进入。",
      },
      {
        q: "下载生成的工程需要授权吗？",
        a: "完整源码 ZIP 需要授权：买断授权（$99）或有效的 Care 订阅——付款后系统自动签发密钥，在 /license 兑换即可，也可用下单邮箱登录自动认领。没有授权也能下载免费预览：你所选构建的完整文件清单 + 设计令牌（不含源码）。这道门槛只保护 ShipKit 本站，你下载到的工程里默认是关闭的。",
      },
      {
        q: "什么是 Next.js SaaS 模板？",
        a: "它是 SaaS 的预置、生产级起点：登录、数据库、计费、后台，通常还包含一个可用的 AI 功能——让你跳过 4–8 周的基础搭建，只做产品真正独特的部分。",
      },
      {
        q: "如何用 Next.js 构建一个 SaaS？",
        a: "克隆像 ShipKit 这样的启动模板，配置环境变量（Supabase、Waffo、AI 密钥），在 Builder 里选择技术栈，下载脚手架并部署到 Vercel 或 Cloudflare。多数创始人几天内即可到达可上线的 MVP，而非数月。",
      },
      {
        q: "ShipKit 包含订阅计费与 Stripe 支持吗？",
        a: "包含。生成的应用自带托管结账（默认 Waffo Pancake）与通过 Webhook 同步的套餐状态。也可以在 Builder 中切换为 Stripe、Creem 或 PayPal——结账与 Webhook 路由与支付商无关。试用期在支付商后台配置，不写死在脚手架里。",
      },
      {
        q: "这个模板包含登录认证吗？",
        a: "包含——基于 Supabase 的邮箱 magic-link 与 OAuth（Google/GitHub/Apple/Microsoft），默认开启行级安全。你可在 Builder 中选择要包含的登录方式（含邮箱）。",
      },
      {
        q: "支持多租户吗？",
        a: "暂未实现。Builder 里有该勾选项，但生成的工程目前没有组织/工作区表，勾选也不会改变产物。若第一天就需要团队与 RBAC，请选 Makerkit 或 Supastarter。",
      },
      {
        q: "支持哪些 AI 供应商？",
        a: "OpenAI 兼容（OpenAI / OpenRouter / DeepSeek / Groq）、Anthropic（Claude）与 Google Gemini。当前对话接口返回单次结果（非流式），每用户配额尚未实现——对外开放前请自行补齐。",
      },
      {
        q: "下载的 ZIP 里有哪些给 AI coding agent 用的文档？",
        a: "根目录 AGENTS.md（仓库契约与完成定义）、锁定所选风格的 design.md、ai/rules/*.md scoped rules、给 Cursor 的 .cursor/rules/*.mdc、给 Claude Code 的 CLAUDE.md，以及最多 12 份 skills/*.md playbook。改完 shipkit.config.json 后执行 npm run ai:docs，会用同一份渲染器重建全部文档；npm run ai:setup 只刷新工具集成。站点还在 /api/mcp 提供 MCP scaffold_project 工具，说明见 /agent-ready。",
      },
      {
        q: "可以换肤 / 白标吗？",
        a: "源码归你，可自由改名与换肤，10 套视觉风格会写进 design.md。但目前 ZIP 仍带 ShipKit 的营销页与品牌字符串，上线前需要替换；没有运行时水印或回连。",
      },
      {
        q: "这是一次性买断还是订阅？",
        a: "源码为一次性买断、永久拥有，首发价明显低于同类模板。ShipKit Care 是可选的按月订阅，提供持续更新、部署协助与优先支持。当前价格与完整规则见定价页。",
      },
      {
        q: "支持定制开发或 1V1 沟通吗？",
        a: "支持。定制组件、私有化部署、AI/RAG 接入自有数据、代码迁移与审计，都先通过免费 30 分钟 1V1 沟通明确范围，再给出固定报价，确认后才开工。定制服务不走在线结账、不会自动扣费，入口在定价页的「预约 1V1 沟通」。",
      },
      {
        q: "如何部署生成的应用？",
        a: "它原生支持 Vercel，也可运行在 Cloudflare Pages 或你自己的 Node 服务器。README 含一键部署按钮与所需环境变量。",
      },
      {
        q: "ShipKit 是开源的吗？",
        a: "营销站与演示是开放的；生成的模板是你购买后以源码形式获得的授权产品。你可以直接查看本站点所基于的实时技术栈。",
      },
    ],
  },
};
