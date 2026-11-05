import type { Lang } from "@/lib/i18n-core";

// Blog articles. Each field is localised per language; missing languages fall
// back to English. The body is Markdown rendered by lib/markdown.tsx. These
// posts target the long-tail keywords we want the site to rank for.

export type Post = {
  slug: string;
  date: string; // ISO yyyy-mm-dd
  category: string;
  readingMinutes: number;
  tags: string[];
  title: Partial<Record<Lang, string>>;
  excerpt: Partial<Record<Lang, string>>;
  body: Partial<Record<Lang, string>>;
};

export const POSTS: Post[] = [
  {
    slug: "build-saas-with-nextjs",
    date: "2026-02-12",
    category: "Guide",
    readingMinutes: 7,
    tags: [
      "how to build a SaaS with Next.js",
      "Next.js SaaS boilerplate",
      "indie SaaS",
    ],
    title: {
      en: "How to Build a SaaS with Next.js in 2026 (Step by Step)",
      zh: "2026 年如何用 Next.js 从零搭建一个 SaaS（分步指南）",
    },
    excerpt: {
      en: "A pragmatic, no-fluff walkthrough of shipping a production SaaS on Next.js 15 — auth, billing, a database and one real AI feature — without rebuilding the commodity plumbing.",
      zh: "一份务实、不灌水的指南：用 Next.js 15 交付一个生产级 SaaS——登录、计费、数据库，再加一个真实的 AI 功能——不必重复造通用轮子。",
    },
    body: {
      en: `Building a SaaS in 2026 still means solving the same \\~60% of commodity problems every founder hits: sign-up, a database, billing, and a place to log in and look at your account. The difference between founders who ship and founders who stall is almost never the product idea — it's how fast they stop rebuilding that 60%.

## Start with the 60% that's commodity

Every SaaS needs the same backbone:

- Authentication (email + OAuth)
- A relational database with row-level security
- Subscription billing with webhooks
- A signed-in dashboard
- A deployment story

None of these are your differentiator. They're the toll you pay to play. So pay it once, with infrastructure you don't have to maintain by hand.

## Pick a stack that already has the 60%

A modern starter gives you routing, SSR, a typed component model and an ecosystem of integrations out of the box. **Next.js 15 (App Router) + TypeScript + Tailwind** is the default for a reason: it's where the tooling, hiring pool and examples already live. Pair it with Supabase for auth + Postgres and Stripe for billing and you've covered four of the five backbone items with documented, production-grade code.

## Add the one thing that's yours

The mistake is over-building the demo. Ship *one* real AI feature behind auth and a plan gate — a streaming chat endpoint, a document Q&A, a summariser — and let the rest of the app be honest scaffolding. Customers buy the 40% that's specific to them; they don't care that your settings page is generic.

## Ship, then charge

Start on a free tier, wire Stripe Checkout with a trial, and only ask customers for money once they're getting value. The scaffolding should let you go from \`git clone\` to a deployed, billable app in an afternoon — not a quarter.

That's the whole game: commodity backbone from a starter, one real feature from you, deployed and charging fast.`,
      zh: `在 2026 年做一个 SaaS，你依然要解决的还是那\\~60% 所有创始人都会撞上的通用问题：注册、数据库、计费，以及一个能登录查看账户的页面。能交付的人和卡住的人，差别几乎从不在于产品创意，而在于他们多快停止重复造这 60% 的轮子。

## 先从那 60% 的通用部分入手

每个 SaaS 都需要同样的主干：

- 登录鉴权（邮箱 + OAuth）
- 带行级安全的关系型数据库
- 带 Webhook 的订阅计费
- 登录后的控制台
- 一套部署方案

这些都不是你的差异化优势，而是入场要交的"过路费"。所以一次性交掉它，用一套你不必亲手维护的基础设施。

## 选一套已经具备这 60% 的技术栈

现代启动模板开箱即得路由、SSR、带类型的组件模型，以及一整套生态集成。**Next.js 15（App Router）+ TypeScript + Tailwind** 之所以成为默认选择，是因为工具链、人才池和示例都已经集中在它身上。再配上 Supabase（登录 + Postgres）和 Stripe（计费），你就用文档齐全、生产级的代码覆盖了五项主干中的四项。

## 加上只属于你的那一个功能

常见的错误是把演示过度堆砌。只交付*一个*真实的 AI 功能，放在登录与套餐权限之后——一个流式对话接口、一个文档问答、一个摘要器——其余保持诚实的脚手架即可。客户买的是那 40% 专属于你的东西，他们并不在乎你的设置页是否通用。

## 先上线，再收费

从免费档起步，接入带试用期的 Stripe Checkout，等到客户真正获得价值后再向他们收费。脚手架应当让你从 \`git clone\` 到一个已部署、可收费的应用，只需一个下午，而不是一个季度。

这就是全部打法：通用主干交给启动模板，那一个真实功能由你完成，快速部署并开始收费。`,
    },
  },
  {
    slug: "nextjs-saas-boilerplate-stripe-auth",
    date: "2026-03-03",
    category: "Comparison",
    readingMinutes: 6,
    tags: [
      "Next.js SaaS boilerplate with Stripe and auth",
      "Next.js SaaS starter with auth",
      "Stripe Supabase starter",
    ],
    title: {
      en: "The Fastest Next.js SaaS Boilerplate with Stripe and Auth",
      zh: "最快的、自带 Stripe 与登录的 Next.js SaaS 模板",
    },
    excerpt: {
      en: "What actually matters in a Next.js SaaS boilerplate with Stripe and auth — and which features separate a starter you'll abandon from one you'll ship on.",
      zh: "一个自带 Stripe 与登录的 Next.js SaaS 模板，真正重要的是什么——哪些特性决定它是你会弃用的，还是你会交付的。",
    },
    body: {
      en: `When you search for a *Next.js SaaS boilerplate with Stripe and auth*, you're really asking one question: how little of the commodity 60% do I have to write myself?

## The non-negotiables

A starter is only worth it if these four are real, not stubbed:

1. **Auth** — email magic-link *and* OAuth (Google/GitHub) via a managed provider, with row-level security on by default.
2. **Billing** — Stripe Checkout plus a webhook that flips a flag in your database. If the webhook isn't wired, it's a demo, not a business.
3. **Database** — Postgres with a seeded schema and RLS policies you can read.
4. **Deploy** — a Vercel-ready config and a one-command path to production.

## What separates shippable from abandonware

- **The webhook is honest.** It updates the user's plan in your DB and is idempotent. Most free templates skip this and you discover it at your first refund.
- **RLS is on, not documented as "todo".** Open the schema and the policies are there.
- **The AI feature is gated by plan**, so you have a real upsell, not a festure you can't monetise.
- **It's reskinnable** — you can change the brand, the palette and the copy without fighting the framework.

## How to evaluate in ten minutes

Clone it, set the env vars, run \`npm run dev\`, and try to: sign up, hit the paywall, complete a Stripe test checkout, and see the plan flip. If any of those four is blocked by missing code, keep looking.

A good Next.js SaaS boilerplate with Stripe and auth turns that four-step loop from a week of integration into an afternoon.`,
      zh: `当你搜索*自带 Stripe 与登录的 Next.js SaaS 模板*时，你真正只问一个问题：那 60% 的通用部分，我还要亲手写多少？

## 不可妥协的四项

一个模板只有在这四项真实可用、而非桩代码时，才值得用：

1. **登录鉴权**——邮箱魔法链接*与* OAuth（Google/GitHub），由托管服务商提供，默认开启行级安全。
2. **计费**——Stripe Checkout 加上一个会把标志位写入数据库的 Webhook。如果 Webhook 没接，那是演示，不是生意。
3. **数据库**——Postgres，含预置表结构与可读的 RLS 策略。
4. **部署**——Vercel 就绪配置，以及一条命令通往生产环境。

## 区分"可交付"与"被弃用"的关键

- **Webhook 是诚实的。** 它会在你的数据库里更新用户套餐，并且是幂等的。大多数免费模板跳过这一步，而你会在第一次退款时才发现。
- **RLS 是开启的，而非写在"待办"里。** 打开表结构，策略就在那里。
- **AI 功能按套餐权限开放**，所以你有一个真实的升级卖点，而不是一个无法变现的功能。
- **可换肤**——不改框架就能换品牌、配色与文案。

## 十分钟完成评估

克隆它、配置环境变量、运行 \`npm run dev\`，然后试着：注册、撞付费墙、完成一次 Stripe 测试结账，并看到套餐状态翻转。如果这四步有任何一步被缺失的代码卡住，继续找。

一个好的、自带 Stripe 与登录的 Next.js SaaS 模板，能让这个四步循环从一周的集成，变成一下午的事。`,
    },
  },
  {
    slug: "nextjs-subscription-billing",
    date: "2026-03-21",
    category: "Billing",
    readingMinutes: 8,
    tags: [
      "Next.js subscription billing boilerplate",
      "Stripe subscriptions Next.js",
      "SaaS template",
    ],
    title: {
      en: "Next.js Subscription Billing: Stripe Integration That Actually Works",
      zh: "Next.js 订阅计费：一套真正能用的 Stripe 集成",
    },
    excerpt: {
      en: "The parts of Next.js subscription billing that tutorials skip — webhook idempotency, plan gating, and proration — and how a boilerplate should handle them.",
      zh: "Next.js 订阅计费里，教程往往会跳过的部分——Webhook 幂等、套餐权限、按比例计费——以及一个模板应当如何处理它们。",
    },
    body: {
      en: `Most *Stripe subscriptions Next.js* tutorials stop at the happy path: create a checkout session, redirect, done. Production billing lives in the parts they skip.

## The webhook is the source of truth

The browser redirect lies. A user can close the tab, Stripe can retry, a test can fire twice. Your database must be the single source of truth, updated only by the webhook:

\`\`\`ts
// app/api/stripe/webhook/route.ts
const event = stripe.webhooks.constructEvent(
  rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!
);
if (event.type === "checkout.session.completed") {
  await db.user.update({
    where: { id: event.data.object.client_reference_id },
    data: { plan: "pro", status: "active" },
  });
}
\`\`\`

Make the handler **idempotent** — look up the event id and skip if already processed. This single detail prevents double upgrades and phantom refunds.

## Gate features by plan, not by UI

Never trust the client. A Next.js subscription billing boilerplate should read the plan from the session/server on every protected route. If \`plan !== "pro"\`, the AI endpoint (or whatever you charge for) returns 402 — even if someone edits the DOM.

## Think about proration before you need it

Stripe handles proration for you, but your UI has to explain it. Show the customer what they'll be charged today vs next cycle, or support tickets will eat your margin.

## What "done" looks like

A starter earns its keep when \`checkout.session.completed\` and \`subscription.deleted\` both correctly flip the plan, the feature gate reads server state, and a test card can drive the whole loop offline. If your Next.js subscription billing boilerplate can't do that with a single env file, it's a landing page, not a business.`,
      zh: `大多数关于 *Next.js 订阅计费 / Stripe* 的教程，都止步于"顺利路径"：创建结账会话、跳转、结束。生产级计费，恰恰活在那些被跳过的地方。

## Webhook 才是真相来源

浏览器跳转会骗人。用户可能关掉标签页，Stripe 可能重试，测试可能触发两次。你的数据库必须是唯一真相来源，且只由 Webhook 更新：

\`\`\`ts
// app/api/stripe/webhook/route.ts
const event = stripe.webhooks.constructEvent(
  rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!
);
if (event.type === "checkout.session.completed") {
  await db.user.update({
    where: { id: event.data.object.client_reference_id },
    data: { plan: "pro", status: "active" },
  });
}
\`\`\`

让处理器**幂等**——先查事件 id，若已处理就跳过。这一个细节，就能避免重复升级和幽灵退款。

## 按套餐权限开放功能，而非按界面

永远不要信任客户端。一个 Next.js 订阅计费模板，应当在每个受保护路由都从服务端会话读取套餐。如果 \`plan !== "pro"\`，那个 AI 接口（或任何你收费的东西）就返回 402——哪怕有人改了 DOM。

## 在需要之前就考虑按比例计费

Stripe 会替你处理按比例计费，但你的界面必须解释清楚。向客户展示"今天收多少、下个周期收多少"，否则客服工单会吃掉你的利润。

## "完成"长什么样

当一个模板能让 \`checkout.session.completed\` 与 \`subscription.deleted\` 都正确翻转套餐、功能权限读取服务端状态、并且一张测试卡就能离线跑通整个循环时，它才真正值回票价。如果你的 Next.js 订阅计费模板，需要改一大堆代码才能做到这些，那它只是个落地页，不是生意。`,
    },
  },
  {
    slug: "shipkit-vs-shipfast-makerkit",
    date: "2026-04-09",
    category: "Comparison",
    readingMinutes: 9,
    tags: [
      "ShipFast alternative",
      "Makerkit alternative",
      "Supastarter alternative",
      "Best Next.js SaaS boilerplate 2026",
    ],
    title: {
      en: "ShipKit vs ShipFast, Makerkit & Supastarter: An Honest Comparison",
      zh: "ShipKit 对比 ShipFast、Makerkit 与 Supastarter：一份诚实的评测",
    },
    excerpt: {
      en: "A source-level comparison of the best Next.js SaaS boilerplates in 2026 — what each one is actually for, and how to pick without regret.",
      zh: "2026 年最佳 Next.js SaaS 模板的源码级对比——每个模板真正适合什么，以及如何不后悔地选。",
    },
    body: {
      en: `If you landed here searching for a *ShipFast alternative* or a *Makerkit alternative*, you're weighing the same four or five boilerplates everyone recommends. Here's how to choose without reading every README twice.

## What they share

ShipFast, Makerkit, Supastarter and ShipKit all give you the commodity 60%: Next.js, auth, a database, billing, a dashboard. The difference is *philosophy*, not features.

## ShipFast

The lean, opinionated pick. Fastest to a landing page, smallest surface area, least hand-holding. Great if you want a starting point and plan to diverge hard. Weak if you want batteries included for multi-tenancy or RAG.

## Makerkit

The "batteries included" enterprise-leaning option. More structure, more opinions, more to learn before you're productive. Best when your SaaS has teams, roles and real org complexity from day one.

## Supastarter

The Supabase-native choice. If your whole world is Supabase, it fits like a glove. Less flexible if you later want to swap the backend.

## ShipKit

Built for founders who want the commodity backbone *and* a real AI feature they can reskin and ship. One buyout, optional care plan, and a builder that packages exactly the stack you picked — no boilerplate you didn't ask for. The differentiator is the AI-first scope and the reskinnable template generator.

## How to pick

- Want the lightest start? **ShipFast**.
- Need org/role structure on day one? **Makerkit**.
- All-in on Supabase? **Supastarter**.
- Shipping an AI SaaS and want it reskinnable + generator-driven? **ShipKit**.

None of them is "best" universally — only best for the 40% that's yours. That's the honest answer behind every *best Next.js SaaS boilerplate 2026* list.`,
      zh: `如果你是因为搜*ShipFast 替代品*或*Makerkit 替代品*来到这里，那你正在权衡大家都在推荐的同样四五个模板。下面告诉你如何不把每个 README 读两遍就做出选择。

## 它们的共性

ShipFast、Makerkit、Supastarter 与 ShipKit，都给你那 60% 的通用部分：Next.js、登录、数据库、计费、控制台。差别在于*理念*，而非功能。

## ShipFast

精简、强主张的选择。最快做出落地页，表面积最小，手把手最少。如果你想要一个起点、并打算大幅偏离，它很合适。如果你想要开箱即用的多租户或 RAG，它就弱了。

## Makerkit

偏"电池全配"的企业向选项。结构更多、主张更多、上手前要学的也更多。当你的 SaaS 从第一天起就有团队、角色和真实的组织复杂度时，它最合适。

## Supastarter

Supabase 原生选择。如果你整个世界都是 Supabase，它贴合得像手套。若日后想换后端，灵活性就差些。

## ShipKit

为想要"通用主干 *加* 一个可换肤、可交付的真实 AI 功能"的创始人而建。一次买断、可选的管护订阅，还有一个生成器，只打包你选中的技术栈——绝不多给用不上的样板。差异化在于 AI 优先的范围，以及可换肤的模板生成器。

## 如何选

- 想要最轻量的起点？**ShipFast**。
- 第一天就需要组织/角色结构？**Makerkit**。
- 全押 Supabase？**Supastarter**。
- 做一个 AI SaaS，想要可换肤 + 生成器驱动？**ShipKit**。

没有哪个是" universally 最佳"——只有对你那 40% 而言最佳。这才是每份*2026 最佳 Next.js SaaS 模板*榜单背后诚实的答案。`,
    },
  },
  {
    slug: "add-stripe-subscriptions-nextjs",
    date: "2026-04-28",
    category: "Tutorial",
    readingMinutes: 10,
    tags: [
      "how to add Stripe subscriptions to Next.js",
      "Stripe subscriptions Next.js",
      "Next.js subscription billing boilerplate",
    ],
    title: {
      en: "How to Add Stripe Subscriptions to Next.js (Complete Guide)",
      zh: "如何给 Next.js 添加 Stripe 订阅（完整指南）",
    },
    excerpt: {
      en: "A step-by-step, copy-pasteable path to Stripe subscriptions in Next.js 15: products, the checkout route, the webhook, and the feature gate.",
      zh: "一条可复制粘贴的完整路径：在 Next.js 15 中加入 Stripe 订阅——产品、结账路由、Webhook，以及功能权限。",
    },
    body: {
      en: `This is the shortest path to *Stripe subscriptions in Next.js* that won't break in production. No fluff, just the four moving parts.

## 1. Create the product and price in Stripe

In the Stripe dashboard, create a Product with a recurring Price. Copy the Price ID — you'll reference it from env as \`STRIPE_PRICE_ID_PRO\`.

## 2. The checkout route

\`\`\`ts
// app/api/checkout/route.ts
export async function POST(req: Request) {
  const { plan } = await req.json();
  const priceId = plan === "pro" ? process.env.STRIPE_PRICE_ID_PRO! : ...;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: (await getUser()).id,
    success_url: "https://yoursite.com/pricing?upgraded=1",
    cancel_url: "https://yoursite.com/pricing",
  });
  return Response.json({ url: session.url });
}
\`\`\`

## 3. The webhook (source of truth)

Verify the signature, handle \`checkout.session.completed\` and \`customer.subscription.deleted\`, and update your database. Make it idempotent by recording processed event ids. This is the part every *how to add Stripe subscriptions to Next.js* guide under-explains.

## 4. The feature gate

On every protected route/server action, read the plan from your database — never the client. If the plan is inactive, return 402. Your AI endpoint, downloads, or seat limits all hang off this single check.

## 5. Test the whole loop

Use a Stripe test card (\`4242 4242 4242 4242\`), complete checkout in test mode, confirm the plan flips, then cancel and confirm it flips back. If that loop works with one env file, your Next.js subscription billing is real.

A good boilerplate hands you steps 2–4 already wired. You should only be writing step 1 and your actual product.`,
      zh: `这是*在 Next.js 中接入 Stripe 订阅*最短、且不会在生产环境翻车的一条路。没有灌水，只有四个关键部件。

## 1. 在 Stripe 中创建产品与价格

在 Stripe 后台创建一个带周期性价格的产品。复制价格 ID——你会把它作为环境变量 \`STRIPE_PRICE_ID_PRO\` 引用。

## 2. 结账路由

\`\`\`ts
// app/api/checkout/route.ts
export async function POST(req: Request) {
  const { plan } = await req.json();
  const priceId = plan === "pro" ? process.env.STRIPE_PRICE_ID_PRO! : ...;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: (await getUser()).id,
    success_url: "https://yoursite.com/pricing?upgraded=1",
    cancel_url: "https://yoursite.com/pricing",
  });
  return Response.json({ url: session.url });
}
\`\`\`

## 3. Webhook（真相来源）

校验签名，处理 \`checkout.session.completed\` 与 \`customer.subscription.deleted\`，并更新你的数据库。通过记录已处理的事件 id 来保证幂等。这正是每份*如何在 Next.js 中添加 Stripe 订阅*指南都讲得不够的部分。

## 4. 功能权限

在每个受保护路由 / 服务端动作里，从你的数据库读取套餐——绝不要从客户端读。若套餐未激活，返回 402。你的 AI 接口、下载或席位限制，全都挂在这一个检查上。

## 5. 测试整个循环

用一张 Stripe 测试卡（\`4242 4242 4242 4242\`），在测试模式下完成结账，确认套餐翻转，再取消并确认它翻转回来。如果这一循环只要一份环境变量就能跑通，你的 Next.js 订阅计费就是真的。

一个好的模板，会把第 2–4 步预先接好。你只需写第 1 步，以及你真正的产品。`,
    },
  },
];

export function getAllPosts(): Post[] {
  return [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function postField(
  post: Post,
  lang: Lang,
  field: "title" | "excerpt" | "body",
): string {
  return post[field][lang] ?? post[field].en ?? "";
}
