import type { Lang } from "@/lib/i18n-core";

// Editorial content for /blog. Every post is published under the company name
// make1day.dev (see the BlogPosting JSON-LD and the byline in the page).
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

Next.js 15 (App Router) + TypeScript + Tailwind is the default for a reason: the tooling, hiring pool and examples already live there. Pair it with Supabase for auth and Postgres. For billing, decide early whether you want one gateway or a switchable layer — a global launch often needs a Merchant of Record plus a fallback provider. make1day.dev ships six adapters (Waffo Pancake by default, plus Waffo Acquiring, Stripe, Creem, PayPal and Lemon Squeezy) behind one checkout and webhook contract.

## Add the one thing that is yours

The common mistake is over-building the demo. Ship ONE real AI feature behind auth and a plan gate — a streaming chat endpoint, document Q&A, a summariser — and leave the rest as honest scaffolding. Customers buy the 40% specific to them.

## Generate instead of deleting

If you know up front which modules you need, a configurator that prunes unselected code beats a starter you have to strip by hand. In make1day.dev the Builder picks auth, gateway, AI providers, features, deploy target and visual style; the server returns a ZIP containing only those modules. Eighteen representative combinations are downloaded and type-checked in CI, and the ZIP is brand-free: our marketing pages and the generator itself are removed.

## Ship, then charge

Start from a free or preview tier, wire a test checkout, and only ask for money once customers get value. The scaffolding should take you from configuration to a deployed, billable app in an afternoon — not a quarter.`,
      zh: `在 2026 年做 SaaS，你依然要解决那 60% 所有创始人都会撞上的通用问题：注册、数据库、计费、登录后的页面。能交付的人和卡住的人，差别几乎不在创意，而在于多快停止重复造这 60% 的轮子。

## 先从通用部分入手

每个 SaaS 都需要同样的主干：登录鉴权、带行级安全的数据库、带 Webhook 的订阅计费、控制台、部署方案。这些都不是差异化优势，而是入场费。一次性交掉，并且用一套你能读懂、能改的基础设施。

## 选一套已经具备主干的技术栈

Next.js 15（App Router）+ TypeScript + Tailwind 成为默认，是因为工具链、人才池和示例都集中在这里。再配 Supabase 做登录与 Postgres。计费要早点决定：只接一家，还是做可切换层——面向全球发布时，通常需要一个 Merchant of Record 加备用通道。make1day.dev 用同一套结账与 Webhook 契约接了六个适配器（默认 Waffo Pancake，另有 Waffo Acquiring、Stripe、Creem、PayPal、Lemon Squeezy）。

## 加上只属于你的那一个功能

常见错误是把演示堆得过满。只交付一个真实的 AI 功能，放在登录与套餐权限之后——流式对话、文档问答、摘要器——其余保持诚实的脚手架。客户买的是那 40% 专属于你的东西。

## 用生成代替手工删减

如果你一开始就知道要哪些模块，「按配置真裁剪」的生成器比「买回来再手删」的模板更省事。make1day.dev 的 Builder 选择登录、支付、AI 供应商、功能、部署目标与视觉风格，服务端只把选中的模块打进 ZIP。CI 会下载 18 组代表性组合并逐个做类型检查；ZIP 是白标的——本站营销页与生成器本身都会被剪掉。

## 先上线，再收费

