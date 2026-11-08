// Localized FAQ content. EN/ZH carry the full long-tail set; JA/FR/DE cover
// the 12 highest-intent questions and the page falls back to EN only for a
// locale with no entry at all. `FaqContent.tsx` derives `inLanguage` from the
// language of the rendered text, never from the UI locale. Answers must
// describe REAL behaviour — never planned features. See docs/legal-data-map.md
// and AGENTS.md "Known gaps".
//
// Answers are authored in Markdown (paragraphs, - lists, **bold**, `code`,
// [links](/path)) so the FAQ renderer can show them as structured copy instead
// of one wall of text. They describe real behaviour and link to the canonical
// pages (/pricing, /terms, /privacy, /styles, docs) for verifiability.

export type FaqItem = { q: string; a: string };

export type FaqLang = {
  heading: string;
  eyebrow: string;
  subtitle: string;
  reviewed: string;
  items: FaqItem[];
};

export const faqContent: Record<string, FaqLang> = {
  en: {
    eyebrow: "FAQ",
    heading: "Questions indie founders actually ask",
    subtitle:
      "Everything about using make1day to ship your AI SaaS — auth, checkout, AI, deployment, white-labelling and licensing, including the limits we do not hide.",
    reviewed: "Maintained by the make1day team · last updated 2026-11-08",
    items: [
      {
        q: "Does the starter include a user dashboard and an admin dashboard?",
        a: "**Yes — two separate consoles ship by default.**\n\n- **`/account`** is the signed-in user area: profile, subscription, issued license keys, settings.\n- **`/admin`** is the operator area: users, licenses, traffic, runtime status.\n\nBoth are five-language (EN/ZH/JA/FR/DE).\n\n**In the Builder**, `account` and `admin` are toggleable features. Unchecking one removes its entire route tree from the ZIP, and navigation plus post-login redirects are rewritten so no dead links remain.\n\n**Both are writable:**\n\n- `PATCH /api/profile` edits the signed-in profile\n- `PATCH /api/admin/users` manages roles (admin only)\n- `/api/billing/portal` opens the provider billing portal\n- `/admin/tickets` changes ticket status\n\nRBAC tables (`0004_profiles_rbac.sql`) and org tables (`0007_orgs.sql`) ship with every build.\n\n**Protect `/admin` before deploying:** `ADMIN_USER` / `ADMIN_PASSWORD` create an operator account that signs in through `/admin`'s own form with an HMAC-signed session cookie; with no credentials configured, the console stays closed in every environment. A Supabase user with an admin/staff role — or an `ADMIN_EMAILS` allowlist entry — is accepted too.",
      },
      {
        q: "How do I get my license key after paying?",
        a: "The full source ZIP requires a license — a **Buyout license ($99)** or an **active Care plan**.\n\n**After a paid webhook**, the key is emailed to the checkout address automatically, idempotent per issued key. A failed send is queued in `mail_outbox` and retried by a cron endpoint.\n\n**You can also:**\n\n- Sign in with the email you paid with and open `/account/licenses`\n- Paste an offline key into `/license`\n- Use the claim form on `/license` to request a re-send if you checked out as a guest or used a different login email\n\nReal delivery still requires configuring a mail provider and a host scheduler — those are deployment steps, not missing code.\n\n**No license yet?** Download a free, source-free preview: the complete file inventory of your build plus the design tokens (no source code). The gate protects this site only; the project you download ships with it disabled.",
      },
      {
        q: "What is a Next.js SaaS boilerplate?",
        a: "It's a prebuilt, production-grade starting point for a SaaS: authentication, database, billing, an admin area and often a working AI feature.\n\nThe point is to skip 4–8 weeks of commodity setup and build only what makes your product unique.",
      },
      {
        q: "How do I build a SaaS with Next.js?",
        a: "1. Start from a configurable starter such as make1day.\n2. Set your env vars — Supabase, a payment gateway, an AI key.\n3. Pick your stack in the Builder.\n4. Download the generated scaffold and deploy to Vercel or Cloudflare.\n\nMost founders reach a launchable MVP in days, not months.",
      },
      {
        q: "Does make1day include subscription billing and Stripe support?",
        a: "**Yes.** The generated app ships with hosted checkout (Waffo Pancake by default) and webhook-synced plan status.\n\nIn the Builder you can switch to Stripe, Creem, PayPal, Lemon Squeezy or Waffo Acquiring — checkout and webhook routes are provider-agnostic, and only the selected adapter ships in the ZIP.\n\nTrial periods are configured in your payment provider's dashboard, not hardcoded in the scaffold.",
      },
      {
        q: "Does the starter include authentication?",
        a: "**With Supabase Auth, yes:** email magic-link plus OAuth (Google/GitHub/Apple/Microsoft) with row-level security on by default.\n\n**The local SQLite fallback is not a full auth provider.** It is an account and role directory with:\n\n- a real password sign-in (hash-only sessions)\n- password reset and email-verification tokens\n\n…but no MFA, no OAuth and no session rotation. **Production should use Supabase.**",
      },
      {
        q: "Is there multi-tenancy?",
        a: "**Yes, with caveats.** Selecting multi-tenancy ships `supabase/migrations/0007_orgs.sql` (organizations, memberships, row-level security) and `lib/org.ts` helpers.\n\nThe workspace switcher UI and `/api/org` endpoints ship only when the **account** console is also selected, because they live under `/account`.\n\nYou must run the migration yourself and add `.eq(\"org_id\", …)` to your own domain tables — the starter cannot scope tables it does not know about. For a batteries-included B2B tenant model, Makerkit or Supastarter go deeper.",
      },
      {
        q: "Which AI providers are supported?",
        a: "Three families, all streaming:\n\n- **OpenAI-compatible:** OpenAI, OpenRouter, DeepSeek, Groq\n- **Anthropic:** Claude\n- **Google:** Gemini\n\n`/api/ai` streams token-by-token as incremental `text/plain` from all three, and enforces a per-user daily quota (`AI_MESSAGES_PER_DAY`, default 50). Exhausted budgets get HTTP 429 with a truthful `Retry-After`.\n\nProvider errors are logged server-side instead of being disguised as a successful reply.",
      },
      {
        q: "What AI coding documents come inside the downloaded ZIP?",
        a: "A complete, agent-readable docs set:\n\n- root `AGENTS.md` — repo contract and definition of done\n- a style-locked `design.md`\n- scoped rules in `ai/rules/*.md`\n- `.cursor/rules/*.mdc` for Cursor\n- `CLAUDE.md` for Claude Code\n- up to 12 `skills/*.md` playbooks\n\nAfter changing `shipkit.config.json`, run `npm run ai:docs` to rebuild all of them from one shared renderer.\n\nThis site's `llms.txt`, `llms-full.txt` and MCP endpoint are site-only and pruned from every customer ZIP.",
      },
      {
        q: "Can I reskin or white-label it?",
        a: "**Yes.** The source is yours to rename and restyle — 11 visual styles (including the hand-drawn Doodle palette) are generated into `design.md`.\n\nThe ZIP is white-labelled: our marketing pages, brand strings and the generator itself are pruned, and the license gate defaults to off in source. There is no runtime watermark or phone-home.",
      },
      {
        q: "Is it a one-time buyout or a subscription?",
        a: "The source is a **one-time buyout you own forever**. Free updates are included for **12 months**; after that, make1day Care keeps them coming.\n\nCare is an optional monthly subscription for ongoing updates, hosting help and priority support.\n\nThe license lets you build and ship your own products (commercial use allowed), but not resell or redistribute the source as a template. See the [pricing page](/pricing) for current prices and the full rules.",
      },
      {
        q: "Do you offer custom development or a 1:1 call?",
        a: "**Yes.** Custom components, private deployment, AI/RAG integration with your own data, migrations and audits are scoped in a free 30-minute 1:1 call, then quoted at a fixed price before work starts.\n\nThere is no self-checkout and no automatic charge — use the **Book a 1:1 call** button on the [pricing page](/pricing).",
      },
      {
        q: "How do I deploy the generated app?",
        a: "It's **Vercel-ready**, and also runs on:\n\n- Cloudflare Workers via the OpenNext adapter (`nodejs_compat`)\n- your own Node server\n\nThe generated README lists the env vars you need.\n\n**Heads-up:** the local SQLite backend is for development only — it does not persist on serverless and cannot run on Workers at all, so configure Supabase for production.",
      },
      {
        q: "Is make1day open source?",
        a: "The **marketing site and its documentation are public**. The generated template is a paid, licensed product you receive as source after purchase, with an `MIT LICENSE` file in every ZIP.\n\nYou can inspect the live stack this site is built on.",
      },
      {
        q: "Is the generated ZIP really free of your branding?",
        a: "**Yes — and it is enforced by CI.** Home, pricing, sitemap, robots and legal pages are regenerated from the customer's own configuration; marketing pages, brand strings and the generator source are pruned.\n\nThe build matrix downloads every representative ZIP and asserts there are no brand names, no dead links and no generator files — then runs the type checker inside it. **18 configurations are covered today.**",
      },
      {
        q: "Which payment gateways can I switch between?",
        a: "Seven options in the Builder:\n\n- Waffo Pancake (default Merchant of Record)\n- Waffo Acquiring\n- Stripe\n- Creem\n- PayPal\n- Lemon Squeezy\n- `none` (bring your own billing)\n\nAll six adapters implement the same interface: create checkout, create a portal session, verify a webhook.\n\nEvery adapter throws on an invalid or missing signature (**HTTP 400**); an empty event list means only a validly signed but unhandled event (**HTTP 200 ignored**). `npm run probe:webhook` checks that contract offline.",
      },
      {
        q: "Does it work without Supabase?",
        a: "**Yes.** The storage layer picks Supabase or a local SQLite database (`node:sqlite`) based on whether `SUPABASE_SERVICE_ROLE_KEY` is set.\n\nLicense keys, orders, traffic, quotas, AI usage, support tickets and user roles all have both backends.\n\nSQLite is intended for local development: it does not persist on serverless and its auth path lacks MFA, OAuth and session rotation.",
      },
      {
        q: "How do AI answer engines discover this site?",
        a: "Through a full machine-readable surface:\n\n- `llms.txt` (short overview) and `llms-full.txt` (long-form facts)\n- an OpenAPI 3.1 contract\n- an MCP `scaffold_project` tool at `/api/mcp`\n- per-page canonical and hreflang links\n- Organization / WebSite / OfferCatalog / FAQPage / BlogPosting JSON-LD\n- a sitemap that lists the machine-readable routes\n- `robots.txt` rules that explicitly allow AI crawlers\n\nEvery article also publishes a plain Markdown variant at `/blog/<slug>/md`. All editorial content is attributed to the company name **make1day**, so there is one consistent entity to cite.",
      },
      {
        q: "What is the refund policy?",
        a: "Buyout purchases are refundable within **14 days** of purchase. We deliberately do **not** condition this on whether you downloaded the ZIP.\n\nDownload, key-redemption and key-email events are logged in `delivery_events` with a hashed email — but they are evidence for support disputes, not a refund condition.\n\nSee [terms](/terms) for the full rules and [privacy](/privacy) for the data we actually retain.",
      },
      {
        q: "Is SMTP supported for transactional email?",
        a: "**No.** `MAIL_PROVIDER` accepts `resend` (Resend REST), `webhook` (a custom HTTP mailer) or `none` (a safe logged no-op).\n\n`MAIL_PROVIDER=smtp` is a reserved, **not-implemented** value; there is no nodemailer dependency.\n\nA durable retry queue (`mail_outbox` + `/api/cron/mail-outbox`) does exist, but the host scheduler must be configured by the operator; with `MAIL_PROVIDER=none` nothing is queued or sent. SPF/DKIM/DMARC are operator-side DNS work. See `docs/email.md`.",
      },
      {
        q: "How many visual styles and build combinations are verified?",
        a: "**11 visual styles** — 10 palette themes plus the hand-drawn Doodle theme — and **18 representative build-matrix cases**.\n\nEach case downloads a real ZIP and runs `tsc --noEmit` inside it; the Doodle CSS is asserted to be absent from the other styles. See `docs/build-matrix.md` and the [/styles](/styles) gallery.",
      },
    ],
  },
  zh: {
    eyebrow: "常见问题",
    heading: "独立开发者真正会问的问题",
    subtitle: "关于用 make1day 构建 AI SaaS 的一切——登录、收款、AI、部署、白标与授权，包括我们不隐藏的限制。",
    reviewed: "由 make1day 团队维护 · 最近更新 2026-11-08",
    items: [
      {
        q: "模板里有用户后台和管理员后台吗？",
        a: "**有，而且是两套独立后台，默认随生成工程一起交付。**\n\n- **`/account`**：登录用户区——资料、订阅、已签发授权码、设置。\n- **`/admin`**：运营区——用户、授权、流量、运行时状态。\n\n两套都支持中英日法德五语。\n\n**在 Builder 里**，它们是 `account` 与 `admin` 两个可勾选项：取消勾选会把该后台整棵路由树从 ZIP 中剪掉，并同步改写导航与登录后跳转，不会留下死链。\n\n**两套后台都可写：**\n\n- `PATCH /api/profile` 改登录用户资料\n- `PATCH /api/admin/users` 管理角色（仅 admin）\n- `/api/billing/portal` 打开支付商账单门户\n- `/admin/tickets` 改工单状态\n\nRBAC（`0004_profiles_rbac.sql`）与组织表（`0007_orgs.sql`）随每个构建交付。\n\n**上线前务必保护 `/admin`：** 用 `ADMIN_USER` / `ADMIN_PASSWORD` 创建运营者账号（在 `/admin` 页面内登录，会话 cookie 带 HMAC 签名）；未配置任何凭据时后台在**所有环境**都会关闭。带 admin/staff 角色的 Supabase 用户或 `ADMIN_EMAILS` 白名单成员同样可以进入。",
      },
      {
        q: "付款后怎么拿到授权码？",
        a: "完整源码 ZIP 需要授权：**买断授权（$99）** 或 **有效的 Care 订阅**。**付费 Webhook 处理后**，密钥会写入买家账户——用下单邮箱登录并打开 `/account/licenses` 查看，或在 `/license` 粘贴离线密钥兑换。付费 Webhook 还会自动把 key 发到下单邮箱（按已签发 key 幂等）；发送失败会进入 `mail_outbox`，由 `/api/cron/mail-outbox` 重试。\n\n如果游客下单或登录邮箱与下单邮箱不一致，可在 `/license` 的找回表单要求重发。实际投递仍需运维方配置邮件服务与宿主机定时任务——这是部署工作，不是缺失的代码。\n\n**还没授权？** 可下载免费的无源码预览：所选构建的完整文件清单 + 设计令牌（不含源码）。这道门槛只保护本站，你下载到的工程里默认是关闭的。",
      },
      {
        q: "什么是 Next.js SaaS 模板？",
        a: "它是 SaaS 的预置、生产级起点：登录、数据库、计费、后台，通常还包含一个可用的 AI 功能。\n\n意义在于跳过 4–8 周的基础搭建，只做产品真正独特的部分。",
      },
      {
        q: "如何用 Next.js 构建一个 SaaS？",
        a: "1. 从可配置的启动模板（如 make1day）开始。\n2. 配置环境变量——Supabase、支付通道、AI 密钥。\n3. 在 Builder 里选择技术栈。\n4. 下载生成的脚手架并部署到 Vercel 或 Cloudflare。\n\n多数创始人几天内即可到达可上线的 MVP，而非数月。",
      },
      {
        q: "make1day 包含订阅计费与 Stripe 支持吗？",
        a: "**包含。** 生成的应用自带托管结账（默认 Waffo Pancake）与通过 Webhook 同步的套餐状态。\n\n在 Builder 中也可切换为 Stripe、Creem、PayPal、Lemon Squeezy 或 Waffo Acquiring——结账与 Webhook 路由与支付商无关，且 ZIP 只保留选中的适配器。\n\n试用期在支付商后台配置，不写死在脚手架里。",
      },
      {
        q: "这个模板包含登录认证吗？",
        a: "**配 Supabase Auth 时包含：** 邮箱 magic-link 与 OAuth（Google/GitHub/Apple/Microsoft），默认开启行级安全。\n\n**本地 SQLite 回退不是完整的认证服务**，它只是账户与角色目录，提供：\n\n- 可用的密码登录（会话只存哈希）\n- 密码重置与邮箱验证的一次性令牌\n\n但没有 MFA、OAuth 与会话轮换。**生产环境应使用 Supabase。**",
      },
      {
        q: "支持多租户吗？",
        a: "**有，但有前提。** 勾选多租户会附带 `supabase/migrations/0007_orgs.sql`（organizations、memberships 表与 RLS）以及 `lib/org.ts` 助手。\n\n工作区切换 UI 与 `/api/org` 接口位于 `/account` 下，因此**还需要同时勾选用户后台**才会随包交付。\n\n迁移需你自己执行，业务表也要自行加 `.eq(\"org_id\", …)` 做租户隔离——起步工程无法替你隔离它不知道的表。若要开箱即用的 B2B 租户模型，Makerkit 或 Supastarter 更完整。",
      },
      {
        q: "支持哪些 AI 供应商？",
        a: "三大类，全部支持流式：\n\n- **OpenAI 兼容**：OpenAI、OpenRouter、DeepSeek、Groq\n- **Anthropic**：Claude\n- **Google**：Gemini\n\n`/api/ai` 对三家都按 token 以增量 `text/plain` 流式返回，并有每用户每日配额（`AI_MESSAGES_PER_DAY`，默认 50），用尽返回 429 且 `Retry-After` 为真实剩余秒数。provider 报错会记录在服务端日志，不再伪装成正常回复。",
      },
      {
        q: "下载的 ZIP 里有哪些给 AI coding agent 用的文档？",
        a: "一套完整的、机器可读的文档：\n\n- 根目录 `AGENTS.md`——仓库契约与完成定义\n- 锁定所选风格的 `design.md`\n- `ai/rules/*.md` 的 scoped rules\n- 给 Cursor 的 `.cursor/rules/*.mdc`\n- 给 Claude Code 的 `CLAUDE.md`\n- 最多 12 份 `skills/*.md` playbook\n\n改完 `shipkit.config.json` 后执行 `npm run ai:docs`，会用同一份渲染器重建全部文档。\n\n本站的 `llms.txt`、`llms-full.txt` 与 MCP 端点属于站点专属，每个客户 ZIP 都会剪掉。",
      },
      {
        q: "可以换肤 / 白标吗？",
        a: "**可以。** 源码归你，可自由改名与换肤；11 套视觉风格（含手绘 Doodle）会写进 `design.md`。\n\nZIP 是白标的：本站营销页、品牌字符串与生成器本身都会被剪掉，授权门禁在源码层面默认关闭。没有运行时水印或回连。",
      },
      {
        q: "这是一次性买断还是订阅？",
        a: "源码**一次性买断、永久拥有**；含 **12 个月**免费更新，之后可订阅 make1day Care 持续获取更新。\n\nCare 是可选的按月订阅，提供持续更新、部署协助与优先支持。\n\n许可可用于构建并运营你自己的产品（允许商用），但**不得转售**，也不得将源码打包成模板二次售卖。当前价格与完整规则见[定价页](/pricing)。",
      },
      {
        q: "支持定制开发或 1V1 沟通吗？",
        a: "**支持。** 定制组件、私有化部署、AI/RAG 接入自有数据、代码迁移与审计，都先通过免费 30 分钟 1V1 沟通明确范围，再给出固定报价，确认后才开工。\n\n定制服务不走在线结账、不会自动扣费，入口在[定价页](/pricing)的「预约 1V1 沟通」。",
      },
      {
        q: "如何部署生成的应用？",
        a: "它原生支持 Vercel，也可运行在：\n\n- 通过 OpenNext 适配器（nodejs_compat）运行于 Cloudflare Workers\n- 你自己的 Node 服务器\n\n生成的 README 含所需环境变量。\n\n**注意：** 本地 SQLite 后端只用于开发——在 serverless 上不持久，Workers 更是完全没有可写磁盘，生产环境请配置 Supabase。",
      },
      {
        q: "make1day 是开源的吗？",
        a: "**营销站与文档是公开的**；生成的模板是你购买后以源码形式获得的授权产品，每个 ZIP 都带 `MIT LICENSE` 文件。\n\n你可以直接查看本站点所基于的实时技术栈。",
      },
      {
        q: "生成的 ZIP 真的没有你们的品牌吗？",
        a: "**是，而且由 CI 强制保证。** 首页、定价、sitemap、robots、法律页都按客户自己的配置重新生成；营销页、品牌字符串与生成器源码会被剪掉。\n\n构建矩阵会下载每组代表性 ZIP，断言其中没有品牌名、死链与生成器文件，再在包内跑类型检查。**目前覆盖 18 组配置。**",
      },
      {
        q: "可以在哪些支付通道之间切换？",
        a: "Builder 里共七种：\n\n- Waffo Pancake（默认 Merchant of Record）\n- Waffo Acquiring\n- Stripe\n- Creem\n- PayPal\n- Lemon Squeezy\n- `none`（自带计费）\n\n六个适配器实现同一份接口：创建结账、创建客户门户会话、验签 Webhook。\n\n签名缺失或无效一律抛错并返回 **400**；空事件列表只表示「合法已验签但无需处理」，返回 **200** 并标记 ignored。`npm run probe:webhook` 可离线验证这份契约。",
      },
      {
        q: "不配 Supabase 能用吗？",
        a: "**能。** 存储层按是否设置 `SUPABASE_SERVICE_ROLE_KEY` 在 Supabase 与本地 SQLite（`node:sqlite`）之间切换，授权码、订单、流量、配额、AI 用量、工单与角色都有双后端实现。\n\nSQLite 仅用于本地开发：在 serverless 上不持久，且其登录路径没有 MFA、OAuth 与会话轮换。",
      },
      {
        q: "AI 答案引擎是怎么发现这个站点的？",
        a: "通过一整套机器可读面：\n\n- `llms.txt`（精要概览）与 `llms-full.txt`（长文事实）\n- OpenAPI 3.1 契约\n- `/api/mcp` 的 `scaffold_project` 工具\n- 每页 canonical / hreflang 链接\n- Organization / WebSite / OfferCatalog / FAQPage / BlogPosting 的 JSON-LD\n- 列出机器可读路由的 sitemap\n- 显式允许 AI 爬虫的 `robots.txt`\n\n每篇文章还在 `/blog/<slug>/md` 发布纯 Markdown 变体。所有内容统一以公司名 **make1day** 署名，便于被作为单一实体引用。",
      },
      {
        q: "退款规则是什么？",
        a: "买断订单自购买日起 **14 天**内可退。我们刻意不把「是否下载过 ZIP」写进条件。\n\n下载、兑换与 key 邮件事件确实会记入 `delivery_events`（邮箱只存哈希），但那是售后争议的证据，不是退款条件。\n\n完整规则见[条款](/terms)，实际留存的数据见[隐私](/privacy)。",
      },
      {
        q: "事务邮件支持 SMTP 吗？",
        a: "**不支持。** `MAIL_PROVIDER` 可接受 `resend`（Resend REST）、`webhook`（自定义 HTTP mailer）或 `none`（安全空操作）。\n\n`MAIL_PROVIDER=smtp` 只是预留值、**尚未实现**，仓库里也没有 nodemailer 依赖。\n\n持久化重试队列（`mail_outbox` + `/api/cron/mail-outbox`）已经存在，但宿主机定时任务要由运维方自己配置；设为 `none` 时既不发信也不入队。SPF/DKIM/DMARC 属于运营方 DNS 侧工作。详见 `docs/email.md`。",
      },
      {
        q: "有多少套视觉风格和多少组构建验证？",
        a: "**11 套视觉风格**（10 套调色板主题 + 手绘 Doodle 主题），以及 **18 组代表性构建矩阵用例**。\n\n每组都会下载真实 ZIP 并在包内执行 `tsc --noEmit`；同时断言 Doodle 的 CSS 不会泄漏到其它风格。详见 `docs/build-matrix.md` 与[/styles](/styles) 展示页。",
      },
    ],
  },
  // JA / FR / DE cover the highest-intent questions. The remaining long-tail
  // answers still fall back to English; JSON-LD inLanguage follows the text
  // that is actually rendered (see components/FaqContent.tsx).
  ja: {
    eyebrow: "FAQ",
    heading: "個人開発者が本当に聞く質問",
    subtitle:
      "make1day で AI SaaS を構築・販売するための質問と、隠さない制限事項。認証・決済・AI・デプロイ・ホワイトラベル・ライセンスを扱います。",
    reviewed: "make1day チームが維持・最終更新 2026-11-08",
    items: [
      {
        q: "ユーザー画面と管理画面は付いていますか？",
        a: "はい。/account（プロフィール、サブスクリプション、発行済みライセンスキー）と /admin（ユーザー、ライセンス、トラフィック、注文）の 2 つです。どちらも 5 言語対応で、PATCH /api/profile や PATCH /api/admin/users、/api/billing/portal による書き込みも可能です。Builder で account / admin を外すとルートツリーごと ZIP から削除されます。",
      },
      {
        q: "支払い後、ライセンスキーはどう届きますか？",
        a: "決済 Webhook がキーを発行し、購入時のメールアドレスへ自動送信します（キーごとに冪等）。送信失敗は mail_outbox に保存され /api/cron/mail-outbox で再試行されます。ゲスト購入やログインメールが違う場合は /license の再送フォームを使えます。実運用には MAIL_PROVIDER とホスト側 cron の設定が必要です。",
      },
      {
        q: "対応している決済事業者は？",
        a: "Waffo Pancake（既定）、Waffo Acquiring、Stripe、Creem、PayPal、Lemon Squeezy、および none の 7 選択肢です。すべて同一インターフェースで、署名なし・不正署名は 400、署名済みだが対象外のイベントは 200 ignored を返します。npm run probe:webhook でオフライン検証できます。",
      },
      {
        q: "認証はどうなっていますか？",
        a: "Supabase Auth ならマジックリンクと OAuth（Google/GitHub/Apple/Microsoft）が使え、RLS が既定で有効です。未設定時はローカル SQLite にフォールバックし、scrypt ハッシュによるパスワードログイン、パスワード再設定、メール確認が使えます（セッションはハッシュのみ保存）。ただし MFA・OAuth・セッションローテーションはありません。",
      },
      {
        q: "AI 機能は何が入っていますか？",
        a: "OpenAI 互換（OpenAI / OpenRouter / DeepSeek / Groq）、Anthropic Claude、Google Gemini に対し、/api/ai が text/plain の真のストリーミングを返します。ユーザーごとの 1 日あたりメッセージ上限（AI_MESSAGES_PER_DAY、既定 50）があり、超過時は 429 と実際の Retry-After を返します。",
      },
      {
        q: "RAG は本物に動きますか？",
        a: "動きます。BM25（ラテン語の単語＋CJK の uni/bi-gram）と OpenAI 互換 /embeddings の密ベクトルを RRF（k=60）で融合し、[n] 形式の引用を付けます。埋め込みキーが無ければ BM25 のみに自動縮退します。ドキュメント保存はプロセス内メモリが既定で、再起動で消えるため本番は永続ストアが必要です。",
      },
      {
        q: "生成される ZIP から自社ブランドは消えますか？",
        a: "はい。ホーム・料金・sitemap・robots・法務ページは顧客の設定から再生成され、マーケティングページ、ブランド文字列、ジェネレータ本体は剪定されます。pack.ts が ZIP 内の全テキストを sweep し、18 組のビルド行列がブランド漏れ・死にリンク・ジェネレータ残存を検証します。",
      },
      {
        q: "デプロイ先はどこに対応していますか？",
        a: "Vercel、OpenNext アダプタ経由の Cloudflare Workers（nodejs_compat）、自分で管理する Node サーバーです。Workers には書き込み可能なディスクが無く node:sqlite が動かないため、その場合は Supabase が必須です。ローカル SQLite は開発用で serverless では永続化されません。",
      },
      {
        q: "返金ポリシーを教えてください。",
        a: "買い切りは購入から 14 日以内が返金対象です。ZIP をダウンヌードしたかどうかは条件にしていません。ダウンロード／キー有効化／キーメールのイベントは delivery_events にハッシュ化メール付きで記録されますが、それはサポート上の証跡であり返金条件ではありません。",
      },
      {
        q: "トランザクションメールで SMTP は使えますか？",
        a: "使えません。MAIL_PROVIDER は resend（REST）、webhook（カスタム HTTP mailer）、none（安全な no-op）のみで、smtp は未実装の予約値です。永続的な再送キュー（mail_outbox）はありますが、ホスト側のスケジューラ設定が必要です。SPF/DKIM/DMARC は DNS 側の作業です。",
      },
      {
        q: "AI 検索エンジンはこのサイトをどう見つけますか？",
        a: "llms.txt、llms-full.txt、OpenAPI 3.1、/api/mcp、/.well-known/agent-card.json、各記事の /blog/<slug>/md、公開ページの ?format=md、FAQPage / BlogPosting / BreadcrumbList などの JSON-LD、AI クローラを明示的に許可する robots.txt を通じて発見できます。",
      },
      {
        q: "データのエクスポートや削除はできますか？",
        a: "ログイン後、/api/privacy/export が JSON を返し、/api/privacy/erase が完全一致の confirmEmail を要求して個人データを削除します。注文とライセンス行は会計上残し、メールは不可逆な tombstone に置換します。POST /api/cron/retention が 90 日を超える期限付きレコードを削除します（pending メールは残します）。",
      },
    ],
  },
  fr: {
    eyebrow: "FAQ",
    heading: "Les questions que se posent vraiment les fondateurs indépendants",
    subtitle:
      "Tout sur la création et la vente d'un SaaS IA avec make1day : auth, paiement, IA, déploiement, marque blanche et licences, y compris les limites que nous ne cachons pas.",
    reviewed: "Tenue par l'équipe make1day · mise à jour 2026-11-08",
    items: [
      {
        q: "Le starter inclut-il un espace utilisateur et un back-office ?",
        a: "Oui : /account (profil, abonnement, clés de licence émises) et /admin (utilisateurs, licences, trafic, commandes). Les deux sont en cinq langues et sont maintenant modifiables : PATCH /api/profile, PATCH /api/admin/users, /api/billing/portal et /admin/tickets. Décocher `account` ou `admin` dans le Builder retire tout l'arbre de routes du ZIP.",
      },
      {
        q: "Comment reçois-je ma clé de licence après le paiement ?",
        a: "Le webhook payant émet la clé et l'envoie automatiquement à l'adresse utilisée lors du paiement (idempotent par clé). Un échec est stocké dans mail_outbox et réessayé par /api/cron/mail-outbox. Pour un achat invité ou une adresse différente, utilisez le formulaire de renvoi sur /license. La mise en production demande un MAIL_PROVIDER réel et un cron côté hébergeur.",
      },
      {
        q: "Quelles passerelles de paiement sont disponibles ?",
        a: "Waffo Pancake (Merchant of Record par défaut), Waffo Acquiring, Stripe, Creem, PayPal, Lemon Squeezy et `none`. Toutes partagent la même interface. Une signature absente ou invalide renvoie 400 ; une liste d'événements vide mais correctement signée renvoie 200 ignored. npm run probe:webhook vérifie ce contrat hors ligne.",
      },
      {
        q: "Comment fonctionne l'authentification ?",
        a: "Avec Supabase Auth : magic link et OAuth (Google/GitHub/Apple/Microsoft), RLS activée par défaut. Sans Supabase, repli sur SQLite local : connexion par mot de passe (hash scrypt, sessions stockées uniquement en hash), réinitialisation et vérification d'e-mail. Il manque encore MFA, OAuth et la rotation de session.",
      },
      {
        q: "Quelles sont les capacités IA ?",
        a: "/api/ai diffuse réellement le texte en flux (text/plain) depuis les API compatibles OpenAI (OpenAI / OpenRouter / DeepSeek / Groq), Anthropic Claude et Google Gemini. Un quota quotidien par utilisateur est appliqué (AI_MESSAGES_PER_DAY, 50 par défaut) ; le dépassement renvoie 429 avec un Retry-After exact.",
      },
      {
        q: "Le RAG fonctionne-t-il réellement ?",
        a: "Oui : BM25 (mots latins + uni/bi-grammes CJK) fusionné avec des embeddings denses via RRF (k=60), avec citations [n]. Sans clé d'embedding, repli automatique sur BM25 seul. Le stockage des documents est en mémoire par défaut et disparaît au redémarrage : la production nécessite une base persistante.",
      },
      {
        q: "Le ZIP est-il vraiment sans votre marque ?",
        a: "Oui, et c'est vérifié en CI. Les pages d'accueil, tarifs, sitemap, robots et pages légales sont régénérées depuis la configuration du client ; les pages marketing, les chaînes de marque et le générateur sont retirés. pack.ts applique un balayage sur tous les fichiers texte du ZIP et les 18 cas de la matrice vérifient l'absence de marque, de liens morts et de fichiers du générateur.",
      },
      {
        q: "Où puis-je déployer l'application générée ?",
        a: "Vercel, Cloudflare Workers via l'adaptateur OpenNext (nodejs_compat), ou votre propre serveur Node. Workers n'offre pas de disque inscriptible : node:sqlite n'y fonctionne pas, Supabase est donc obligatoire pour cette cible. Le SQLite local est réservé au développement et n'est pas durable en serverless.",
      },
      {
        q: "Quelle est la politique de remboursement ?",
        a: "L'achat définitif est remboursable dans les 14 jours. Nous ne conditionnons pas ce droit au téléchargement du ZIP. Les événements de téléchargement, d'activation et d'envoi de clé sont journalisés dans delivery_events avec une adresse hachée : c'est une preuve pour le support, pas une condition de remboursement.",
      },
      {
        q: "SMTP est-il pris en charge pour les e-mails transactionnels ?",
        a: "Non. MAIL_PROVIDER accepte resend (REST), webhook (mailer HTTP personnalisé) ou none (no-op sûr) ; smtp est une valeur réservée NON IMPLÉMENTÉE. Une file de réessai durable (mail_outbox) existe, mais le planificateur doit être configuré côté hébergeur. SPF/DKIM/DMARC restent du travail DNS.",
      },
      {
        q: "Comment les moteurs de réponse IA découvrent-ils ce site ?",
        a: "Par llms.txt, llms-full.txt, un contrat OpenAPI 3.1, /api/mcp, /.well-known/agent-card.json, les variantes /blog/<slug>/md, le paramètre ?format=md sur toute page publique, les graphes JSON-LD (FAQPage, BlogPosting, BreadcrumbList…) et un robots.txt qui autorise explicitement les crawlers IA.",
      },
      {
        q: "Puis-je exporter ou supprimer mes données ?",
        a: "Connecté, /api/privacy/export renvoie un JSON et /api/privacy/erase supprime les données après un confirmEmail strictement identique. Les lignes de commandes et de licences sont conservées pour la comptabilité avec une adresse rendue irréversible. POST /api/cron/retention supprime les enregistrements de plus de 90 jours (jamais les e-mails en attente).",
      },
    ],
  },
  de: {
    eyebrow: "FAQ",
    heading: "Fragen, die Indie-Gründer wirklich stellen",
    subtitle:
      "Alles über den Aufbau und Verkauf eines AI-SaaS mit make1day: Auth, Checkout, KI, Deployment, White-Label und Lizenzen — inklusive der Grenzen, die wir nicht verstecken.",
    reviewed: "Gepflegt vom make1day-Team · zuletzt aktualisiert 2026-11-08",
    items: [
      {
        q: "Enthält das Starter einen Nutzer- und einen Admin-Bereich?",
        a: "Ja: /account (Profil, Abonnement, ausgestellte Lizenzschlüssel) und /admin (Nutzer, Lizenzen, Traffic, Bestellungen). Beide sind fünfsprachig und inzwischen beschreibbar: PATCH /api/profile, PATCH /api/admin/users, /api/billing/portal und /admin/tickets. Wer `account` oder `admin` im Builder abwählt, entfernt den gesamten Routenbaum aus dem ZIP.",
      },
      {
        q: "Wie erhalte ich nach der Zahlung meinen Lizenzschlüssel?",
        a: "Der bezahlte Webhook stellt den Schlüssel aus und sendet ihn automatisch an die Checkout-Adresse (idempotent pro Schlüssel). Fehlgeschlagene Zustellungen landen in mail_outbox und werden über /api/cron/mail-outbox erneut versucht. Für Gast-Checkout oder abweichende Login-Adressen gibt es das Rücksendeformular auf /license. Für den Livebetrieb müssen MAIL_PROVIDER und ein Host-Cron konfiguriert werden.",
      },
      {
        q: "Welche Zahlungsanbieter werden unterstützt?",
        a: "Waffo Pancake (Standard-Merchant-of-Record), Waffo Acquiring, Stripe, Creem, PayPal, Lemon Squeezy sowie `none`. Alle teilen dieselbe Schnittstelle. Fehlende oder ungültige Signaturen liefern 400; eine gültig signierte, aber leere Eventliste liefert 200 ignored. npm run probe:webhook prüft diesen Vertrag offline.",
      },
      {
        q: "Wie funktioniert die Authentifizierung?",
        a: "Mit Supabase Auth: Magic Link und OAuth (Google/GitHub/Apple/Microsoft), RLS standardmäßig aktiv. Ohne Supabase greift lokales SQLite: Passwort-Anmeldung (scrypt-Hash, Sessions nur als Hash), Passwort-Reset und E-Mail-Verifizierung. Es fehlen weiterhin MFA, OAuth und Session-Rotation.",
      },
      {
        q: "Welche KI-Funktionen sind enthalten?",
        a: "/api/ai liefert echtes text/plain-Streaming für OpenAI-kompatible APIs (OpenAI / OpenRouter / DeepSeek / Groq), Anthropic Claude und Google Gemini. Pro Nutzer gilt ein Tageskontingent (AI_MESSAGES_PER_DAY, Standard 50); bei Erschöpfung antwortet die API mit 429 und einem korrekten Retry-After.",
      },
      {
        q: "Funktioniert das RAG-Modul wirklich?",
        a: "Ja: BM25 (lateinische Wörter plus CJK-Uni-/Bi-Gramme) wird mit dichten Embeddings per RRF (k=60) fusioniert und liefert [n]-Zitate. Ohne Embedding-Key wird automatisch auf BM25 reduziert. Die Dokumentablage liegt standardmäßig im Prozessspeicher und geht beim Neustart verloren — für Produktion ist ein persistenter Store nötig.",
      },
      {
        q: "Ist das ZIP wirklich frei von eurer Marke?",
        a: "Ja, und das wird in CI geprüft. Startseite, Preise, Sitemap, robots und Rechtsseiten werden aus der Kundenkonfiguration neu erzeugt; Marketingseiten, Markenstrings und der Generator selbst werden entfernt. pack.ts durchsucht alle Textdateien des ZIPs, und die 18 Matrixfälle prüfen auf Markenreste, tote Links und Generator-Dateien.",
      },
      {
        q: "Wohin kann ich die generierte App deployen?",
        a: "Vercel, Cloudflare Workers über den OpenNext-Adapter (nodejs_compat) oder ein eigener Node-Server. Workers hat keinen beschreibbaren Datenträger: node:sqlite funktioniert dort nicht, daher ist Supabase für dieses Ziel Pflicht. Lokales SQLite ist nur für die Entwicklung gedacht und in Serverless-Umgebungen nicht dauerhaft.",
      },
      {
        q: "Wie lautet die Erstattungsregel?",
        a: "Der Buyout ist innerhalb von 14 Tagen nach Kauf erstattungsfähig. Wir knüpfen das nicht daran, ob das ZIP heruntergeladen wurde. Download-, Aktivierungs- und Key-Mail-Ereignisse werden in delivery_events mit gehashter Adresse protokolliert — als Nachweis für Supportfälle, nicht als Erstattungsbedingung.",
      },
      {
        q: "Wird SMTP für Transaktionsmails unterstützt?",
        a: "Nein. MAIL_PROVIDER akzeptiert resend (REST), webhook (eigener HTTP-Mailer) oder none (sicherer No-op); smtp ist ein reservierter, NICHT IMPLEMENTIERTER Wert. Eine dauerhafte Retry-Queue (mail_outbox) existiert, aber der Scheduler muss hostseitig konfiguriert werden. SPF/DKIM/DMARC bleiben DNS-Arbeit.",
      },
      {
        q: "Wie finden KI-Antwortmaschinen diese Seite?",
        a: "Über llms.txt, llms-full.txt, einen OpenAPI-3.1-Vertrag, /api/mcp, /.well-known/agent-card.json, die Markdown-Varianten /blog/<slug>/md, ?format=md auf jeder öffentlichen Seite, JSON-LD-Graphen (FAQPage, BlogPosting, BreadcrumbList …) und eine robots.txt, die KI-Crawler explizit erlaubt.",
      },
      {
        q: "Kann ich meine Daten exportieren oder löschen?",
        a: "Angemeldet liefert /api/privacy/export eine JSON-Datei; /api/privacy/erase löscht nach exakt übereinstimmendem confirmEmail. Bestell- und Lizenzzeilen bleiben aus Buchhaltungsgründen erhalten, die Adresse wird irreversibel ersetzt. POST /api/cron/retention entfernt befristete Datensätze nach 90 Tagen, niemals ausstehende Mails.",
      },
    ],
  },
};
