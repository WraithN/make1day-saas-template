import type { Lang } from "@/lib/i18n-core";

// Editorial content for /blog. Every post is published under the company name
// marketit (see the BlogPosting JSON-LD and the byline in the page).
// Each post also carries a structured FAQ: the page renders it visibly AND
// emits FAQPage JSON-LD, which is what answer engines actually quote.
// Bodies avoid template-literal backticks so code identifiers stay plain text.

export type FaqItem = { q: string; a: string };

export type Post = {
  slug: string;
  date: string; // ISO yyyy-mm-dd
  updated?: string; // ISO yyyy-mm-dd — dateModified in JSON-LD
  category: string;
  readingMinutes: number;
  tags: string[];
  title: Partial<Record<Lang, string>>;
  excerpt: Partial<Record<Lang, string>>;
  body: Partial<Record<Lang, string>>;
  /** Localised Q&A. Missing languages fall back to English. */
  faq: Partial<Record<Lang, FaqItem[]>>;
  /** Old slugs that must keep resolving to this canonical post. */
  aliases?: string[];
};

export const POSTS: Post[] = [
  {
    slug: "build-saas-with-nextjs",
    date: "2026-02-12",
    updated: "2026-11-07",
    category: "Guide",
    readingMinutes: 7,
    tags: ["how to build a SaaS with Next.js", "Next.js SaaS boilerplate", "indie SaaS"],
    title: {
      en: "How to Build a SaaS with Next.js in 2026 (Step by Step)",
      zh: "2026 年如何用 Next.js 从零搭建一个 SaaS（分步指南）",
    },
    excerpt: {
      en: "A pragmatic walkthrough of shipping a production SaaS on Next.js 15 — auth, billing, a database and one real AI feature — without rebuilding the commodity plumbing.",
      zh: "一份务实的指南：用 Next.js 15 交付生产级 SaaS——登录、计费、数据库，再加一个真实的 AI 功能——不必重复造通用轮子。",
    },
    body: {
      en: `Building a SaaS in 2026 still means solving the same 60% of commodity problems every founder hits: sign-up, a database, billing and a signed-in area. The difference between founders who ship and founders who stall is rarely the idea — it is how fast they stop rebuilding that 60%.

## Start with the 60% that is commodity

Every SaaS needs the same backbone: authentication, a database with row-level security, subscription billing with webhooks, a dashboard and a deployment story. None of these are your differentiator. Pay that toll once, with infrastructure you can read and change.

## Pick a stack that already has it

Next.js 15 (App Router) + TypeScript + Tailwind is the default for a reason: the tooling, hiring pool and examples already live there. Pair it with Supabase for auth and Postgres. For billing, decide early whether you want one gateway or a switchable layer — a global launch often needs a Merchant of Record plus a fallback provider. marketit ships six adapters (Waffo Pancake by default, plus Waffo Acquiring, Stripe, Creem, PayPal and Lemon Squeezy) behind one checkout and webhook contract.

## Add the one thing that is yours

The common mistake is over-building the demo. Ship ONE real AI feature behind auth and a plan gate — a streaming chat endpoint, document Q&A, a summariser — and leave the rest as honest scaffolding. Customers buy the 40% specific to them.

## Generate instead of deleting

If you know up front which modules you need, a configurator that prunes unselected code beats a starter you have to strip by hand. In marketit the Builder picks auth, gateway, AI providers, features, deploy target and visual style; the server returns a ZIP containing only those modules. Eighteen representative combinations are downloaded and type-checked in CI, and the ZIP is brand-free: our marketing pages and the generator itself are removed.

## Ship, then charge

Start from a free or preview tier, wire a test checkout, and only ask for money once customers get value. The scaffolding should take you from configuration to a deployed, billable app in an afternoon — not a quarter.`,
      zh: `在 2026 年做 SaaS，你依然要解决那 60% 所有创始人都会撞上的通用问题：注册、数据库、计费、登录后的页面。能交付的人和卡住的人，差别几乎不在创意，而在于多快停止重复造这 60% 的轮子。

## 先从通用部分入手

每个 SaaS 都需要同样的主干：登录鉴权、带行级安全的数据库、带 Webhook 的订阅计费、控制台、部署方案。这些都不是差异化优势，而是入场费。一次性交掉，并且用一套你能读懂、能改的基础设施。

## 选一套已经具备主干的技术栈

Next.js 15（App Router）+ TypeScript + Tailwind 成为默认，是因为工具链、人才池和示例都集中在这里。再配 Supabase 做登录与 Postgres。计费要早点决定：只接一家，还是做可切换层——面向全球发布时，通常需要一个 Merchant of Record 加备用通道。marketit 用同一套结账与 Webhook 契约接了六个适配器（默认 Waffo Pancake，另有 Waffo Acquiring、Stripe、Creem、PayPal、Lemon Squeezy）。

## 加上只属于你的那一个功能

常见错误是把演示堆得过满。只交付一个真实的 AI 功能，放在登录与套餐权限之后——流式对话、文档问答、摘要器——其余保持诚实的脚手架。客户买的是那 40% 专属于你的东西。

## 用生成代替手工删减

如果你一开始就知道要哪些模块，「按配置真裁剪」的生成器比「买回来再手删」的模板更省事。marketit 的 Builder 选择登录、支付、AI 供应商、功能、部署目标与视觉风格，服务端只把选中的模块打进 ZIP。CI 会下载 18 组代表性组合并逐个做类型检查；ZIP 是白标的——本站营销页与生成器本身都会被剪掉。

## 先上线，再收费

从免费或预览档起步，跑通一次测试结账，等客户真正获得价值后再收费。脚手架应当让你从选配置到一个已部署、可计费的应用只用一个下午，而不是一个季度。`,
    },
    faq: {
      en: [
        { q: "How long does it take to build a SaaS with Next.js?", a: "The commodity backbone (auth, database, billing, dashboard) is what takes weeks. With a starter it is an afternoon of configuration; the remaining time is your actual product, which no template can shorten." },
        { q: "Do I need Supabase?", a: "No. marketit switches between Supabase (auth + Postgres) and a local SQLite store depending on whether SUPABASE_SERVICE_ROLE_KEY is set. SQLite is for local development — the local auth path has no MFA, OAuth or session rotation, and does not persist on serverless." },
        { q: "Which payment gateway should I start with?", a: "If you sell globally without a company entity, a Merchant of Record such as Waffo Pancake or Lemon Squeezy removes tax handling. If you already have a Stripe account, use Stripe. The generated app keeps checkout and webhooks behind one provider-agnostic contract, so switching later is a config change." },
      ],
      zh: [
        { q: "用 Next.js 做一个 SaaS 要多久？", a: "真正耗时的是通用主干（登录、数据库、计费、控制台），通常是几周。用模板后这部分只是半天配置；剩下的时间是你自己的产品，模板无法替你缩短。" },
        { q: "必须用 Supabase 吗？", a: "不必。marketit 按是否配置 SUPABASE_SERVICE_ROLE_KEY 在 Supabase 与本地 SQLite 之间切换。SQLite 只适合本地开发：本地登录路径没有 MFA、OAuth、会话轮换，在 serverless 上也不持久。" },
        { q: "先接哪个支付通道？", a: "没有公司主体却要面向全球收款，用 Waffo Pancake 或 Lemon Squeezy 这类 Merchant of Record 可以免去税务处理；已有 Stripe 账户就直接接 Stripe。生成的应用把结账与 Webhook 收在同一份与支付商无关的契约里，之后切换只是改配置。" },
      ],
    },
  },
  {
    slug: "nextjs-saas-boilerplate-stripe-auth",
    date: "2026-03-03",
    updated: "2026-11-07",
    category: "Comparison",
    readingMinutes: 6,
    tags: ["Next.js SaaS boilerplate with Stripe and auth", "Next.js SaaS starter with auth", "Stripe Supabase starter"],
    title: {
      en: "What to Check in a Next.js SaaS Boilerplate with Stripe and Auth",
      zh: "自带 Stripe 与登录的 Next.js SaaS 模板，到底该检查什么",
    },
    excerpt: {
      en: "Four non-negotiables that separate a starter you will ship on from one you will abandon — and how to evaluate all of them in ten minutes.",
      zh: "四项不可妥协的检查，决定一个模板是你会交付的，还是会被弃用的——以及如何在十分钟内验完。",
    },
    body: {
      en: `When you search for a Next.js SaaS boilerplate with Stripe and auth, you are really asking one question: how little of the commodity 60% do I have to write myself?

## The four non-negotiables

1. Auth — email magic-link and OAuth through a managed provider, with row-level security on by default.
2. Billing — a hosted checkout plus a webhook that flips a flag in your database. If the webhook is not wired, it is a demo, not a business.
3. Database — Postgres with a seeded schema and RLS policies you can actually read.
4. Deploy — a Vercel-ready config and a one-command path to production.

## The part most templates get wrong

Webhook verification is not a detail. A missing, invalid or malformed signature must be rejected with HTTP 400 — not silently treated as an empty event list. In this codebase every provider adapter throws on verification failure, and an empty array means only one thing: the event was validly signed but needs no handling. Replays are deduplicated by event id before any license or plan is written.

Most free templates skip idempotency; you discover it at your first refund or duplicate event.

## One gateway or six?

The default here is Waffo Pancake (Merchant of Record). Stripe, Creem, PayPal, Lemon Squeezy and Waffo Acquiring are switchable at generation time, with none as a valid choice when you bring your own billing. A single POST /api/webhook route and one PaymentProvider interface sit under all of them, so your app code never branches on gateway.

## Ten-minute evaluation

Clone it, set the env vars, run the dev server, then try to: sign up, hit the paywall, complete a test checkout and see the plan flip. Also fire a webhook with a bad signature — it must return 400, never 200. If any step is blocked by missing code, keep looking.`,
      zh: `当你搜索「自带 Stripe 与登录的 Next.js SaaS 模板」时，真正只问一个问题：那 60% 的通用部分，我还要亲手写多少？

## 四项不可妥协

1. 登录鉴权——托管服务商提供的邮箱魔法链接与 OAuth，默认开启行级安全。
2. 计费——托管结账加上一个会把套餐标志写进数据库的 Webhook。Webhook 没接，那是演示，不是生意。
3. 数据库——Postgres，含预置表结构与可读的 RLS 策略。
4. 部署——Vercel 就绪配置，一条命令通往生产。

## 大多数模板栽在这里

Webhook 验签不是细节。签名缺失、无效或 JSON 损坏时必须返回 HTTP 400，绝不能悄悄当成「空事件列表」返回 200。本项目里每个支付适配器验签失败都会抛错，空数组只表示一件事：事件合法且已验签，但无需处理。重放事件在写 license 或套餐前会按事件 id 去重。

多数免费模板跳过幂等，而你会在第一次退款或重复事件时才发现。

## 一家通道还是六家？

这里默认 Waffo Pancake（Merchant of Record）。Stripe、Creem、PayPal、Lemon Squeezy 与 Waffo Acquiring 可在生成时切换，也可以选 none 自带计费。它们共用同一个 POST /api/webhook 与一份 PaymentProvider 接口，业务代码里不需要按支付商分支。

## 十分钟评估法

克隆、配置环境变量、启动服务，然后试四步：注册、撞付费墙、完成测试结账、看到套餐翻转。再用错误签名打一次 Webhook——必须返回 400，绝不能是 200。任何一步被缺失代码卡住，继续找。`,
    },
    faq: {
      en: [
        { q: "Does a starter need Stripe specifically?", a: "No. Stripe is the most documented option, but a Merchant of Record (Waffo Pancake, Lemon Squeezy) handles global tax without a company entity, and some markets need PayPal or Creem. What matters is one provider-agnostic checkout/webhook contract." },
        { q: "What should a webhook return on a bad signature?", a: "HTTP 400. A 200 with an empty event list lets forged or malformed requests look successful. Verification failure must throw; only a validly signed but unhandled event should be acknowledged as ignored." },
        { q: "Is OAuth included?", a: "With Supabase Auth, yes — email magic-link plus Google, GitHub, Apple and Microsoft. The local SQLite fallback is an account/role directory, not a full auth provider: no MFA, no OAuth, no session rotation." },
      ],
      zh: [
        { q: "模板必须接 Stripe 吗？", a: "不必。Stripe 文档最全，但 Waffo Pancake、Lemon Squeezy 这类 Merchant of Record 能在没有公司主体时处理全球税务，部分市场还需要 PayPal 或 Creem。关键是结账与 Webhook 有一份与支付商无关的契约。" },
        { q: "验签失败该返回什么？", a: "HTTP 400。返回 200 加空事件列表，会让伪造或格式错误的请求看起来成功了。验签失败必须抛错；只有「合法已验签但无需处理」的事件才可确认忽略。" },
        { q: "包含 OAuth 吗？", a: "配 Supabase Auth 时包含：邮箱魔法链接加 Google、GitHub、Apple、Microsoft。本地 SQLite 回退只是账户与角色目录，不是完整认证服务：没有 MFA、OAuth 与会话轮换。" },
      ],
    },
  },
  {
    slug: "nextjs-subscription-billing",
    date: "2026-03-21",
    updated: "2026-11-07",
    category: "Billing",
    readingMinutes: 8,
    tags: ["Next.js subscription billing boilerplate", "Stripe subscriptions Next.js", "SaaS template"],
    title: {
      en: "Next.js Subscription Billing: The Webhook Contract That Actually Works",
      zh: "Next.js 订阅计费：真正能用的 Webhook 契约",
    },
    excerpt: {
      en: "Idempotency, signature verification and plan gating — the parts tutorials skip, plus an offline probe you can run without a gateway account.",
      zh: "幂等、验签、套餐权限——教程跳过的部分，再加一个无需支付账户就能跑的离线探测脚本。",
    },
    body: {
      en: `Most subscription-billing tutorials stop at the happy path: create a checkout session, redirect, done. Production billing lives in the parts they skip.

## The webhook is the source of truth

A browser redirect lies. A user closes the tab, a provider retries, a test fires twice. Your database must be the single source of truth, updated only by a verified webhook.

The verification contract is worth stating precisely, because getting it backwards is a security bug:

- Missing, invalid or malformed signature → throw, and the route answers 400.
- Validly signed event that needs no handling → return an empty list, and the route answers 200 with an ignored flag.
- Already-seen event id → skip before writing anything.

Every adapter in this repo follows that contract. An earlier version returned an empty list on verification failure, which meant a forged request was acknowledged with 200. Do not make that trade.

## Gate features on the server, not the UI

Never trust the client. Read the plan from the session or database on every protected route. If the plan is inactive, the AI endpoint returns 402 — even if someone edits the DOM in devtools.

## Budget and quotas are separate

Subscription status is not the same as usage limits. The AI endpoint has its own per-user daily quota (AI_MESSAGES_PER_DAY, default 50) backed by either a Supabase RPC or the local SQLite ai_usage table. Exhausting it returns 429 with an X-AI-Quota-Reset header and a truthful Retry-After in seconds, not a hard-coded 86400.

## Test it offline

You do not need six sandbox accounts to validate the contract. The repository ships an offline signature probe (npm run probe:webhook) that sends valid, missing, corrupted and malformed bodies to a running server and asserts the status codes. Sandbox end-to-end runs are still required before launch, but the security invariant can be checked in CI. See docs/payment-testing.md for the four-layer strategy.`,
      zh: `多数订阅计费教程止步于顺利路径：创建结账会话、跳转、结束。生产级计费恰恰活在那些被跳过的地方。

## Webhook 才是真相来源

浏览器跳转会骗人：用户关掉标签页、支付商重试、测试触发两次。数据库必须是唯一真相来源，且只由已验签的 Webhook 更新。

验签契约值得写清楚，因为写反了就是安全漏洞：

- 签名缺失、无效或格式损坏 → 抛错，路由返回 400。
- 合法已验签但无需处理的事件 → 返回空列表，路由返回 200 并标记 ignored。
- 已见过的事件 id → 写库前直接跳过。

本仓库每个适配器都遵守这份契约。早期版本在验签失败时也返回空列表，等于用 200 确认了伪造请求，别再退回去。

## 权限在服务端，不在界面

永远不要信任客户端。每个受保护路由都从会话或数据库读套餐；套餐未激活时 AI 接口返回 402——哪怕有人在 devtools 里改了 DOM。

## 预算和配额是两件事

订阅状态不等于用量限制。AI 接口另有每用户每日配额（AI_MESSAGES_PER_DAY，默认 50），由 Supabase RPC 或本地 SQLite 的 ai_usage 表扣减。用尽返回 429，带 X-AI-Quota-Reset 与按真实剩余秒数计算的 Retry-After，不是写死的 86400。

## 离线也能测

验证这份契约不需要六个沙箱账户。仓库提供离线验签探测（npm run probe:webhook），向运行中的服务发送合法、缺失、篡改、损坏四种请求并断言状态码。上线前仍要跑沙箱端到端，但安全不变量可以在 CI 里守住。四层测试策略见 docs/payment-testing.md。`,
    },
    faq: {
      en: [
        { q: "How do I make a webhook idempotent?", a: "Record the provider event id in a webhook_events table and check it before writing a plan or license. Signature verification happens first; only verified, unhandled events reach the deduplication step." },
        { q: "What is the difference between 402 and 429 here?", a: "402 means no download entitlement (no valid license, subscription or email claim). 429 means the daily AI message quota is exhausted. Preview-quota exhaustion is a separate 402 with a preview_limit_reached code." },
        { q: "Can I test all six gateways without sandbox accounts?", a: "You can test the shared verification contract offline with npm run probe:webhook. Each gateway's real checkout flow still needs its own sandbox credentials before launch; docs/payment-testing.md lists the required environment variables." },
      ],
      zh: [
        { q: "Webhook 怎么做幂等？", a: "把支付商事件 id 记进 webhook_events 表，在写套餐或 license 之前先查。验签在最前面，只有合法且未处理的事件才进入去重步骤。" },
        { q: "402 和 429 有什么区别？", a: "402 表示没有下载凭据（无有效授权码、订阅或邮箱认领）。429 表示 AI 每日消息配额用尽。预览额度耗尽是另一个 402，错误码为 preview_limit_reached。" },
        { q: "没有沙箱账户能测六个通道吗？", a: "共用验签契约可以用 npm run probe:webhook 离线测；每个通道的真实结账流程上线前仍需各自的沙箱凭据。所需环境变量见 docs/payment-testing.md。" },
      ],
    },
  },
  {
    slug: "ai-saas-boilerplate-comparison-2026",
    date: "2026-04-09",
    updated: "2026-11-07",
    category: "Comparison",
    readingMinutes: 9,
    tags: ["AI SaaS boilerplate comparison 2026", "ShipFast alternative", "Makerkit alternative", "best Next.js SaaS boilerplate 2026"],
    aliases: ["shipkit-vs-shipfast-makerkit"],
    title: {
      en: "AI SaaS Boilerplates in 2026: An Honest Comparison",
      zh: "2026 年 AI SaaS 模板：一份诚实的对比",
    },
    excerpt: {
      en: "Streaming, MCP, token metering and AGENTS.md are baseline in 2026. Here is what actually differs between the paid starters — and what does not.",
      zh: "到 2026 年，流式输出、MCP、token 计量、AGENTS.md 都已是基线。下面讲付费模板之间真正还有差别的地方，以及已经没有差别的地方。",
    },
    body: {
      en: `If you landed here searching for a ShipFast alternative or a Makerkit alternative, you are weighing the same four or five names everyone recommends. The useful answer is not a feature checklist — it is where the products stop being comparable.

## What is now baseline

By late 2026, LLM streaming, multiple model providers, token or credit metering, RAG, an MCP endpoint, AGENTS.md and llms.txt are table stakes for any AI-first starter. There are public buyer checklists covering MCP, tool calling, usage billing, queues, evals, observability and guardrails. If a vendor markets any one of these as a unique breakthrough, treat the claim sceptically.

## Where they genuinely differ

- ShipFast — the lean, opinionated pick. Fastest to a landing page, smallest surface, least hand-holding. Best when you plan to diverge hard.
- Makerkit — batteries-included, enterprise-leaning. More structure and real org/role complexity from day one.
- Supastarter — Supabase-native; fits perfectly if your whole world is Supabase, less flexible if you later swap the backend.
- AI-first kits in the 179–249 dollar band — streaming, credit billing, RAG and agent docs, usually sold as a fixed repository with GitHub access.
- marketit — a configurable generator, not a fixed repository. You pick the modules and the server returns a pruned, brand-free ZIP. The differentiator is delivery infrastructure, not another AI feature.

## The delivery layer nobody else needs

Because the product IS the download, this project has to solve things a fixed starter does not: an HMAC license key or subscription gate that fails closed in production, a source-free anonymous preview with signed visitor tokens, six payment adapters with one verification contract, five-language copy, a Supabase/SQLite switch driven purely by env, and a matrix that downloads and type-checks every representative build. None of that is an AI capability — it is what makes selling configurable source code possible.

## Honest limits

This is an honest starter, not a batteries-included platform: the consoles do have profile and role mutation endpoints and a billing portal, but the local auth path has no MFA, OAuth or session rotation; SMTP is not implemented (Resend REST, a custom HTTP mailer or a safe no-op); the mail retry queue and the optional external error sink exist but require an operator-configured cron and \`ERROR_REPORT_URL\`; download / activation events are logged with hashed emails, while the refund rule stays a plain 14-day window. Multi-tenancy ships SQL and helpers, but you must scope your own domain tables. If you need a batteries-included B2B tenant model from day one, Makerkit or Supastarter go deeper.

No starter is universally best. Choose against the 40% that is yours.`,
      zh: `如果你是因为搜「ShipFast 替代品」或「Makerkit 替代品」来到这里，你正在权衡大家推荐的同几个名字。有用的答案不是功能清单，而是这些产品从哪一步开始不再可比。

## 已经变成基线的部分

到 2026 年下半年，LLM 流式、多模型、token／credit 计量、RAG、MCP 接口、AGENTS.md 与 llms.txt，已经是任何 AI-first 模板的入场配置。公开选型的 checklist 甚至覆盖 MCP、tool calling、用量计费、队列、evals、可观测性与护栏。如果厂商把其中任何一项当成独门突破来宣传，值得怀疑。

## 真正还有差别的地方

- ShipFast——精简、强主张。最快做出落地页，表面积最小，适合打算大幅偏离的人。
- Makerkit——「电池全配」、偏企业。结构更多，从第一天就有真实的组织／角色复杂度。
- Supastarter——Supabase 原生；整个世界都是 Supabase 时最贴合，日后换后端就没那么灵活。
- 179–249 美元档的 AI-first 套件——流式、credit 计费、RAG、agent 文档，通常以固定仓库 + GitHub 访问权出售。
- marketit——可配置生成器，不是固定仓库。你选模块，服务端返回真裁剪、品牌中性的 ZIP。差异在交付基础设施，而不是多一个 AI 功能。

## 别人不需要的交付层

因为「下载包就是商品」，这个项目必须解决固定模板不必解决的问题：生产环境恒开的 HMAC 授权码／订阅门禁、匿名无源码预览包与签名访客令牌、共用一份验签契约的六个支付适配器、五语文案、按 env 切换的 Supabase／SQLite 双后端，以及会下载并逐个类型检查每组代表性构建的矩阵。这些都不是 AI 能力，而是「把可配置源码当商品卖」的前提。

## 诚实的限制

这是一套诚实标注边界的模板，不是开箱即用的完整平台：后台已有资料修改、角色管理与账单门户；本地登录路径没有 MFA、OAuth 与会话轮换；SMTP 明确未实现（只有 Resend REST、自定义 HTTP mailer 或安全空操作）；邮件重试队列与可选外部错误上报已存在，但需要运维方配置定时任务与 \`ERROR_REPORT_URL\`；下载与兑换事件会以哈希邮箱记录，退款规则仍是纯 14 天窗口。多租户附带 SQL 与助手函数，但你自己的业务表要自己做租户隔离。若第一天就要开箱即用的 B2B 租户模型，Makerkit 或 Supastarter 更完整。

没有哪个模板是通用最佳，只有对你那 40% 而言的最佳。`,
    },
    faq: {
      en: [
        { q: "Is streaming AI output a differentiator in 2026?", a: "No. Streaming, multi-provider chat, token metering, RAG, MCP and AGENTS.md are baseline across paid AI starters and many free ones. Compare on delivery model, honest limits and what you actually have to write yourself." },
        { q: "What does a generator do that a fixed repository cannot?", a: "It removes unselected modules from the downloaded source instead of leaving dead code, rewrites navigation so no dead links remain, and produces a brand-free ZIP per configuration. A fixed repository gives everyone the same tree." },
        { q: "Is marketit open source?", a: "The site and its documentation are public; the generated template is a paid, licensed product delivered as source. Each ZIP ships an MIT LICENSE file and the customer is free to rename and restyle it." },
      ],
      zh: [
        { q: "2026 年流式 AI 输出还算差异点吗？", a: "不算。流式、多模型对话、token 计量、RAG、MCP、AGENTS.md 已是付费 AI 模板乃至很多免费模板的基线。要比就比交付形态、诚实边界，以及你到底还要亲手写多少。" },
        { q: "生成器比固定仓库多做了什么？", a: "它把未选中的模块从源码里真正删掉（而不是留死代码），改写导航避免死链，并按配置产出品牌中性的 ZIP。固定仓库给所有人的是同一棵树。" },
        { q: "marketit 是开源的吗？", a: "本站与文档是公开的；生成的模板是购买后以源码交付的授权产品。每个 ZIP 都带 MIT LICENSE 文件，客户可自由改名与换肤。" },
      ],
    },
  },
  {
    slug: "add-stripe-subscriptions-nextjs",
    date: "2026-04-28",
    updated: "2026-11-07",
    category: "Tutorial",
    readingMinutes: 10,
    tags: ["how to add Stripe subscriptions to Next.js", "Stripe subscriptions Next.js", "Next.js subscription billing boilerplate"],
    title: {
      en: "How to Add Stripe Subscriptions to Next.js (Complete Guide)",
      zh: "如何给 Next.js 添加 Stripe 订阅（完整指南）",
    },
    excerpt: {
      en: "Products, the checkout route, the webhook, the feature gate and the test loop — with the verification details most guides under-explain.",
      zh: "产品、结账路由、Webhook、功能权限与测试闭环——补上多数指南讲得不够的验签细节。",
    },
    body: {
      en: `This is the shortest path to Stripe subscriptions in Next.js that will not break in production. Four moving parts, no fluff.

## 1. Create the product and price

In the Stripe dashboard create a Product with a recurring Price. Copy the Price ID into env as STRIPE_PRICE_ID_PRO. Never hard-code it in source.

## 2. The checkout route

A POST /api/checkout route reads the plan, resolves the price id, and creates a Checkout Session with mode subscription, a client_reference_id for your user, and explicit success_url and cancel_url. Return the hosted URL to the browser. Require a signed-in user before creating the session — guest checkout leaves no one to grant the entitlement to.

## 3. The webhook is the source of truth

Verify the raw body against the signature header BEFORE parsing JSON. Handle checkout.session.completed and customer.subscription.deleted, then update your database. Two rules:

- Verification failure (missing header, bad HMAC, malformed JSON) must throw and produce HTTP 400. Acknowledging a forged request with 200 is a security bug.
- Record processed event ids and skip replays before any write. Stripe retries; without this you get double upgrades and phantom refunds.

## 4. The feature gate

On every protected route or server action, read the plan from the database — never from client state. If the plan is inactive, return 402. Your AI endpoint, download ZIP or seat limits all hang off this one check.

## 5. Test the whole loop

Use the Stripe test card 4242 4242 4242 4242 in test mode: complete checkout, confirm the plan flips, cancel, confirm it flips back. Then send a webhook with a corrupted signature and confirm 400. If the loop works with one env file, your billing is real.

A good boilerplate hands you steps 2–4 already wired, and keeps them behind a provider-agnostic interface so adding Creem, PayPal, Waffo or Lemon Squeezy later does not rewrite your app.`,
      zh: `这是「在 Next.js 中接入 Stripe 订阅」最短、且不会在生产翻车的路径。四个部件，没有灌水。

## 1. 创建产品与价格

在 Stripe 后台创建带周期性价格的 Product，把 Price ID 作为 STRIPE_PRICE_ID_PRO 写进环境变量，绝不硬编码进源码。

## 2. 结账路由

POST /api/checkout 读取套餐、解析价格 id、创建 mode 为 subscription 的 Checkout Session，带上 client_reference_id 与明确的 success_url / cancel_url，把托管页 URL 返回浏览器。创建会话前要求已登录——游客结账会找不到该给谁发授权。

## 3. Webhook 是真相来源

在解析 JSON 之前，先用签名头校验原始 body。处理 checkout.session.completed 与 customer.subscription.deleted，然后更新数据库。两条规则：

- 验签失败（缺头、HMAC 不对、JSON 损坏）必须抛错并返回 HTTP 400。用 200 确认伪造请求是安全漏洞。
- 记录已处理事件 id，任何写库之前先跳过重放。Stripe 会重试，没有这一步就会出现重复升级与幽灵退款。

## 4. 功能权限

每个受保护路由或服务端动作都从数据库读套餐，绝不读客户端状态。套餐未激活返回 402。AI 接口、源码 ZIP 下载、席位限制都挂在这一个检查上。

## 5. 跑通整个闭环

用测试卡 4242 4242 4242 4242 在测试模式完成结账，确认套餐翻转，再取消并确认翻回。然后用篡改签名的 Webhook 打一次，确认返回 400。若一份 env 就能跑通，计费就是真的。

好的模板会把第 2–4 步预先接好，并把它们放在与支付商无关的接口后面，这样以后加 Creem、PayPal、Waffo 或 Lemon Squeezy 时不必重写应用代码。`,
    },
    faq: {
      en: [
        { q: "Should I parse the webhook body before verifying it?", a: "No. Verify the exact raw bytes against the signature header first, then parse. Parsing first and re-serialising changes the bytes and breaks HMAC verification." },
        { q: "Why does guest checkout break entitlement?", a: "The webhook grants access by user id or payment email. If nobody is signed in and the payment email does not match an account, the license has no owner to claim it. Require login before creating the session." },
        { q: "What does an ignored webhook response mean?", a: "200 with an ignored flag means the event was validly signed but is not one we handle. It must never be used for verification failures, which are 400." },
      ],
      zh: [
        { q: "验签之前可以先解析 body 吗？", a: "不行。先用签名头校验原始字节，再解析。先解析再重新序列化会改变字节，导致 HMAC 校验失败。" },
        { q: "为什么游客结账会发不出授权？", a: "Webhook 按用户 id 或付款邮箱发放权限。若没人登录、付款邮箱又对不上账户，license 就没有可认领的人。创建会话前要求登录。" },
        { q: "被忽略的 Webhook 响应是什么意思？", a: "返回 200 并标记 ignored，表示事件合法已验签但不属于我们处理的类型。它绝不能用于验签失败——那些必须是 400。" },
      ],
    },
  },
  {
    slug: "ai-saas-boilerplate-checklist-2026",
    date: "2026-11-07",
    category: "Guide",
    readingMinutes: 11,
    tags: ["AI SaaS boilerplate checklist 2026", "AI agent SaaS boilerplate", "production AI SaaS starter"],
    title: {
      en: "The AI SaaS Boilerplate Checklist for 2026 (12 Verifiable Items)",
      zh: "2026 年 AI SaaS 模板选型清单（12 项可验证）",
    },
    excerpt: {
      en: "Streaming and MCP are table stakes now. Use these twelve checks — each with a concrete way to verify it — before you pay for an AI-first starter.",
      zh: "流式与 MCP 已是入场配置。付钱之前，用这 12 项逐条验证——每项都给出可操作的检查方法。",
    },
    body: {
      en: `An AI-first starter in 2026 is a mature category with published buyer checklists. That is good news: you can evaluate one in an afternoon instead of trusting a landing page. Here are twelve items and how to verify each without taking a vendor's word for it.

## Capability baseline (expect all of these)

1. Streaming output. Verify: the response is incremental text, not one JSON blob at the end.
2. Multiple model providers. Verify: swap the env key and the same route still works.
3. Usage metering and quotas. Verify: exhaust the quota and read the 429 headers, including a truthful Retry-After.
4. Retrieval with citations. Verify: ingest a document and see inline source markers, not just an answer.
5. Tool calling / MCP. Verify: an agent client can discover and call the tool endpoint.
6. Provider error honesty. Verify: an invalid API key produces a logged server error and a real failure, not a cheerful fake reply.

## Production baseline (the items vendors skip)

7. Webhook signature verification. Verify: bad or missing signature returns 400, never 200.
8. Idempotency. Verify: replay one event id and confirm only one write.
9. Guardrails and rate limits. Verify: an unauthenticated or over-quota request is rejected at the server, not hidden in the UI.
10. Observability. Verify: structured logs, an error boundary, /api/health with a real DB probe, a local error_events table and an optional ERROR_REPORT_URL sink. Ask who configures the sink and who gets paged — the code cannot page anyone.
11. Agent-readable docs. Verify: AGENTS.md, a style-specific design document, scoped rules, llms.txt, an OpenAPI contract and an MCP endpoint are actually present in the download, not just on the marketing site.
12. Cost visibility. Verify: you can see what a user's AI usage costs, or at least the token counts behind the quota.

## What is NOT on this checklist

Brand name, hero animation and the number of demo screens. Also not: claims like "save 480 hours" — vendor self-reports are not verifiable. And beware treating any single baseline item as a differentiator; by late 2026 they are the entry ticket.

## The one question that still separates products

Ask: do I receive the same fixed repository as everyone else, or a build generated from my own configuration with unselected modules actually removed? If the answer is a fixed repository, budget time to delete code you did not ask for — and to check that deleting it does not leave dead links behind.`,
      zh: `到 2026 年，AI-first 模板已是成熟品类，甚至有公开的选型 checklist。这是好事：你不用信落地页，一个下午就能验完。下面 12 项，每项都给一个不靠厂商自述的验证方法。

## 能力基线（这些应当全有）

1. 流式输出。验证：响应是增量文本，不是最后一次性返回整个 JSON。
2. 多模型供应商。验证：换一个 env key，同一条路由仍然能跑。
3. 用量计量与配额。验证：把配额打满，读 429 响应头，包括真实的 Retry-After。
4. 带引用的检索。验证：灌入一篇文档，答案里有内联来源标记，而不是光给结论。
5. Tool calling / MCP。验证：agent 客户端能发现并调用工具端点。
6. 供应商错误诚实。验证：无效 API key 会在服务端记录错误并真实失败，而不是伪装成愉快的假回复。

## 生产基线（厂商常跳过的）

7. Webhook 验签。验证：错误或缺失签名返回 400，绝不是 200。
8. 幂等。验证：重放同一个事件 id，确认只写了一次。
9. 护栏与限流。验证：未登录或超配额请求在服务端被拒，而不是界面上藏起来。
10. 可观测性。验证：结构化日志、error boundary、/api/health 的真实数据库探测、本地 error_events 表与可选的 ERROR_REPORT_URL 上报。再追问谁来配置上报、谁接收告警——代码本身不会通知任何人。
11. 机器可读文档。验证：AGENTS.md、锁定风格的设计文档、scoped rules、llms.txt、OpenAPI 契约与 MCP 端点确实在下载包里，而不只在营销站上。
12. 成本可见性。验证：能看到某个用户的 AI 用量成本，或至少配额背后的 token 计数。

## 不在这份清单里的东西

品牌名、首屏动效、演示页数量。也不包括「节省 480 小时」这类厂商自述——不可验证。更不要把任何单项基线当差异点，到 2026 年底它们只是入场券。

## 仍能拉开差距的一个问题

问一句：我拿到的是和所有人一样的固定仓库，还是按我的配置生成、把未选模块真正删掉的构建？如果答案是固定仓库，就请为「删掉你没要的代码」留时间，并且检查删完之后有没有留下死链。`,
    },
    faq: {
      en: [
        { q: "Is MCP support a differentiator in 2026?", a: "No. MCP endpoints, tool calling, usage billing, evals and observability now appear in public buyer checklists for AI agent SaaS boilerplates. Treat them as baseline and verify them rather than paying a premium for the claim." },
        { q: "How do I verify a vendor's streaming claim?", a: "Open the network panel or curl the endpoint and watch whether chunks arrive before the model finishes. A single JSON response at the end is not streaming, even if the UI animates a typing indicator." },
        { q: "What is the most common hidden gap in AI starters?", a: "Webhook verification and idempotency on the billing path, and honest provider error propagation on the AI path. Both look fine in a demo and fail on the first forged request or invalid API key." },
      ],
      zh: [
        { q: "2026 年支持 MCP 还算差异点吗？", a: "不算。MCP 端点、tool calling、用量计费、evals、可观测性已经写进公开的 AI Agent SaaS 选型清单。把它们当基线逐项验证，而不是为宣传语付溢价。" },
        { q: "怎么验证厂商说的流式？", a: "打开网络面板或 curl 接口，看模型还没生成完时是否有分片到达。最后一次性返回 JSON 不是流式，哪怕界面做了打字动画。" },
        { q: "AI 模板最容易藏的缺口是什么？", a: "计费链路的验签与幂等，以及 AI 链路的供应商错误透传。两者在演示里都正常，第一次遇到伪造请求或无效 API key 就露馅。" },
      ],
    },
  },
  {
    slug: "white-label-saas-source-delivery",
    date: "2026-11-07",
    category: "Guide",
    readingMinutes: 9,
    tags: ["white label SaaS boilerplate", "boilerplate generator", "source code without vendor branding", "configurable starter"],
    title: {
      en: "White-Label SaaS Source Delivery: What Real Pruning Has to Get Right",
      zh: "白标 SaaS 源码交付：真裁剪必须做对的几件事",
    },
    excerpt: {
      en: "Selling generated source code is a delivery problem, not a marketing claim. The failure modes are dead links, leaked branding, leaked generator code and a paywall that follows the customer home.",
      zh: "卖生成的源码是交付问题，不是宣传话术。常见翻车点：死链、品牌残留、把生成器一起打包、门禁跟着客户回家。",
    },
    body: {
      en: `"White label" is easy to write on a landing page and surprisingly hard to deliver. When the ZIP IS the product, four things have to be true.

## 1. Pruning is real, not a feature flag

Unselected modules must be absent from the archive, not merely disabled behind an env flag. A customer who unchecked an admin console should not receive its routes, its nav entries or its imports. In this project the skip list is declarative and every generated package is type-checked; 18 representative configurations are downloaded and compiled in CI.

One hard-learned rule: a rewrite step may only modify files that are ALREADY in the ZIP. An early version fell back to reading pruned files from disk, quietly re-adding them to the customer package.

## 2. Brand removal includes generated pages

Home, pricing, sitemap, robots and legal pages in a customer build are generated from that customer's own configuration, not inherited from our marketing site. Even a comment inside a generated template containing our old brand name used to break the whole matrix. Assertions now scan customer pages for our brand, competitor brand names, dead links and generator files.

## 3. Never ship the factory

The ZIP contains the product, not the machine that makes it. The generator directory, the builder route and the generate API are removed. A purchase grants one generated project, not a license to run the factory.

## 4. The paywall must not follow the customer

Our site requires an HMAC license key, an active subscription or an email claim before it emits a source ZIP, and production fails closed even when the signing secret is missing. The customer's own project ships with that gate defaulted to off — in source, not just in .env.example, which nobody copies. Anonymous visitors can still take a source-free preview: the file inventory and design tokens, with a signed visitor token and a two-bucket quota.

## Verify it yourself

Unzip the build and search for the vendor's brand, the generator directory and any link to a route that does not exist. Then run the type checker and a production build inside the extracted project. If any of those fail, the white-label claim was marketing.`,
      zh: `「白标」写在落地页上很容易，真正交付却意外地难。当 ZIP 本身就是商品时，有四件事必须成立。

## 1. 裁剪是真的，不是一个 feature flag

未选中的模块应当从压缩包里消失，而不是靠 env 开关禁用。客户取消了管理员后台，就不该收到它的路由、导航项或 import。本项目用声明式裁剪清单，每个生成包都做类型检查，CI 会下载并编译 18 组代表性配置。

一条踩过坑的规则：改写步骤只能修改 ZIP 里已经存在的文件。早期版本会回退到磁盘读取被剪掉的文件，悄悄把它们重新塞回客户包。

## 2. 品牌清理要覆盖生成的页面

客户构建里的首页、定价、sitemap、robots、法律页都由客户自己的配置生成，而不是继承本站的营销页。曾经连生成模板里一句带旧品牌词的注释都能打挂整个矩阵。现在断言会扫描客户页面的品牌词、竞品名、死链与生成器文件。

## 3. 不要把工厂一起打包

ZIP 里是商品，不是造商品的机器。生成器目录、builder 路由、generate 接口都会被移除。买一份 = 拿到一次生成的项目，不是获得运行工厂的许可。

## 4. 门禁不能跟着客户回家

本站发出源码 ZIP 前要求 HMAC 授权码、有效订阅或邮箱认领，且即使签名密钥没配，生产环境也恒开门禁。客户工程里这道门禁在源码层面默认关闭——不只是写在 .env.example 里，因为没人会照抄示例。匿名访客仍能拿无源码预览：文件清单 + 设计令牌，用签名访客令牌与双桶额度限流。

## 自己动手验

解压后搜索厂商品牌、生成器目录，以及任何指向不存在路由的链接；再在解压目录里跑类型检查与生产构建。任何一项失败，白标就只是营销话术。`,
    },
    faq: {
      en: [
        { q: "Does the generated ZIP contain the generator itself?", a: "No. The generator modules, the builder page and the generate API are pruned. Buying one build gives you one project, not the factory that produces builds." },
        { q: "Is the license gate active in the downloaded project?", a: "No. The customer's own lib/env.ts is rewritten so licenseGateMode() defaults to off in source. Only this site enforces the paywall, and it fails closed in production." },
        { q: "What is in the anonymous preview?", a: "A source-free package: the complete file inventory for your configuration, design tokens and a README-style PREVIEW.md. No source files. It is rate-limited by a signed visitor token plus a trusted-network bucket." },
      ],
      zh: [
        { q: "生成的 ZIP 里含生成器本身吗？", a: "不含。生成器模块、builder 页面、generate 接口都会被剪掉。买一份构建 = 拿到一个项目，不是拿到生产构建的工厂。" },
        { q: "下载到的工程里门禁是开着的吗？", a: "不是。客户的 lib/env.ts 会被改写，让 licenseGateMode() 在源码里默认关闭。只有本站执行这道门禁，并且生产环境失败即关闭放行。" },
        { q: "匿名预览包里有什么？", a: "无源码的包：该配置的完整文件清单、设计令牌与说明用的 PREVIEW.md，不含源码文件。额度由签名访客令牌与可信网络双桶共同限制。" },
      ],
    },
  },
  {
    slug: "saas-billing-payment-gateways",
    date: "2026-11-07",
    category: "Billing",
    readingMinutes: 9,
    tags: ["Creem Next.js boilerplate", "PayPal SaaS starter", "Waffo Pancake Next.js", "Lemon Squeezy vs Stripe SaaS"],
    title: {
      en: "Beyond Stripe: Choosing a Payment Gateway for a Global SaaS",
      zh: "不止 Stripe：全球 SaaS 该怎么选支付通道",
    },
    excerpt: {
      en: "Six adapters, one webhook contract. What Merchant of Record actually changes, which fields come from your contract, and how to test the whole matrix without six sandbox accounts.",
      zh: "六个适配器、一份 Webhook 契约。Merchant of Record 到底改变了什么、哪些字段必须来自合同、以及不用六个沙箱账户怎么测。",
    },
    body: {
      en: `Most starters wire Stripe and stop. That is fine until you sell to a market where cards are not the default, or you discover that handling VAT as a sole founder is a second job.

## Merchant of Record vs payment processor

A processor (Stripe, PayPal, Waffo Acquiring) moves money; you still own tax calculation, invoicing and compliance. A Merchant of Record (Waffo Pancake, Lemon Squeezy, Creem in some configurations) is the legal seller: it handles sales tax/VAT, invoices and often refunds. For a solo founder selling globally without an entity, that difference is the whole reason to pick one.

## The six adapters

This project ships Waffo Pancake (default, MoR), Waffo Acquiring, Stripe, Creem, PayPal and Lemon Squeezy, plus none for bring-your-own billing. Selecting one in the Builder prunes the other adapters from the ZIP. All six implement the same interface: create a checkout, create a customer portal session, and verify a webhook.

Contract fields are supplied by env, never invented by the code: Waffo Acquiring's merchant id, return/notify URLs, product ids and signing mode all come from WAFFO_ACQUIRING_* variables copied from your merchant agreement. If one is missing, the config layer throws an error naming the variable.

## One verification contract, six implementations

Every adapter throws on a missing, invalid or malformed signature; the route turns that into 400. Returning an empty list means only "validly signed but unhandled" and becomes 200 with an ignored flag. Event ids are deduplicated before any license or plan write. An earlier revision returned an empty list on verification failure — a forged request was accepted with 200 across five gateways. That contract is now covered by an offline probe.

## How to test without six sandbox accounts

Four layers: a config self-check that only reports missing variables (never secret values), the offline signature probe (npm run probe:webhook) that asserts 400/200 on valid, missing, corrupted and malformed requests, per-gateway sandbox contrast runs, and one real small-value purchase before launch. The first two need no credentials at all and belong in CI; the last two need each provider's sandbox keys. See docs/payment-testing.md for the full matrix.`,
      zh: `多数模板接完 Stripe 就停了。等你卖到卡不是默认支付方式的市场，或发现一个人算 VAT 等于第二份工作时，问题就来了。

## Merchant of Record 与支付处理商的区别

处理商（Stripe、PayPal、Waffo Acquiring）负责搬钱，税务计算、开票与合规仍归你。Merchant of Record（Waffo Pancake、Lemon Squeezy，部分配置下的 Creem）是法律意义上的卖方，负责销售税／VAT、发票，通常还有退款。对没有公司主体却要全球收款的独立开发者，这个差别就是选择它的全部理由。

## 六个适配器

本项目带 Waffo Pancake（默认，MoR）、Waffo Acquiring、Stripe、Creem、PayPal、Lemon Squeezy，另有 none 供自带计费。在 Builder 里选一个，其余适配器会从 ZIP 中剪掉。六个实现同一份接口：创建结账、创建客户门户会话、验签 Webhook。

合同字段一律由 env 提供，代码绝不代填：Waffo Acquiring 的商户号、return/notify URL、商品 id、签名模式都来自 WAFFO_ACQUIRING_* 变量，需从商户合同复制。缺任何一个，配置层会抛出指名变量的错误。

## 一份验签契约，六份实现

每个适配器在签名缺失、无效或格式损坏时都抛错，路由转成 400。返回空列表只表示「合法已验签但无需处理」，对应 200 加 ignored 标记。写 license 或套餐之前按事件 id 去重。早期版本在验签失败时也返回空列表，等于五个网关都用 200 接受了伪造请求；现在这份契约由离线探测脚本守着。

## 没有六个沙箱账户怎么测

四层：只报告缺失变量（不返回密钥）的配置自检；离线验签探测（npm run probe:webhook），对合法、缺失、篡改、损坏四类请求断言 400/200；逐网关沙箱对照；上线前一次真实小额购买。前两层完全不需要凭据，应该进 CI；后两层才要各家的沙箱密钥。完整矩阵见 docs/payment-testing.md。`,
    },
    faq: {
      en: [
        { q: "Which gateways are supported?", a: "Waffo Pancake (default Merchant of Record), Waffo Acquiring, Stripe, Creem, PayPal and Lemon Squeezy, plus none. Only the selected adapter ships in a generated ZIP." },
        { q: "Do I need a company entity to sell globally?", a: "Not with a Merchant of Record — Waffo Pancake or Lemon Squeezy acts as the legal seller and handles tax. With a plain processor you own tax, invoicing and compliance yourself." },
        { q: "Does the code fill in missing contract fields?", a: "No. Merchant ids, price ids, notify URLs and signing modes must come from env or your merchant agreement. A missing required variable produces an error naming it, rather than a plausible-looking placeholder." },
      ],
      zh: [
        { q: "支持哪些支付通道？", a: "Waffo Pancake（默认 Merchant of Record）、Waffo Acquiring、Stripe、Creem、PayPal、Lemon Squeezy，以及 none。生成的 ZIP 只包含选中的那一个适配器。" },
        { q: "全球收款必须有公司主体吗？", a: "用 Merchant of Record 不必——Waffo Pancake 或 Lemon Squeezy 作为法律卖方处理税务。用普通处理商，税务、开票与合规由你自己承担。" },
        { q: "代码会代填缺失的合同字段吗？", a: "不会。商户号、价格 id、notify URL、签名模式必须来自 env 或商户合同。缺少必填变量时会抛出指名变量的错误，而不是塞一个看起来合理的占位值。" },
      ],
    },
  },
  {
    slug: "agent-ready-saas-docs",
    date: "2026-11-07",
    category: "GEO",
    readingMinutes: 10,
    tags: ["AGENTS.md boilerplate", "llms.txt SaaS starter", "MCP server boilerplate", "generative engine optimization"],
    title: {
      en: "Agent-Ready SaaS: The Machine-Readable Docs Answer Engines Actually Read",
      zh: "Agent-Ready SaaS：答案引擎真正会读的机器可读文档",
    },
    excerpt: {
      en: "AGENTS.md, llms.txt, OpenAPI, MCP and structured data are not a badge. Here is the read order, what belongs in the downloaded ZIP, and how to measure it with AI referral traffic.",
      zh: "AGENTS.md、llms.txt、OpenAPI、MCP 与结构化数据不是勋章。讲清读取顺序、哪些该进下载包，以及怎么用 AI 引荐流量衡量效果。",
    },
    body: {
      en: `Generative engine optimization is not a keyword trick. It is whether an AI system can find a stable, quotable, machine-readable statement about your product without guessing.

## The read order

1. llms.txt — a short, curated overview with links, written for an LLM with a limited context window.
2. llms-full.txt — the long-form facts: full configuration enums, pruning rules, API surface and honest limitations.
3. OpenAPI 3.1 — exact request and response schemas for every public route.
4. MCP endpoint — a stateless JSON-RPC tool an agent can call to obtain the current configuration and even a build.
5. Per-page JSON-LD — Organization, WebSite, SoftwareApplication/OfferCatalog, FAQPage and BlogPosting.

Robots should explicitly allow the machine-readable routes for AI crawlers, and the sitemap should list them. An FAQPage graph matters because answer engines quote question-and-answer pairs, not marketing paragraphs.

## What belongs in the downloaded ZIP

The customer's generated project gets its own AGENTS.md (repo contract and definition of done), a style-specific design.md, scoped rules with globs, Cursor rules, CLAUDE.md and up to twelve skills playbooks — all rendered from one shared spec so they never drift from shipkit.config.json. Our site's llms.txt and MCP endpoint are site-only and must NOT leak into the customer package.

## Structured content, not keyword stuffing

Every article here carries a visible FAQ section built from the same structured Q&A data that produces its FAQPage JSON-LD. The byline and publisher are the company name, not an invented person. Dates, canonical URLs, inLanguage and keywords are explicit. A Markdown variant of each article is published so a crawler can read the text without rendering the page.

## Honest limitations are GEO assets

Vague claims get ignored; specific limits get quoted. State plainly that SMTP is not implemented, that the local auth path has no MFA or OAuth, that MAIL_PROVIDER defaults to none, that the external error sink is optional, that the Cloudflare target needs Supabase because node:sqlite has no writable disk on Workers, and that the refund window is a plain 14 days (delivery events are evidence, not a condition). A machine-readable limitation is more trustworthy than a paragraph of adjectives — and it must be updated the moment the code changes.

## How to measure it

Keyword volume is the wrong metric for GEO. Track AI referral traffic in analytics, brand mentions and share of voice in AI answers, and whether the cited page is one of the machine-readable surfaces. If an answer engine cannot cite you, more landing pages will not fix it.`,
      zh: `生成式引擎优化（GEO）不是关键词技巧，而是 AI 系统能否在不猜测的前提下，找到稳定、可引用、机器可读的产品陈述。

## 读取顺序

1. llms.txt——给上下文窗口有限的模型看的精要概览与链接。
2. llms-full.txt——长文事实：完整配置枚举、裁剪规则、API 面与诚实限制。
3. OpenAPI 3.1——每个公开路由精确的请求／响应 schema。
4. MCP 端点——agent 可调用的无状态 JSON-RPC 工具，用于取当前配置甚至取一个构建。
5. 页面级 JSON-LD——Organization、WebSite、SoftwareApplication／OfferCatalog、FAQPage、BlogPosting。

robots 应显式允许 AI 爬虫访问机器可读路由，sitemap 也应列出它们。FAQPage 图尤其重要：答案引擎引用的是问答对，不是营销段落。

## 哪些该进下载包

客户生成的工程会有自己的 AGENTS.md（仓库契约与完成定义）、锁定风格的 design.md、带 glob 的 scoped rules、Cursor rules、CLAUDE.md，以及最多 12 份 skills playbook——全部由同一份 spec 渲染，不会与 shipkit.config.json 漂移。本站的 llms.txt 与 MCP 端点是站点专属，绝不能泄漏进客户包。

## 结构化内容，不是堆关键词

本站每篇文章都有可见 FAQ 区块，数据与生成 FAQPage JSON-LD 的来源完全相同。署名与 publisher 用公司名，不是虚构的人。日期、canonical、inLanguage、keywords 都显式给出。每篇还发布一份 Markdown 变体，让爬虫不必渲染页面就能读到正文。

## 诚实的限制是 GEO 资产

含糊的宣传会被忽略，具体的限制反而会被引用。明确写出：SMTP 未实现、本地登录路径没有 MFA 与 OAuth、MAIL_PROVIDER 默认是 none、外部错误上报是可选配置、Cloudflare 目标因 Workers 没有可写磁盘而必须配 Supabase、退款是纯 14 天窗口（下载事件只是证据，不是条件）。一条机器可读的限制，比一整段形容词更可信——但代码一变，这条限制也必须同步更新。

## 怎么衡量

关键词量不是 GEO 的指标。要看分析里的 AI 引荐流量、AI 回答中的品牌提及与 SOV，以及被引用的页面是否属于机器可读面。如果答案引擎无法引用你，多做几个落地页也修不好。`,
    },
    faq: {
      en: [
        { q: "What is the difference between llms.txt and llms-full.txt?", a: "llms.txt is a short curated overview with links for a limited context window; llms-full.txt carries the long-form facts such as configuration enums, API schemas, pruning rules and honest limitations." },
        { q: "Do generated customer projects ship our llms.txt and MCP endpoint?", a: "No. Those are site-only and are pruned from every customer ZIP. The generated project ships its own AGENTS.md, design.md, scoped rules, Cursor rules, CLAUDE.md and skills playbooks instead." },
        { q: "How should I measure GEO instead of keyword volume?", a: "Track AI referral traffic (chatgpt.com, perplexity.ai, gemini.google.com), brand mentions and share of voice in AI answers, and whether the cited URL is a machine-readable surface such as an FAQ or a Markdown variant." },
      ],
      zh: [
        { q: "llms.txt 和 llms-full.txt 有什么区别？", a: "llms.txt 是给有限上下文看的精要概览与链接；llms-full.txt 承载长文事实，如配置枚举、API schema、裁剪规则与诚实限制。" },
        { q: "客户工程里会带上本站的 llms.txt 和 MCP 端点吗？", a: "不会。它们是站点专属，每个客户 ZIP 都会剪掉。生成的工程改为携带自己的 AGENTS.md、design.md、scoped rules、Cursor rules、CLAUDE.md 与 skills playbook。" },
        { q: "不用关键词量的话，GEO 该看什么指标？", a: "看 AI 引荐流量（chatgpt.com、perplexity.ai、gemini.google.com）、AI 回答里的品牌提及与 SOV，以及被引用的 URL 是否是 FAQ、Markdown 变体这类机器可读面。" },
      ],
    },
  },
];