从免费或预览档起步，跑通一次测试结账，等客户真正获得价值后再收费。脚手架应当让你从选配置到一个已部署、可计费的应用只用一个下午，而不是一个季度。`,
    },
    faq: {
      en: [
        { q: "How long does it take to build a SaaS with Next.js?", a: "The commodity backbone (auth, database, billing, dashboard) is what takes weeks. With a starter it is an afternoon of configuration; the remaining time is your actual product, which no template can shorten." },
        { q: "Do I need Supabase?", a: "No. make1day.dev switches between Supabase (auth + Postgres) and a local SQLite store depending on whether SUPABASE_SERVICE_ROLE_KEY is set. SQLite is for local development — the local auth path has no MFA, OAuth or session rotation, and does not persist on serverless." },
        { q: "Which payment gateway should I start with?", a: "If you sell globally without a company entity, a Merchant of Record such as Waffo Pancake or Lemon Squeezy removes tax handling. If you already have a Stripe account, use Stripe. The generated app keeps checkout and webhooks behind one provider-agnostic contract, so switching later is a config change." },
      ],
      zh: [
        { q: "用 Next.js 做一个 SaaS 要多久？", a: "真正耗时的是通用主干（登录、数据库、计费、控制台），通常是几周。用模板后这部分只是半天配置；剩下的时间是你自己的产品，模板无法替你缩短。" },
        { q: "必须用 Supabase 吗？", a: "不必。make1day.dev 按是否配置 SUPABASE_SERVICE_ROLE_KEY 在 Supabase 与本地 SQLite 之间切换。SQLite 只适合本地开发：本地登录路径没有 MFA、OAuth、会话轮换，在 serverless 上也不持久。" },
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
- make1day.dev — a configurable generator, not a fixed repository. You pick the modules and the server returns a pruned, brand-free ZIP. The differentiator is delivery infrastructure, not another AI feature.

## The delivery layer nobody else needs

Because the product IS the download, this project has to solve things a fixed starter does not: an HMAC license key or subscription gate that fails closed in production, a skeleton-only anonymous preview with signed visitor tokens, six payment adapters with one verification contract, five-language copy, a Supabase/SQLite switch driven purely by env, and a matrix that downloads and type-checks every representative build. None of that is an AI capability — it is what makes selling configurable source code possible.

## Honest limits

This is an honest starter, not a batteries-included platform: the consoles do have profile and role mutation endpoints and a billing portal, but the local auth path has no MFA, OAuth or session rotation; SMTP is not implemented (Resend, SendGrid, Postmark and Mailgun REST APIs, a custom HTTP mailer or a safe no-op); the mail retry queue and the optional external error sink exist but require an operator-configured cron and \`ERROR_REPORT_URL\`; download / activation events are logged with hashed emails, while the refund rule stays a plain 14-day window. Multi-tenancy ships SQL and helpers, but you must scope your own domain tables. If you need a batteries-included B2B tenant model from day one, Makerkit or Supastarter go deeper.

No starter is universally best. Choose against the 40% that is yours.`,
      zh: `如果你是因为搜「ShipFast 替代品」或「Makerkit 替代品」来到这里，你正在权衡大家推荐的同几个名字。有用的答案不是功能清单，而是这些产品从哪一步开始不再可比。

## 已经变成基线的部分

到 2026 年下半年，LLM 流式、多模型、token／credit 计量、RAG、MCP 接口、AGENTS.md 与 llms.txt，已经是任何 AI-first 模板的入场配置。公开选型的 checklist 甚至覆盖 MCP、tool calling、用量计费、队列、evals、可观测性与护栏。如果厂商把其中任何一项当成独门突破来宣传，值得怀疑。

## 真正还有差别的地方

- ShipFast——精简、强主张。最快做出落地页，表面积最小，适合打算大幅偏离的人。
- Makerkit——「电池全配」、偏企业。结构更多，从第一天就有真实的组织／角色复杂度。
- Supastarter——Supabase 原生；整个世界都是 Supabase 时最贴合，日后换后端就没那么灵活。
- 179–249 美元档的 AI-first 套件——流式、credit 计费、RAG、agent 文档，通常以固定仓库 + GitHub 访问权出售。
- make1day.dev——可配置生成器，不是固定仓库。你选模块，服务端返回真裁剪、品牌中性的 ZIP。差异在交付基础设施，而不是多一个 AI 功能。

## 别人不需要的交付层

因为「下载包就是商品」，这个项目必须解决固定模板不必解决的问题：生产环境恒开的 HMAC 授权码／订阅门禁、匿名无源码预览包与签名访客令牌、共用一份验签契约的六个支付适配器、五语文案、按 env 切换的 Supabase／SQLite 双后端，以及会下载并逐个类型检查每组代表性构建的矩阵。这些都不是 AI 能力，而是「把可配置源码当商品卖」的前提。

## 诚实的限制

这是一套诚实标注边界的模板，不是开箱即用的完整平台：后台已有资料修改、角色管理与账单门户；本地登录路径没有 MFA、OAuth 与会话轮换；SMTP 明确未实现（只有 Resend、SendGrid、Postmark、Mailgun 的 REST、自定义 HTTP mailer 或安全空操作）；邮件重试队列与可选外部错误上报已存在，但需要运维方配置定时任务与 \`ERROR_REPORT_URL\`；下载与兑换事件会以哈希邮箱记录，退款规则仍是纯 14 天窗口。多租户附带 SQL 与助手函数，但你自己的业务表要自己做租户隔离。若第一天就要开箱即用的 B2B 租户模型，Makerkit 或 Supastarter 更完整。

没有哪个模板是通用最佳，只有对你那 40% 而言的最佳。`,
    },
    faq: {
      en: [
        { q: "Is streaming AI output a differentiator in 2026?", a: "No. Streaming, multi-provider chat, token metering, RAG, MCP and AGENTS.md are baseline across paid AI starters and many free ones. Compare on delivery model, honest limits and what you actually have to write yourself." },
        { q: "What does a generator do that a fixed repository cannot?", a: "It removes unselected modules from the downloaded source instead of leaving dead code, rewrites navigation so no dead links remain, and produces a brand-free ZIP per configuration. A fixed repository gives everyone the same tree." },
        { q: "Is make1day.dev open source?", a: "The site and its documentation are public; the generated template is a paid, licensed product delivered as source. Each ZIP ships an MIT LICENSE file and the customer is free to rename and restyle it." },
      ],
      zh: [
        { q: "2026 年流式 AI 输出还算差异点吗？", a: "不算。流式、多模型对话、token 计量、RAG、MCP、AGENTS.md 已是付费 AI 模板乃至很多免费模板的基线。要比就比交付形态、诚实边界，以及你到底还要亲手写多少。" },
        { q: "生成器比固定仓库多做了什么？", a: "它把未选中的模块从源码里真正删掉（而不是留死代码），改写导航避免死链，并按配置产出品牌中性的 ZIP。固定仓库给所有人的是同一棵树。" },
        { q: "make1day.dev 是开源的吗？", a: "本站与文档是公开的；生成的模板是购买后以源码交付的授权产品。每个 ZIP 都带 MIT LICENSE 文件，客户可自由改名与换肤。" },
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

Our site requires an HMAC license key, an active subscription or an email claim before it emits a source ZIP, and production fails closed even when the signing secret is missing. The customer's own project ships with that gate defaulted to off — in source, not just in .env.example, which nobody copies. Anonymous visitors can still take the skeleton preview: the project skeleton, file inventory and design tokens, with a signed visitor token and a two-bucket quota.

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
        { q: "What is in the anonymous preview?", a: "A runnable skeleton preview: configs, a themed placeholder page, the complete file inventory, design tokens and a README-style PREVIEW.md - no application source. It is rate-limited by a signed visitor token plus a trusted-network bucket." },
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
  {
    slug: "waffo-vs-creem-payment-gateways",
    date: "2026-11-08",
    category: "Comparison",
    readingMinutes: 8,
    tags: ["Waffo vs Creem", "SaaS payment gateway comparison", "Merchant of Record", "indie SaaS payments"],
    title: {
      en: "Waffo vs Creem: Which Payment Gateway for Your SaaS in 2026?",
      zh: "Waffo vs Creem：2026 年你的 SaaS 该选哪个支付网关？",
    },
    excerpt: {
      en: "A practical comparison of Waffo and Creem for indie SaaS founders — fees, onboarding, global coverage, webhooks and developer experience — without the marketing spin.",
      zh: "面向独立 SaaS 创始人的 Waffo 与 Creem 务实对比——费率、入驻、全球覆盖、Webhook 与开发体验，去掉营销滤镜。",
    },
    body: {
      en: `Choosing a payment gateway is one of the few decisions that is hard to reverse later: once customers, invoices and tax filings are tied to a provider, switching is painful. This comparison looks at two merchant-of-record-style options that indie founders keep comparing — Waffo and Creem.

## Two different product shapes

Waffo is not a single product. In the make1day.dev adapters it ships in two flavours: **Pancake** (a Merchant of Record / global checkout, docs.waffo.ai) and **Acquiring** (a SE-Asia acquiring gateway, waffo.com/docs, RSA-signed webhooks). Creem is a hosted checkout plus a Merchant of Record, with a Stripe-like API and webhooks. The practical difference: Waffo Acquiring is built for a specific regional acquiring flow, while Creem and Waffo Pancake are closer to "drop-in global checkout".

## Fees and payout

Both are MoR-ish, which means they take a higher cut than a raw processor because they absorb sales tax / VAT and compliance. Exact numbers move constantly, so verify on each provider's pricing page before you commit. The thing that matters more than the headline percentage is the payout schedule and whether refunds and chargebacks are netted transparently.

## Onboarding and KYC

Creem's onboarding is aimed at digital products and is generally quick for software. Waffo Pancake onboarding is straightforward for a solo founder; Waffo Acquiring requires the merchant contract fields (merchant info, user info, payment info, currency, order description) that the make1day.dev integration reads from env. Neither is instant if your product category triggers extra review.

## Global coverage and tax

This is where a Merchant of Record earns its fee. If you sell worldwide, an MoR registers and remits VAT / GST / sales tax on your behalf. Both Waffo (Pancake) and Creem position themselves here. Acquiring-only setups shift that tax burden back to you.

## Developer experience

Both expose a hosted checkout so you never touch card data. Creem's API is the more familiar Stripe-like surface. Waffo Pancake uses a Store-Slug or API-Key auth and a checkout session endpoint; Waffo Acquiring signs requests with RSA and needs the platform public key for webhook verification. If your stack already has a unified checkout + webhook contract (like make1day.dev's six adapters behind one interface), the per-gateway differences stay contained.

## Which to pick

Pick Creem if you want the fastest Stripe-like integration and a hosted dashboard. Pick Waffo Pancake if you want an MoR with a simple global checkout. Pick Waffo Acquiring only if you already have a regional acquiring contract. And if you are not sure, build behind a switchable layer so the gateway is a config change, not a rewrite.`,
      zh: `支付网关是少数难以回头的决策：一旦客户、发票与税务归档绑定了某个供应商，更换成本很高。这篇对比看独立创始人常拿来比较的两种「类似商户登记（MoR）」方案——Waffo 与 Creem。

## 两种不同形态

Waffo 不是一个单一产品。在 make1day.dev 的适配器里它有两种形态：**Pancake**（商户登记 / 全球结账，docs.waffo.ai）与 **Acquiring**（东南亚收单网关，waffo.com/docs，RSA 签名 Webhook）。Creem 是托管结账加商户登记，提供类 Stripe 的 API 与 Webhook。实际差别在于：Waffo Acquiring 为特定区域的收单流程而建，而 Creem 与 Waffo Pancake 更接近「即插即用的全球结账」。

## 费率和结算

两者都偏 MoR，意味着它们比裸处理器抽成更高，因为替你承担了销售税 / VAT 与合规。具体数字经常变动，落地前务必在各家定价页核实。比表面百分比更重要的是结算周期，以及退款、拒付是否透明地净额结算。

## 入驻与 KYC

Creem 的入驻面向数字商品，对软件通常很快。Waffo Pancake 对独立创始人也很容易；Waffo Acquiring 则需要商户合同字段（商户信息、用户信息、支付信息、币种、订单描述），make1day.dev 的集成会从 env 读取这些。若你的品类触发额外审核，两者都不是即时的。

## 全球覆盖与税务

这是 MoR 收费的价值所在。若你面向全球销售，MoR 会替你注册并代缴 VAT / GST / 销售税。Waffo（Pancake）与 Creem 都以此定位。仅收单的接法则把税务负担推回给你。

## 开发体验

两者都提供托管结账，因此你无需碰卡号数据。Creem 的 API 是更熟悉的类 Stripe 表面。Waffo Pancake 用 Store-Slug 或 API-Key 鉴权与结账会话端点；Waffo Acquiring 用 RSA 给请求签名，并需要平台公钥验证 Webhook。若你的技术栈已有统一的结账 + Webhook 契约（如 make1day.dev 在单一接口后接的六个适配器），各网关差异就被隔离了。

## 该选哪个

想要最快的类 Stripe 接入与托管后台，选 Creem。想要 MoR + 简洁全球结账，选 Waffo Pancake。若你已有区域收单合同，才选 Waffo Acquiring。若还不确定，就建在可切换的层之上，让网关成为配置项而非重写。`,
    },
    faq: {
      en: [
        { q: "Is Waffo or Creem cheaper?", a: "Both are merchant-of-record style and take a higher cut than a raw processor because they handle sales tax and compliance. Fees change often — verify on each provider's pricing page rather than trusting a comparison snapshot." },
        { q: "Can I switch gateways later?", a: "If your checkout and webhook logic sit behind one unified interface, switching is a config change. If you hard-coded one provider, it is a rewrite. Prefer the switchable layer." },
        { q: "Does Waffo handle VAT like Creem?", a: "Waffo Pancake and Creem both act as Merchant of Record and remit tax for you. Waffo Acquiring is a regional acquiring gateway and shifts tax compliance back to the merchant." },
      ],
      zh: [
        { q: "Waffo 和 Creem 哪个更便宜？", a: "两者都是商户登记（MoR）模式，比裸处理器抽成更高，因为它们承担销售税与合规。费率经常变动——请以各家定价页为准，别轻信对比快照。" },
        { q: "以后能换网关吗？", a: "若结账与 Webhook 逻辑在统一接口之后，更换只是配置项；若硬编码了某一家，则是重写。优先选可切换的层。" },
        { q: "Waffo 也像 Creem 一样处理 VAT 吗？", a: "Waffo Pancake 与 Creem 都是商户登记，替你代缴税。Waffo Acquiring 是区域收单网关，税务合规责任回到商户身上。" },
      ],
    },
  },
  {
    slug: "waffo-payment-setup-tutorial",
    date: "2026-11-08",
    category: "Tutorial",
    readingMinutes: 7,
    tags: ["Waffo payment setup", "Waffo Pancake tutorial", "Next.js SaaS checkout", "Waffo webhook"],
    title: {
      en: "Set Up Waffo Payments in a Next.js SaaS (Step by Step)",
      zh: "在 Next.js SaaS 中接入 Waffo 支付（分步教程）",
    },
    excerpt: {
      en: "Wire Waffo (Pancake MoR or Acquiring) into a Next.js checkout: API keys, webhook verification, price ids and a test purchase.",
      zh: "把 Waffo（Pancake MoR 或 Acquiring）接进 Next.js 结账：API key、Webhook 验签、价目 id 与一次测试购买。",
    },
    body: {
      en: `Waffo has two flavours and the setup differs between them. This tutorial covers both, because the make1day.dev integration supports each through the same checkout and webhook contract.

## 1. Decide the flavour

Set **WAFFO_FLAVOR** to **pancake** (global MoR checkout) or **acquiring** (SE-Asia acquiring). The default is pancake; the adapter switches endpoints and signing accordingly.

## 2. Gather credentials

For Pancake you need a **WAFFO_STORE_SLUG** (or **WAFFO_STORE_ID** / **WAFFO_MERCHANT_ID**) and a **WAFFO_PRIVATE_KEY**. For Acquiring you need the merchant contract fields: **WAFFO_ACQUIRING_MERCHANT_INFO**, **WAFFO_ACQUIRING_USER_INFO**, **WAFFO_ACQUIRING_PAYMENT_INFO**, **WAFFO_ACQUIRING_ORDER_CURRENCY** and **WAFFO_ACQUIRING_ORDER_DESCRIPTION**, plus **WAFFO_PRIVATE_KEY** and the per-environment webhook public key.

## 3. Create products and prices

In the Waffo dashboard create a one-time product for Buyout and a recurring product for Care, then copy their price ids into **WAFFO_PRICE_ID_BUYOUT** and **WAFFO_PRICE_ID_CARE**. For a Black Friday promo, create separate price ids and set **WAFFO_PRICE_ID_BUYOUT_BF** / **WAFFO_PRICE_ID_CARE_BF** (the webhook plan inference recognises them automatically).

## 4. Configure the webhook

Point Waffo at your **/api/payments/webhook/waffo** endpoint. Pancake verifies with the platform RSA public key (**WAFFO_WEBHOOK_PUBLIC_KEY**, test / prod variants). Acquiring signs the request with RSA and needs the same public key. Always verify the signature server-side before trusting the payload — never skip it.

## 5. Set the provider

Set **PAYMENT_PROVIDER=waffo** and the Waffo env vars above. A checkout call resolves the right price id for the active plan, and the webhook grants the licence by inferring the plan from the price id.

## 6. Run a sandbox test

Use the Waffo test environment (**WAFFO_ENVIRONMENT=test**) and a test purchase. Confirm the webhook fires, the plan is inferred correctly, and the licence key is issued. Do not go live until a real sandbox round-trip is green.

If you are on make1day.dev, the six adapters already share this contract, so the same code path works for Creem, Stripe, PayPal and Lemon Squeezy — only the env vars change.`,
      zh: `Waffo 有两种形态，接入方式不同。本教程两种都覆盖，因为 make1day.dev 的集成通过同一套结账与 Webhook 契约支持两者。

## 1. 确定形态

把 **WAFFO_FLAVOR** 设为 **pancake**（全球 MoR 结账）或 **acquiring**（东南亚收单）。默认是 pancake；适配器据此切换端点与签名。

## 2. 收集凭证

Pancake 需要 **WAFFO_STORE_SLUG**（或 **WAFFO_STORE_ID** / **WAFFO_MERCHANT_ID**）与 **WAFFO_PRIVATE_KEY**。Acquiring 需要商户合同字段：**WAFFO_ACQUIRING_MERCHANT_INFO**、**WAFFO_ACQUIRING_USER_INFO**、**WAFFO_ACQUIRING_PAYMENT_INFO**、**WAFFO_ACQUIRING_ORDER_CURRENCY**、**WAFFO_ACQUIRING_ORDER_DESCRIPTION**，外加 **WAFFO_PRIVATE_KEY** 与各环境的 Webhook 公钥。

## 3. 创建商品与价格

在 Waffo 后台为 Buyout 建一次性商品、为 Care 建周期商品，把价格 id 填入 **WAFFO_PRICE_ID_BUYOUT** 与 **WAFFO_PRICE_ID_CARE**。若做黑五促销，另建价格 id 并设 **WAFFO_PRICE_ID_BUYOUT_BF** / **WAFFO_PRICE_ID_CARE_BF**（Webhook 的 plan 反推会自动识别）。

## 4. 配置 Webhook

把 Waffo 指向你的 **/api/payments/webhook/waffo** 端点。Pancake 用平台 RSA 公钥（**WAFFO_WEBHOOK_PUBLIC_KEY**，含 test / prod 变体）验证。Acquiring 用 RSA 给请求签名，同样需要该公钥。务必在服务端验证签名后再信任负载——绝不能跳过。

## 5. 设定网关

设 **PAYMENT_PROVIDER=waffo** 及上述 Waffo 环境变量。结账调用会为当前方案解析正确的价格 id，Webhook 则通过价格 id 反推方案并发放许可。

## 6. 跑沙箱测试

使用 Waffo 测试环境（**WAFFO_ENVIRONMENT=test**）做一次测试购买。确认 Webhook 触发、方案被正确反推、许可 key 已签发。在真实沙箱往返变绿前不要上线。

若你用 make1day.dev，六个适配器共享同一套契约，因此 Creem、Stripe、PayPal、Lemon Squeezy 走的是同一代码路径——只换 env 即可。`,
    },
    faq: {
      en: [
        { q: "Which Waffo flavour should I use?", a: "Use pancake for a global Merchant-of-Record checkout. Use acquiring only if you already have a regional acquiring contract that requires its specific fields and RSA signing." },
        { q: "Do I need to verify the Waffo webhook signature?", a: "Yes. The integration verifies it server-side with the platform public key for both flavours. Skipping verification would let anyone forge a paid event." },
        { q: "How does the licence get issued?", a: "The webhook infers the plan from the price id (including BF ids) and calls the licence grant. Without a configured price id the checkout falls back to display mode." },
      ],
      zh: [
        { q: "该用哪种 Waffo 形态？", a: "想要全球商户登记结账用 pancake。仅当你已有需要特定字段与 RSA 签名的区域收单合同时，才用 acquiring。" },
        { q: "需要验证 Waffo Webhook 签名吗？", a: "需要。集成对两种形态都用平台公钥在服务端验证。跳过验证会让任何人伪造已支付事件。" },
        { q: "许可是怎么签发的？", a: "Webhook 通过价格 id（含 BF id）反推方案并调用许可发放。若未配置价格 id，结账会回退到展示模式。" },
      ],
    },
  },
  {
    slug: "creem-payment-setup-tutorial",
    date: "2026-11-08",
    category: "Tutorial",
    readingMinutes: 7,
    tags: ["Creem payment setup", "Creem tutorial", "Creem webhook", "Next.js SaaS checkout"],
    title: {
      en: "Set Up Creem Payments in a Next.js SaaS (Step by Step)",
      zh: "在 Next.js SaaS 中接入 Creem 支付（分步教程）",
    },
    excerpt: {
      en: "Connect Creem's hosted checkout to a Next.js app: API key, products and prices, webhook signatures and a sandbox test.",
      zh: "把 Creem 的托管结账接到 Next.js 应用：API key、商品与价格、Webhook 签名与沙箱测试。",
    },
    body: {
      en: `Creem is the closest thing to a Stripe-like hosted checkout with a Merchant of Record. This tutorial gets a Next.js SaaS taking real payments through it.

## 1. Create the account and API key

Sign up at Creem, switch to test mode, and create an API key. Store it as **CREEM_API_KEY**. Set **CREEM_ENV=test** for development and **live** only after your sandbox round-trip is green.

## 2. Create products and prices

In the Creem dashboard create a one-time product for Buyout and a recurring product for Care. Copy their price ids into **CREEM_PRICE_ID_PRO** (one-time Buyout maps to the PRO slot, recurring Care maps to SCALE) — or, if your integration separates them, **CREEM_PRICE_ID_BUYOUT** / **CREEM_PRICE_ID_CARE**. For a Black Friday promo, create separate price ids and set **CREEM_PRICE_ID_BUYOUT_BF** / **CREEM_PRICE_ID_CARE_BF**; the webhook plan inference already recognises them.

## 3. Set the webhook

Point Creem at your **/api/payments/webhook/creem** endpoint and copy the webhook secret into **CREEM_WEBHOOK_SECRET**. The integration verifies the signature on every event before trusting it. A checkout event resolves the plan from the product / price id and grants the licence; a refund or cancellation event revokes it.

## 4. Set the provider

Set **PAYMENT_PROVIDER=creem** plus **CREEM_API_KEY** and **CREEM_WEBHOOK_SECRET**. A checkout call picks the right price id for the active plan (or the BF price id when the promo is on), and redirects to Creem's hosted checkout.

## 5. Run a sandbox test

Use test mode and a test purchase. Confirm the webhook fires, the plan is inferred correctly, the licence key is issued, and a test refund revokes it. Go live (CREEM_ENV=live with live keys) only after that round-trip is green.

Because Creem, Waffo, Stripe, PayPal and Lemon Squeezy all sit behind the same checkout and webhook contract in make1day.dev, switching providers is a config change — not a rewrite.`,
      zh: `Creem 是最接近「类 Stripe 托管结账 + 商户登记」的方案。本教程让 Next.js SaaS 通过它收真实款项。

## 1. 创建账户与 API key

在 Creem 注册，切到测试模式，创建 API key，存入 **CREEM_API_KEY**。开发期设 **CREEM_ENV=test**，沙箱往返变绿后再改为 **live**。

## 2. 创建商品与价格

在 Creem 后台为 Buyout 建一次性商品、为 Care 建周期商品。把价格 id 填入 **CREEM_PRICE_ID_PRO**（一次性 Buyout 映射到 PRO 槽、周期 Care 映射到 SCALE），若你的集成分开字段则填 **CREEM_PRICE_ID_BUYOUT** / **CREEM_PRICE_ID_CARE**。若做黑五促销，另建价格 id 并设 **CREEM_PRICE_ID_BUYOUT_BF** / **CREEM_PRICE_ID_CARE_BF**；Webhook 的 plan 反推已能识别。

## 3. 配置 Webhook

把 Creem 指向你的 **/api/payments/webhook/creem** 端点，把 Webhook 密钥存入 **CREEM_WEBHOOK_SECRET**。集成会在信任每个事件前验证签名。结账事件通过商品 / 价格 id 反推方案并发放许可；退款或取消事件则撤消它。

## 4. 设定网关

设 **PAYMENT_PROVIDER=creem**，外加 **CREEM_API_KEY** 与 **CREEM_WEBHOOK_SECRET**。结账调用为当前方案（或促销开启时的 BF 价格 id）选取正确价格 id，并重定向到 Creem 托管结账。

## 5. 跑沙箱测试

用测试模式做一次测试购买。确认 Webhook 触发、方案被正确反推、许可 key 已签发，且测试退款能撤消许可。在往返变绿后再上线（CREEM_ENV=live 并换正式 key）。

由于 Creem、Waffo、Stripe、PayPal、Lemon Squeezy 在 make1day.dev 里都位于同一套结账与 Webhook 契约之后，切换供应商只是配置项——不是重写。`,
    },
    faq: {
      en: [
        { q: "Is Creem a Merchant of Record?", a: "Yes — Creem handles sales tax / VAT and compliance for you, which is why its fee is higher than a raw processor. Verify the current rate on Creem's pricing page." },
        { q: "Do I need to verify the Creem webhook signature?", a: "Yes. The integration verifies it with CREEM_WEBHOOK_SECRET on every event. Skipping it would let anyone forge a paid event." },
        { q: "What happens on a refund?", a: "The webhook sees the cancellation / refund event and revokes the licence so a refunded customer cannot keep access." },
      ],
      zh: [
        { q: "Creem 是商户登记（MoR）吗？", a: "是——Creem 替你处理销售税 / VAT 与合规，这正是其费率高于裸处理器的原因。请以 Creem 定价页的当前费率为准。" },
        { q: "需要验证 Creem Webhook 签名吗？", a: "需要。集成对每个事件都用 CREEM_WEBHOOK_SECRET 验证。跳过会让任何人伪造已支付事件。" },
        { q: "退款会怎样？", a: "Webhook 收到取消 / 退款事件后会撤消许可，使退款客户无法继续访问。" },
      ],
    },
  },
  {
    slug: "saas-demo-video-template",
    date: "2026-11-13",
    category: "Guide",
    readingMinutes: 6,
    tags: ["SaaS demo video template", "product demo video for SaaS", "SaaS demo script"],
    title: {
      en: "SaaS Demo Video Template: the 90-Second Cut That Converts",
      zh: "SaaS 演示视频模板：能转化的 90 秒怎么剪",
    },
    excerpt: {
      en: "A scene-by-scene template for a SaaS product demo - hook, three-stop tour, proof, CTA - written so revisions re-render only the scenes you touched.",
      zh: "逐场景的 SaaS 产品演示模板——钩子、三站走查、证据、CTA——改动只重渲你碰过的场景。",
    },
    body: {
      en: "A SaaS demo video earns its keep in the first five seconds and loses it somewhere around minute two. This is a 90-second cut built for product pages and pre-sales emails: long enough to walk the workflow, short enough that people finish it.\n\n## The scene grid\n\nCopy the structure into your doc, fill every beat with your product's truth, and you have the script an agency would quote four figures for.\n\n1. HOOK (0-5s) - one sentence of pain, laid over the ugliest real moment of the problem. Not \"Introducing Acme 2.0\". Try: \"Your pricing page says self-serve. Your checkout says talk to sales.\"\n2. CONTEXT (5-20s) - name the workflow being fixed and who runs it. One screen, one sentence. Skipping this beat is how demos die: the viewer needs to know whose day they are watching.\n3. TOUR (20-60s) - exactly three stops, each ending on a visible before/after. Feature four is feature zero - viewers keep the first three and forget the rest. Land on a state change, never on a menu.\n4. PROOF (60-75s) - numbers with units (\"reconciliation went from 3 days to 4 hours\"), one customer line, or a live-looking query result. A logo wall is a fallback, not proof.\n5. CTA (75-90s) - one action, one button. \"Start the 14-day trial\" beats \"Learn more\". Keep the product name on screen while you say it: viewers replay the last frame to remember what they watched.\n\n## Write it as scenes, not as a paragraph\n\nThe difference between a script and a video is the edit tax. If the voiceover is one flat block, every change - a new screenshot, a re-record, a price update - forces a full re-render. Structure the script as numbered scenes, each owning its visual note, its caption text and its VO. A change then touches one scene; the rest stay byte-identical.\n\nThat structure is exactly what the AI video workflow module in Buyout Studio ships: brief, script, storyboard, render - revision conversations that re-render only the scenes you touched. The [Reel Forge showroom preview](/templates/reel-forge/preview) walks the pipeline end to end. It is a static demo: in a real build the code and every model call run in your deployment, on your own keys. There is no hosted video generator on this site - that is a licensing decision, not a missing feature.\n\n## The three cuts\n\nOne script, three formats:\n\n- 16:9 for the hero on your product page.\n- 9:16 for ad accounts and Shorts/Reels.\n- 1:1 for email headers and marketplaces.\n\nThe beats stay identical; only framing and caption size change. Captions default to on - more than half of B2B video gets watched on mute in an office.\n\n## Cost sanity check\n\nBefore commissioning anything: count the scenes. A 90-second demo is 8-12 scenes. If a quote prices 40 scenes, you are paying for padding. With a pipeline you own, you can also see the model spend of a run before you commit the render - the model console in a Studio build keeps a ledger per run, and a demo that costs $1.63 in provider spend beats an $800 agency slot you cannot update next quarter.",
      zh: "一支 SaaS 演示视频在前 5 秒赢得观众，也常在第二分钟丢掉他们。这份模板是为产品页与销售前邮件做的 90 秒剪辑：够长，能把工作流走完；够短，人们会看完。\n\n## 场景网格\n\n把结构抄进文档，每一拍填上你产品的真实内容——这份脚本就值回代理公司的报价。\n\n1. 钩子（0-5s）：一句痛点，压在问题最难看的真实画面上。不是「隆重介绍 Acme 2.0」，而是「你的定价页写着自助开通，结账流程却让你联系销售」。\n2. 语境（5-20s）：点名被改造的工作流、谁在跑它。一屏、一句。跳过这一拍是演示最常见的死法：观众得先知道自己在看谁的一天。\n3. 走查（20-60s）：恰好三站，每站以一个可见的前后对比收尾。第四个功能等于第零个——观众只记得前三站。每站停在状态变化上，不要停在菜单。\n4. 证据（60-75s）：带单位的数字（「对账从 3 天缩到 4 小时」）、一句客户原话，或一次实时查询结果。Logo 墙是退路，不是证据。\n5. CTA（75-90s）：一个动作、一个按钮。「开始 14 天试用」强过「了解更多」。产品名同步留在画面上——观众会倒回最后一帧来记住自己看了什么。\n\n## 写成场景，不写成段落\n\n脚本和视频的差别在于修改税。旁白若是一整段平文，任何改动——换截图、重录、改价格——都逼你整体重渲。把脚本编号成分场，每场自带画面说明、字幕文本与配音：改动只碰一场，其余字节不动。\n\n这正是 Buyout Studio 里 AI 视频工作流模块的形状：简报→脚本→分镜→渲染，修订对话只重渲你动过的场景。[Reel Forge 样板间预览](/templates/reel-forge/preview) 完整演示这条管线。它是静态演示——真实构建里，代码与每次模型调用都跑在你的部署、你自己的密钥上。本站不提供托管生成器，这是授权决定，不是缺功能。\n\n## 三种切法\n\n同一脚本，三种画幅：\n\n- 16:9 用于产品页首屏。\n- 9:16 用于广告后台与 Shorts/Reels。\n- 1:1 用于邮件头图与集市位。\n\n节拍不变，只换构图与字幕字号。字幕默认打开——一半以上的 B2B 视频是在办公室里静音看完的。\n\n## 成本体检\n\n先数场景再询价。90 秒演示是 8-12 个场景；报价按 40 个场景来，你付的就是水分。管线自有之后，渲染前还能看到每次运行的真实模型开销——Studio 构建里的模型控制台按次记账。一次 1.63 美元的模型支出，胜过 800 美元且下季度改不动的代理档期。",
    },
    faq: {
      en: [
        { q: "What is a SaaS demo video template?", a: "A fixed scene structure - hook, context, a three-stop tour, proof, CTA - with slots for your product's real screens and numbers. It is a script skeleton, so every demo you cut follows a rhythm proven to hold viewers to the end." },
        { q: "How long should a SaaS demo video be?", a: "60-90 seconds for a product page or pre-sales email. Feature walkthroughs for existing users can run longer; anything aimed at a cold audience should stay under two minutes." },
        { q: "Where can I get a demo video template that renders the video, not just the script?", a: "Buyout Studio ships the pipeline as source code: script, storyboard, cost quote and render, with only changed scenes re-rendered. It runs in your deployment on your own provider keys - make1day.dev sells the code, not a hosted video service." },
      ],
      zh: [
        { q: "什么是 SaaS 演示视频模板？", a: "一套固定的分场结构——钩子、语境、三站走查、证据、CTA——留好你产品真实界面与数字的槽位。它是脚本骨架，让每条演示都沿用能留住观众到结尾的节奏。" },
        { q: "SaaS 演示视频该多长？", a: "产品页与销售前邮件用 60-90 秒。给老用户的功能走查可以更长；面向陌生受众的别超过两分钟。" },
        { q: "哪里能拿到连视频一起渲染、不只给脚本的模板？", a: "Buyout Studio 把整条管线以源码交付：脚本、分镜、成本预估、渲染，改动只重渲对应场景。它跑在你自己的部署与密钥上——make1day.dev 卖的是代码，不是托管视频服务。" },
      ],
    },
  },
  {
    slug: "saas-explainer-video-template",
    date: "2026-11-13",
    category: "Guide",
    readingMinutes: 6,
    tags: ["SaaS explainer video template", "60 second explainer script", "animated explainer for SaaS"],
    title: {
      en: "SaaS Explainer Video Template: 60 Seconds, Six Beats",
      zh: "SaaS 讲解视频模板：60 秒讲清楚一件事",
    },
    excerpt: {
      en: "The word-budget structure for a SaaS explainer - problem, agitation, introduction, how it works, proof, CTA - and why the voice must be written before any visual.",
      zh: "SaaS 讲解视频的词量预算结构——问题、刺痛、登场、怎么运作、证据、CTA——以及为什么必须先写声音再画画面。",
    },
    body: {
      en: "A demo shows the product. An explainer shows the idea - and for a SaaS with an unfamiliar workflow, the idea is what people need to understand before they sign up. The two formats are not interchangeable, and neither is the template.\n\n## Demo vs explainer, in one line each\n\nDemo: \"here is the product doing the thing.\" Explainer: \"here is why the thing matters and how it works - even if we never show a screen.\" Landing pages for category-creating products lead with the explainer and hang the demo underneath.\n\n## The 60-second beat grid\n\nComfortable narration runs 2.4-2.6 words per second, so a 60-second explainer holds about 150 words. Split the budget:\n\n1. PROBLEM (8s, ~20 words) - the situation your buyer already complains about, in their words.\n2. AGITATION (8s, ~20 words) - what it costs them: hours, churn, an audit they will lose.\n3. INTRODUCTION (6s, ~15 words) - your product, one sentence, no adjectives.\n4. HOW IT WORKS (20s, ~50 words) - three steps, one visual each. The only section allowed to show the interface.\n5. PROOF (10s, ~25 words) - one number, one logo, one quote.\n6. CTA (8s, ~20 words) - one action plus the reason to act now.\n\nThe word budget is the template. If a beat cannot do its job inside its budget, the script is not finished - most failed explainers spend 45 words on the problem and leave 15 for how it works.\n\n## Voice first, visuals after\n\nDraft or record the narration before anything gets designed. Visuals exist to carry the words; building scenes first and fitting narration to them is how studios sell you a rewrite. In a voice-first script each scene owns one visual note, and the note - not the animation - is what you iterate on.\n\n## The localization lane\n\nAn explainer that travels cheaply was designed to: keep on-screen text minimal (it burns into footage), put the real sentences in the caption track (a text lane swaps per language at render), and re-voice only the markets that pay for it. Numbered scenes make this mechanical - captions are per-scene strings, and one re-rendered scene costs one scene.\n\nThat is the same shape Buyout Studio ships as source code. The [SaaS demo video template post](/blog/saas-demo-video-template) covers the product-demo variant of the same pipeline, and the [Reel Forge preview](/templates/reel-forge/preview) shows the storyboard structure. You run the pipeline on your own keys; nothing on this site generates video on our servers.\n\n## The fill-in skeleton\n\n- [Product] exists because [workflow] still costs [buyer] [concrete pain].\n- Every week they [repetitive task], and [consequence] compounds.\n- [Product] [one-sentence promise].\n- Connect [input]. [Product] performs [transformation]. Ship [outcome] in [time].\n- [One number or one quote].\n- [Start free trial / Book a demo] today - [reason to act now].",
      zh: "演示视频展示产品，讲解视频展示观念——对工作流陌生的 SaaS，观众注册之前真正需要先懂的是观念。两种格式不可互换，模板也是。\n\n## 一句话区分\n\n演示：「这是产品在干活。」讲解：「这件事为什么重要、怎么运转——哪怕一屏界面都不出现。」开创品类的产品通常先上讲解，再在下方挂演示。\n\n## 60 秒节拍网格\n\n舒适语速约 2.4-2.6 词/秒，60 秒讲解能装约 150 词。按这个预算切：\n\n1. 问题（8s，约 20 词）：买主已经在抱怨的处境，用他的原话。\n2. 刺痛（8s，约 20 词）：它耗费什么——工时、流失、一场必输的审计。\n3. 登场（6s，约 15 词）：你的产品，一句话，不加形容词。\n4. 怎么运作（20s，约 50 词）：三步，每步一个画面。这是唯一允许出现界面的段落。\n5. 证据（10s，约 25 词）：一个数字、一个 logo 或一句评价。\n6. CTA（8s，约 20 词）：一个动作，加一个现在就做的理由。\n\n词量预算本身就是模板。哪一拍塞不下它的职责，脚本就还没写完——多数失败的讲解是「问题」写了 45 词、「怎么运作」只剩 15 词。\n\n## 先声音，后画面\n\n先把旁白写出来或录出来，再动设计。画面为声音服务；先搭场景再塞旁白，是工作室骗你重写的方式。以声音为先的分场脚本里，每场只配一行画面说明——要迭代的是说明，不是动画。\n\n## 本地化通道\n\n能便宜跑遍多市场的讲解视频，是当初就这么设计的：屏上文字尽量少（会被烧进画面），正式句子放进字幕层（渲染时按语言整体替换），只对值得的市场重新配音。编号分场让这一切机械化——字幕是每场的字符串，重渲一场只花一场的钱。\n\n这同样是 Buyout Studio 以源码交付的形状——[SaaS 演示视频模板一文](/blog/saas-demo-video-template)讲同一条管线的产品演示变体，[Reel Forge 预览](/templates/reel-forge/preview)能看到分镜结构。管线用你自己的密钥运行；本站服务器不生成任何视频。\n\n## 填空骨架\n\n- [产品]的存在，是因为[工作流]还在让[买主]付出[具体痛点]。\n- 每周他们都要[重复动作]，而[恶果]在复利。\n- [产品][一句话承诺]。\n- 接入[输入]。[产品]完成[转化]。在[时间]内交付[结果]。\n- [一个数字或一句引言]。\n- 今天就[开始试用/预约演示]——[此刻行动的理由]。",
    },
    faq: {
      en: [
        { q: "How many words is a 60-second explainer script?", a: "About 150 words at 2.4-2.6 words per second. Write to the per-beat budget - problem 20, agitation 20, introduction 15, how-it-works 50, proof 25, CTA 20 - and it lands inside the minute." },
        { q: "Do I need animation for a SaaS explainer?", a: "No. The structure works as kinetic text and simple screen captures. Animation is a style choice, not a requirement; the pacing is what sells." },
        { q: "What is the difference between an explainer and a demo video?", a: "An explainer teaches the idea - problem, mechanism, outcome - and works without showing the product. A demo shows the actual screens doing the actual job. Category-creating SaaS usually leads with the explainer and links the demo under it." },
      ],
      zh: [
        { q: "60 秒讲解脚本要多少词？", a: "约 150 词（2.4-2.6 词/秒）。按节拍预算写：问题 20、刺痛 20、登场 15、怎么运作 50、证据 25、CTA 20，正好装进一分钟。" },
        { q: "SaaS 讲解视频一定要有动画吗？", a: "不必。动效文字加简单界面截图就能跑完整套结构。动画是风格选择，不是必需品；节奏才是卖东西的部分。" },
        { q: "讲解视频和演示视频差在哪？", a: "讲解教观念——问题、机制、结果——可以完全不出现产品界面；演示展示真实界面做真实工作。开创品类的 SaaS 通常主打讲解、下方挂演示。" },
      ],
    },
  },
  {
    slug: "best-ai-video-platform-template-library-saas",
    date: "2026-11-13",
    category: "Comparison",
    readingMinutes: 8,
    tags: ["best AI video platform template library SaaS", "AI video platform template library", "video template library for SaaS"],
    title: {
      en: "Best AI Video Platform Template Libraries for SaaS Teams (2026)",
      zh: "2026 年 SaaS 团队选 AI 视频平台模板库，该看什么",
    },
    excerpt: {
      en: "Synthesia, InVideo, Pictory, HeyGen, Runway, Descript - what each template library really licenses, how it bills, and when owning the pipeline as source code beats renting one.",
      zh: "Synthesia、InVideo、Pictory、HeyGen、Runway、Descript——各家模板库真正授权的是什么、账怎么收，以及什么时候该把管线当源码拥有，而不是租用。",
    },
    body: {
      en: "Search \"best AI video platform template library SaaS\" and you get a list of logos. Every logo is actually renting you something different: a licensing shape, a billing shape, and a pipeline you do not own. Here is the honest breakdown.\n\n## What \"template library\" means per platform\n\n- Synthesia - presenter-style templates: avatar, script, slides. The fastest route to a talking-head product update. Seats bill per creator; export rights depend on the plan tier.\n- InVideo - the largest raw template count, thousands, with stock footage attached. Great for social cutdowns; watermark and licensing tiers matter if you ship client work.\n- Pictory - script-to-video automation with a brand kit. Good at turning blog posts into shorts; its template depth is weaker than its automation depth.\n- HeyGen - avatar translation and personalized video at scale. Strong for outbound, weaker for product explainers.\n- Runway - not a template library at all: a generation-model suite with prosumer editing. Best-in-class output, and assembling repeatable SaaS content from it is engineering work you pay for seat by seat.\n- Descript - editing-first. Templates for waveform-driven cuts and overdubs; the right tool once footage already exists.\n\n## The sixth lane: templates as source code\n\nEverything above is a hosted studio - you rent the editor, export the MP4, and the pipeline underneath stays a black box. There is a different kind of template library for teams shipping video workloads inside their own product: the pipeline itself is the template.\n\nBuyout Studio on make1day.dev ships the SaaS video pipeline as readable Next.js source - brief, script, storyboard, cost quote, render - plus per-run cost accounting and scene-diff revisions. It is not a hosted generator: make1day.dev never runs your video jobs. The site sells the source, and the pipeline runs in your deployment on your own provider keys (OpenAI, fal and others, wired through the model console). If you are comparing template libraries because you want to embed ad-video generation in your SaaS, this is the only lane where you can actually ship the feature. The working scripts for both formats live in our [demo video template](/blog/saas-demo-video-template) and [explainer template](/blog/saas-explainer-video-template) posts.\n\n## Which one is best for your team\n\n- Marketing only, need a presenter today: Synthesia or HeyGen.\n- High-volume social cutdowns, low budget: InVideo or Pictory.\n- Creative-grade visuals with an in-house editor: Runway.\n- Video is part of your product or an always-on ad workflow, and you want per-run cost control: own the pipeline. That is the Studio lane - the only option here whose template library is your repository.\n- Need both marketing and the pipeline: run this quarter's ads on one hosted platform, then buy the workflow module once. It does not re-price when your seat count grows.\n\n## The catch the listicles skip\n\nRented libraries bill per seat and per export. Your content volume doubles, the bill doubles. A source-owned pipeline costs you provider spend per render - usually cents per scene - plus one one-time license. Teams that ship ads daily discover this arithmetic in month two.\n\nPrices, watermark rules and export rights change by tier and by quarter - check each platform's current terms before buying. This post is written at launch level, not as a live quote.",
      zh: "搜「best AI video platform template library SaaS」，你会得到一串 logo 的榜单。每家其实在租给你三种不同的东西：授权方式、账单形状，以及一条不归你所有的管线。这里逐一说清。\n\n## 各家「模板库」到底是什么\n\n- Synthesia——演示式模板：数字人、脚本、幻灯片。口播型产品更新最快。按席位计费，导出权利看档位。\n- InVideo——模板数量最多（数千，附素材库）。社媒剪辑很合适；交付客户作品要看水印与授权档位。\n- Pictory——脚本转视频加品牌套件。把博客变短视频是好手；模板深度不如自动化深度。\n- HeyGen——数字人翻译与规模化个性化视频。外呼强，产品讲解弱。\n- Runway——根本不是模板库：生成模型套装加专业剪辑。输出顶级，但把它组装成可重复的 SaaS 内容，是你按席位付费的工程活。\n- Descript——剪辑优先。波形驱动剪辑与配音修补的模板；素材已经存在时的正确工具。\n\n## 第六个车道：把模板写成源码\n\n以上都是托管编辑器：你租编辑器、导出 MP4，管线始终是黑盒。还有一种「模板库」给把视频负载装进自家产品的团队——管线本身就是模板。\n\nmake1day.dev 的 Buyout Studio 把 SaaS 视频管线以可读的 Next.js 源码交付：简报→脚本→分镜→成本预估→渲染，外加按次记账与场景级差分修订。它不是托管生成器——本站从不跑你的视频任务；卖的是源码，管线跑在你的部署、你自己的模型密钥上（OpenAI、fal 等经模型控制台接入）。如果你在比较模板库是为了「把广告视频生成嵌进自家 SaaS」，只有这个车道能真的上线功能。两种格式的实操脚本见[演示视频模板](/blog/saas-demo-video-template)与[讲解视频模板](/blog/saas-explainer-video-template)两篇。\n\n## 按团队情形怎么选\n\n- 只做营销、今天就要口播成片：Synthesia 或 HeyGen。\n- 走量社媒剪辑、预算低：InVideo 或 Pictory。\n- 创意级画面、队里有剪辑师：Runway。\n- 视频是你产品或常投广告工作流的一部分、要按次控成本：拥有管线——这就是 Studio 车道，也是唯一一个模板库就是你自己仓库的选项。\n- 营销与管线都要：本季广告先用一个托管平台，再一次性买断工作流模块。席位增长不会让它重新计价。\n\n## 榜单不会写的坑\n\n租用式模板库按席位、按导出计费：内容量翻倍，账单翻倍。自有管线的成本是每次渲染的供应商开销——通常一个场景几美分——外加一次买断。天天投广告的团队，第二个月就会算清这道算术题。\n\n各家价格、水印政策与导出权利随时按档位变动——购买前核对当期条款。本文写的是发布级事实，不是实时报价。",
    },
    faq: {
      en: [
        { q: "Which AI video platform has the best template library for SaaS?", a: "For hosted editing, InVideo and Pictory cover the most SaaS-marketing formats; Synthesia and HeyGen own the presenter lane. But if you want the pipeline inside your own product, no hosted library can license that to you - the source-code lane (Buyout Studio on make1day.dev) ships the workflow as your repository." },
        { q: "Can I use platform template videos for client work?", a: "It depends on the plan tier's licensing. Common tiers allow commercial use of the final export with stock-footage restrictions, and reselling the template itself is usually barred. Check the platform's current EULA - terms change by tier and by quarter." },
        { q: "Why do template libraries charge per seat?", a: "Because the editor, the render farm and the content licenses are the product - you rent infrastructure and rights, not the script. That cost shape disappears only when the workflow runs in your own deployment on your own keys." },
        { q: "Is there a free SaaS explainer template?", a: "Script skeletons are free everywhere - ours is printed inside the explainer post on this site. The paid part is the assembly line: storyboard, voice, captions, render and revision handling." },
      ],
      zh: [
        { q: "对 SaaS 最好的 AI 视频平台模板库是哪家？", a: "托管剪辑看覆盖面，InVideo、Pictory 最全；口播形态归 Synthesia、HeyGen。若要把管线做进自家产品，任何托管库都授权不了你——那是源码车道：Buyout Studio 把工作流作为你的代码交付。" },
        { q: "平台模板能用于客户作品吗？", a: "取决于档位授权：常见档位允许商用最终导出，但对素材有约束，且通常禁止转售模板本身。以各平台当期 EULA 为准，条款随档位与时间变化。" },
        { q: "模板库为什么按席位收费？", a: "因为编辑器、渲染农场与内容授权才是商品——你租的是基础设施与权利，不是脚本。只有当工作流跑在你自己的部署与密钥上，这笔成本形状才会消失。" },
        { q: "有免费的 SaaS 讲解视频模板吗？", a: "脚本骨架到处都免费，本站讲解一文里就印了一份。付费的是流水线：分镜、配音、字幕、渲染与修订处理。" },
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
  company = "make1day.dev",
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
