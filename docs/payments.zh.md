# 支付 — 配置指南

make1day 内置可插拔的计费层。在 **Builder → 03 · 支付** 步骤中选择一个支付商；生成的应用会从 `PAYMENT_PROVIDER` 读取该选择，并接入对应的客户端与 Webhook 处理。

本指南说明如何配置每个选项，让生成的应用真正能够向客户收费。

> 环境变量写在生成应用的 `.env.local` 中，或你的托管平台（Vercel / Cloudflare Pages / 自有服务器）的环境设置里。切勿提交密钥。

---

## 1. Stripe（生产就绪）

最成熟的选项。开箱支持一次性付款、订阅、税务与客户门户。

**步骤**

1. 在 <https://stripe.com> 注册并打开 **Developers → API keys**。
2. 复制 **Publishable key** 与 **Secret key**。
3. 在 **Product catalog** 中创建产品与价格（或用 API），记下要售卖的 Price ID。
4. 配置 Webhook：**Developers → Webhooks → Add endpoint**，指向
   `https://<你的域名>/api/webhook`（或脚手架实际暴露的地址）。
   至少订阅：`checkout.session.completed`、`customer.subscription.updated`、
   `customer.subscription.deleted`。复制 **Signing secret**（`whsec_…`）。
5. （先测试）使用 **test mode** 密钥（`sk_test_…`、`pk_test_…`）与
   [测试卡](https://stripe.com/docs/testing) `4242 4242 4242 4242`。

**环境变量**

```bash
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**注意**
- 测试与生产密钥分环境使用，用环境变量切换而非改代码。
- 客户门户（取消 / 换卡）免费——在 **Settings → Billing → Customer portal** 开启。

---

## 2. Creem（对独立开发者友好）

类似 Stripe，但专为独立 SaaS 打造：摩擦更低，内置欧盟/英国税务（MOSS），并采用 Merchant of Record 模式。

**步骤**

1. 在 <https://creem.io> 注册并打开 **Developers**。
2. 创建 **API key** 并复制。
3. 在后台创建 **Product** 并复制其 ID。
4. 添加 Webhook 端点 `https://<你的域名>/api/webhook`，复制 **Webhook secret**。
   订阅 `checkout.completed` 与 `subscription.paid` / `subscription.canceled`。

**环境变量**

```bash
PAYMENT_PROVIDER=creem
CREEM_API_KEY=creem_xxx
CREEM_WEBHOOK_SECRET=whsec_xxx
# Creem 测试环境：
CREEM_ENV=test        # test | live
```

**注意**
- Creem 作为 Merchant of Record，自动处理 VAT/GST——通常无需单独的税务集成。
- 每个请求都要用 secret 校验 Webhook 签名。

---

## 3. PayPal（订阅 + Webhook）

若你的受众偏好 PayPal 钱包，可使用 PayPal Subscriptions API。

**步骤**

1. 在 <https://developer.paypal.com> 创建开发者应用（Live 或 Sandbox）。
2. 复制 **Client ID** 与 **Client Secret**。
3. 在 **Subscriptions** 中创建 **Plan** 并复制其 ID。
4. 注册 Webhook：`https://<你的域名>/api/webhook`，订阅事件
   `BILLING.SUBSCRIPTION.ACTIVATED`、`BILLING.SUBSCRIPTION.CANCELLED`、
   `PAYMENT.SALE.COMPLETED`。复制 **Webhook ID**。

**环境变量**

```bash
PAYMENT_PROVIDER=paypal
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
PAYPAL_WEBHOOK_ID=xxx
# 生产为 false，沙箱为 true：
PAYPAL_ENV=sandbox    # sandbox | live
```

**注意**
- PayPal Webhook 校验使用 Webhook ID + 传输的签名，不可跳过。
- 订阅在 PayPal 侧续订——你的 Webhook 是权益（entitlement）的唯一事实来源。

---

## 4. Waffo（默认支付商）

Waffo 名下是**两套协议完全不兼容的产品**，先确认你签约的是哪一个。

| 模式 | 文档 | 下单端点 | Webhook |
|---|---|---|---|
| `pancake`（默认） | docs.waffo.ai | `POST https://api.waffo.ai/v1/actions/checkout/create-session` | `X-Waffo-Signature: t=<ms>,v1=<base64>` |
| `acquiring` | waffo.com/docs | `POST /api/v1/order/create`（已实现；合同字段来自 `WAFFO_ACQUIRING_*` env） | `X-SIGNATURE`（base64 RSA） |

**Pancake 配置步骤**

1. 后台建**一次性产品**（Buyout）与**月订阅产品**（Care）。产品 ID 即价格 ID，
   填入 `WAFFO_PRICE_ID_BUYOUT` / `WAFFO_PRICE_ID_CARE`。
2. 复制 store slug 到 `WAFFO_STORE_SLUG`，设置 `WAFFO_ENVIRONMENT=test|prod`；
   若改用 RSA 签名鉴权则填 `WAFFO_MERCHANT_ID` + `WAFFO_PRIVATE_KEY`，**两种方式不可同时发送**。
3. 注册单一 webhook `POST https://<域名>/api/webhook`，把 test / prod 两套
   **Webhook Public Key** 分别填入 `WAFFO_WEBHOOK_PUBLIC_KEY_TEST` / `_PROD`。
4. 访问 `GET /api/payments/self-check` 查看缺失项（不返回任何密钥）。

```bash
PAYMENT_PROVIDER=waffo
WAFFO_FLAVOR=pancake
WAFFO_ENVIRONMENT=test
WAFFO_STORE_SLUG=your-store-slug
WAFFO_API_BASE=https://api.waffo.ai
WAFFO_CHECKOUT_PATH=/v1/actions/checkout/create-session
WAFFO_PRICE_ID_BUYOUT=PROD_xxx
WAFFO_PRICE_ID_CARE=PROD_xxx
WAFFO_WEBHOOK_PUBLIC_KEY_TEST="-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----"
WAFFO_WEBHOOK_PUBLIC_KEY_PROD="-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----"
```

结账发送 `productType: "onetime" | "subscription"`、`buyerEmail`、`metadata`
（回传为 `data.orderMetadata`）与 `successUrl`。验签为 RSA-SHA256 验
`${t}.${rawBody}`，容差 45 分钟；`subscription.payment_succeeded` 刻意忽略，
因为首付款还会同时发 `subscription.activated`，两个都处理会重复开通。

旧的 `WAFFO_WEBHOOK_SECRET`（HMAC）**已不再参与验签**。**Acquiring 下单已实现**：
`merchantInfo` / `userInfo` / `paymentInfo` / 订单字段全部来自 `WAFFO_ACQUIRING_*`
环境变量（make1day 不代填），ID 运行时生成，签名串与响应结构**需按你的 Waffo
合同核对**。完整协议见 `docs/waffo.md` 第 5 节。

---

## 5. Lemon Squeezy（数字产品 MoR）

Lemon Squeezy 是带托管结账与客户门户的 Merchant of Record，适配器使用其
JSON:API REST 接口。

1. 建两个 **variant**：一次性 Buyout 与循环 Care，设置
   `LEMONSQUEEZY_VARIANT_ID_BUYOUT` / `LEMONSQUEEZY_VARIANT_ID_CARE`。
2. 设置 `LEMONSQUEEZY_API_KEY`、`LEMONSQUEEZY_WEBHOOK_SECRET`、
   `LEMONSQUEEZY_STORE_ID`（用于 `relationships.store`）。
3. 注册单一 Webhook `POST https://<域名>/api/webhook`。适配器用
   **timing-safe** 比较（`node:crypto.timingSafeEqual`）校验 `x-signature`
   （raw body 的 hex HMAC-SHA256）。
4. `GET /api/payments/self-check` 会列出缺失的 `LEMONSQUEEZY_*` 变量。

```bash
PAYMENT_PROVIDER=lemonsqueezy
LEMONSQUEEZY_API_KEY=xxx
LEMONSQUEEZY_WEBHOOK_SECRET=xxx
LEMONSQUEEZY_STORE_ID=12345
LEMONSQUEEZY_VARIANT_ID_BUYOUT=12345
LEMONSQUEEZY_VARIANT_ID_CARE=12345
```

`POST /v1/checkouts` 在 `checkout_data.custom` 里带 `userId` / `plan`；Webhook
把 `data.attributes`（`customer_id`、`user_email`、`status`、`renews_at`、
`product_id` / `variant_id`、`urls.customer_portal`）归一化为 `NormalizedSubEvent`。
客户门户为 best-effort：`GET /v1/subscriptions/{id}` →
`data.attributes.urls.customer_portal`，取不到返回 `null`，UI 回退到「联系客服」。

> 需按你的 Lemon Squeezy 账户核对：`custom` 数据在 Webhook 里的回传位置、
> `{id}` 是 customer id 还是 subscription id、以及精确的 status / event 名称。
> 这些是基于公开 REST 文档的尽力映射，不是已验证的端到端集成。

---

## 6. 不接入支付

选择此项可完全跳过变现。生成的应用没有结账、没有 Webhook、也没有计费 UI——适用于内部工具、等待列表或免费产品。后续可通过修改 `PAYMENT_PROVIDER` 并添加上述环境变量切换到真实支付商。

---

## Webhook 安全（所有支付商）

- 在处理 Webhook 内容前，务必校验签名。
- 尽快返回 `2xx`；如需重活，请异步处理。
- 所有支付商共用**单一端点** `/api/webhook`；路由按 `PAYMENT_PROVIDER` 选择验签适配器。
- 若密钥泄露，请轮换。

## 上线清单

- [ ] 生产环境（非测试/沙箱）API 密钥已就位。
- [ ] Webhook 端点可通过 HTTPS 访问且已校验。
- [ ] 至少创建了一个产品/计划，并在配置中引用其 ID。
- [ ] 支付后跳转 / 客户门户已接通。
- [ ] 税务方案已确定（Creem/MoR 对比 Stripe Tax 对比无）。

## 套餐与 Price ID 映射

定价页售卖两个付费项：**Buyout 买断**（一次性，首发 $99）与 **Care 管护**
（按月，首发 $9/月），另有 **1V1 定制服务**，不提供在线结账。买断含 12 个月免费更新；
之后可续订 Care 持续获取更新。许可可用于构建并运营你自己的产品（允许商用），
但不得转售或将源码打包成模板二次售卖。完整规则见 `/pricing`。

- Stripe：`STRIPE_PRICE_ID_BUYOUT`（一次性价格）与
  `STRIPE_PRICE_ID_CARE`（按月循环价格）；旧的 `STRIPE_PRICE_ID_PRO` /
  `_SCALE` 作为回退。Buyout 使用 `mode: "payment"` 且无试用，Care 使用
  `mode: "subscription"` 并带 14 天试用。
- Creem：`PRO` 价格槽对应 Buyout，`SCALE` 对应 Care，请在对应后台
  分别配置为一次性 / 循环计费。
- PayPal：该适配器目前只创建订阅结账，一次性买断请改用 Waffo 或 Stripe。
- Lemon Squeezy：`LEMONSQUEEZY_VARIANT_ID_BUYOUT`（一次性 variant）与
  `LEMONSQUEEZY_VARIANT_ID_CARE`（循环 variant）；`priceForPlan()` 同一映射用于
  下单选 variant 与 Webhook 反查套餐。
- 1V1 定制：设置 `NEXT_PUBLIC_BOOKING_URL` 与 `NEXT_PUBLIC_CONTACT_EMAIL`。
  按钮优先打开预约链接，未配置时回退为预填邮件，报价全部人工确认。

---

## 实现说明（以当前代码为准）

- **默认支付商是 Waffo Pancake**（`PAYMENT_PROVIDER=waffo`、
  `WAFFO_FLAVOR=pancake`），本站收款与 Builder 默认生成的项目都走它；
  也支持 `PAYMENT_PROVIDER=lemonsqueezy`（JSON:API 结账 + timing-safe HMAC
  Webhook + 客户门户）。`acquiring` 下单已通过 `WAFFO_ACQUIRING_*` 合同变量实现，
  见 `docs/waffo.md` 第 5 节。
- Webhook 只有**一个**路由：`POST https://<域名>/api/webhook`；
  `/api/webhooks/<支付商>` 并不存在。
- 验签按各支付商自己的方案（Waffo：**RSA 公钥**；Lemon Squeezy / Creem /
  Stripe：**HMAC**）。密钥缺失时返回 400，绝不接收未签名请求。
- 事件按 `(eventType, eventId)` 去重后才发授权；付款成功签发离线
  `SK1.…` license key，重试不会重复发码。
- `POST /api/generate` 需要授权：license key 或有效订阅 / 邮箱自动认领；
  匿名访客拿不到源码 ZIP（下载本身就是商品）。匿名访客可以下载
  `POST /api/generate/preview` 的**无源码预览包**（文件清单 + 设计令牌），
  额度按访客令牌与网络双桶计数。上线前设置 `LICENSE_SECRET` 并执行
  `supabase/migrations/0003_licenses.sql`；已签发密钥在 `/admin/licenses`。
- `GET /api/payments/self-check` 只返回配置缺失项，不返回任何密钥。
- Webhook 写库失败返回 500 让网关重试，不会静默丢单。