export function getAllPosts(): Post[] {
  return [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
}

/** Resolve a canonical slug or one of its legacy aliases. */
export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug || (p.aliases ?? []).includes(slug));
}

/** Canonical + legacy slugs, so old links still resolve to a static page. */
export function allPostSlugs(): string[] {
  return POSTS.flatMap((p) => [p.slug, ...(p.aliases ?? [])]);
}

export function postField(
  post: Post,
  lang: Lang,
  field: "title" | "excerpt" | "body",
): string {
  return post[field][lang] ?? post[field].en ?? "";
}

export function postFaq(post: Post, lang: Lang): FaqItem[] {
  return post.faq[lang] ?? post.faq.en ?? [];
}

/**
 * The language the BODY is actually written in. Titles / excerpts may be
 * translated while the body still falls back to English, so JSON-LD
 * `inLanguage` and Content-Language must follow the body, never the UI
 * locale — otherwise answer engines quote an English article as Japanese.
 */
export function postContentLang(post: Post, lang: Lang): Lang {
  return post.body[lang] ? lang : "en";
}

/** Markdown representation shared by /blog/<slug>/md and ?format=md. */
export function buildPostMarkdown(
  post: Post,
  lang: Lang,
  company = "marketit",
): string {
  const contentLang = postContentLang(post, lang);
  const lines: string[] = [
    `# ${postField(post, lang, "title")}`,
    "",
    `> ${postField(post, lang, "excerpt")}`,
    "",
    `- Author / publisher: ${company} (company)`,
    `- Published: ${post.date}`,
  ];
  if (post.updated) lines.push(`- Updated: ${post.updated}`);
  lines.push(
    `- Canonical: /blog/${post.slug}`,
    `- Category: ${post.category}`,
    `- Tags: ${post.tags.join(", ")}`,
    `- Language: ${contentLang}`,
    "",
    postField(post, lang, "body"),
  );
  const faq = postFaq(post, lang);
  if (faq.length > 0) {
    lines.push("", "## FAQ", "");
    for (const it of faq) lines.push(`### ${it.q}`, "", it.a, "");
  }
  lines.push(
    "---",
    "",
    `Source: ${company}. See /llms.txt and /llms-full.txt for the full machine-readable product description.`,
    "",
  );
  return lines.join("\n");
}

/** Same-category first, then newest. Powers the internal-link block. */
export function relatedPosts(post: Post, limit = 3): Post[] {
  const others = getAllPosts().filter((p) => p.slug !== post.slug);
  const same = others.filter((p) => p.category === post.category);
  const rest = others.filter((p) => p.category !== post.category);
  return [...same, ...rest].slice(0, limit);
}
