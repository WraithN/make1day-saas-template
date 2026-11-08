# Waffo 对接说明（make1day）

> 调研日期：2026-11-05。依据官方公开文档：
> <https://docs.waffo.ai/llms.txt>（Pancake）、<https://waffo.com/docs/llms.txt>（Acquiring）。
> 本文件是 `lib/payments/waffo.ts` 的行为说明，不是猜测。

## 0. 先确认你用的是哪套 Waffo

**「Waffo」名下有两套协议完全不兼容的产品**，这是之前适配器的根本问题。

| | **Waffo Pancake**（默认） | **Waffo Acquiring** |
|---|---|---|
| 文档 | `docs.waffo.ai` | `waffo.com/docs` |
| 定位 | MoR：全球收款、代缴税、个人可收、独立开发者 / Vibe Coder | 东南亚收单网关 |
| 官方 SDK | `@waffo/pancake-ts` | `github.com/waffo-com/waffo-go` 等 |
| 创建订单 | `POST https://api.waffo.ai/v1/actions/checkout/create-session` | `POST https://waffo.com/api/v1/order/create` |
| 鉴权 | `X-Store-Slug` + `X-Environment`，或 RSA 签名的 `X-Merchant-Id`/`X-Timestamp`/`X-Signature` | 商户 API Key + RSA 签名 |
| 结账返回 | `checkoutUrl` | `data.orderAction`（JSON 字符串，取 `webUrl`/`deeplinkUrl`） |
| Webhook 头 | `X-Waffo-Signature: t=<ms>,v1=<base64>` | `X-SIGNATURE: <base64>` |
| 验签 | RSA-SHA256 验 `${t}.${rawBody}`，45 分钟容差 | RSA-SHA256 验 rawBody |
| 事件名 | `order.completed`、`subscription.activated`、… | `PAYMENT_NOTIFICATION`、`SUBSCRIPTION_*_NOTIFICATION` |
| 适配状态 | ✅ checkout + webhook 全实现 | ✅ checkout + webhook 已实现（合同字段由 env 提供；协议细节需按合同核对） |

**本项目默认 `WAFFO_FLAVOR=pancake`**：卖数字产品 / 脚手架、一次性 + 月订阅、无公司实体，正好是 Pancake 的目标场景。如果你签的是 `waffo.com` 那套，把 flavor 改成 `acquiring`，按第 5 节配置 `WAFFO_ACQUIRING_*` env 变量，并逐项核对标注「需按你的 Waffo 合同核对」的协议细节。

## 1. Pancake：创建结账会话

```
POST https://api.waffo.ai/v1/actions/checkout/create-session
```

**二选一鉴权（不能同时发，官方明确互斥）**

```bash
# A. 公开 Store Slug（推荐，最省事）
X-Store-Slug: my-store-k8x2m9ab
X-Environment: test            # test | prod
Content-Type: application/json

# B. API Key（RSA 签名，服务端）
X-Merchant-Id: MER_xxx
X-Timestamp: 1705312200
X-Signature: <base64>
Content-Type: application/json
```

B 的签名算法（官方原文）：

```
canonical = METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + BASE64(SHA256(BODY))
X-Signature = BASE64(RSA-SHA256(canonical, privateKey))
```

时间戳窗口：最多落后服务器 5 分钟、最多超前 1 分钟，服务器需 NTP 同步。

**请求体**（make1day 实际发送）

```json
{
  "productId": "PROD_xxx",
  "productType": "onetime",
  "currency": "USD",
  "storeId": "STO_xxx",
  "buyerEmail": "buyer@example.com",
  "metadata": { "plan": "buyout", "userId": "uuid", "source": "shipkit" },
  "successUrl": "https://<domain>/dashboard?welcome=1"
}
```

- `productId` **就是产品 ID**，不需要另建 price。Buyout 用一次性产品、Care 用月订阅产品。
- `productType`：`onetime` | `subscription`（不是旧版猜的 `mode: payment|subscription`）。
- `metadata` 会在 webhook 的 `data.orderMetadata` 原样回传，用来把订单归属到用户。
- 响应取 `data.checkoutUrl`（适配器兼容 `session.checkoutUrl`、`checkoutUrl`、`url` 三种包装）。
- 一个 session 只能生成一单，过期后必须重新创建，不要缓存跳转链接。

## 2. Pancake：Webhook 验签

```
X-Waffo-Signature: t=1772862600000,v1=<base64>
X-Waffo-Event: order.completed
```

验证步骤（官方原文）：

1. 解析 `t`（毫秒）与 `v1`（Base64）。
2. 构造签名输入 `` `${t}.${rawBody}` ``，**必须用原始 body 字符串**，不能 JSON.parse 后再 stringify。
3. 用 **Waffo Webhook Public Key** 做 RSA-SHA256 验签。
4. 时间容差 **45 分钟**（重试会复用原始签名，5 分钟会误拒合法重试）。
5. 按 payload 的 `mode` 选 `test` / `prod` 公钥；两套都是平台级，在 Dashboard → Settings → Webhooks 复制，注册 webhook 时不会返回。

```js
const verifier = crypto.createVerify('RSA-SHA256');
verifier.update(`${t}.${rawBody}`);
const ok = verifier.verify(publicKey, v1, 'base64');
```

**响应**：只需 2xx、10 秒内，body 内容无所谓。`/api/webhook` 返回 `{"received":true}`。

## 3. 事件 → 授权映射

| eventType | 处理 |
|---|---|
| `order.completed` | Buyout 一次性付款 → 签发永久 license |
| `subscription.activated` | Care 首付款 → 签发 license |
| `subscription.renewed` / `recovered` / `canceling` / `plan_changed` | 保持 active（`canceling` 要保留到 `currentPeriodEnd`） |
| `subscription.canceled` / `refund.succeeded` | canceled |
| `subscription.past_due` | past_due |
| **`subscription.payment_succeeded`** | **刻意忽略**：官方说明首付款会同时发 `activated` 和它，两个都开通会重复发放 |
| 其他 | 返回 2xx 忽略，避免无谓重试 |

去重键：`eventType + eventId`（写 `webhook_events` 表或 `.data/` 兜底），因为 Waffo 最多重试 4 次。

**关键字段**：`data.orderId`、`data.paymentId`、`data.buyerEmail`、`data.orderMetadata`、`data.orderStatus`、`data.currentPeriodEnd`。Pancake **没有** `customerId` / `subscriptionId` 字段，适配器用 buyerEmail / orderId 归一化。

## 4. 付款 → 下载授权（license gate）

`/api/webhook` 验签通过后：

1. 用 `(eventType, eventId)` 去重；
2. 有 `userId` 时 upsert `subscriptions` 表（Supabase 未配置只告警，不吞订单）；
3. 签发离线 license key（`SK1.<payload>.<HMAC>`），Buyout 永久、Care 带 `currentPeriodEnd` 或 35 天；
4. 记录到 `licenses` 表，可在 `/admin/licenses` 查看并复制发给客户；
5. 客户在 `/license` 兑换（写入 httpOnly cookie），或**用下单邮箱登录自动认领**。

`POST /api/generate` 的授权顺序：离线 key → 登录态订阅/邮箱认领 → 否则 402。**匿名访客永远拿不到源码 ZIP**（下载本身就是商品），只能下载 `POST /api/generate/preview` 的无源码预览包（文件清单 + 设计令牌，额度按访客令牌 + 网络双桶计数）。`LICENSE_SECRET` 必配（否则签不出 key）；`LICENSE_GATE=auto` 在**任何生产部署**都恒开（fail-safe）；生成给客户的模板里 `lib/env.ts` 默认改成 `LICENSE_GATE=off`，因此**客户项目里这道锁是关闭的**。

## 5. Acquiring 模式（如果你的账户是这套）

Webhook 已按官方实现：`X-SIGNATURE` 是 base64 的 RSA-SHA256(rawBody)，用 Waffo 公钥验；事件为 `PAYMENT_NOTIFICATION` 等，`result.acquiringOrderId` / `result.orderStatus=PAY_SUCCESS`。响应返回 `{"message":"success"}`。

**下单 `POST /api/v1/order/create` 已实现**（`createCheckoutAcquiring()`），但**所有商户合同字段必须由环境变量提供**，适配器绝不凭空发明。必填体按本节字段清单组装：

```
merchantInfo, merchantOrderId, notifyUrl, orderCurrency, orderDescription,
orderRequestedAt, paymentInfo, paymentRequestId, userInfo
```

| 字段 | 来源 |
|---|---|
| `merchantInfo` | `WAFFO_ACQUIRING_MERCHANT_INFO`（JSON 字符串，结构按合同） |
| `userInfo` | `WAFFO_ACQUIRING_USER_INFO`（JSON 字符串，结构按合同） |
| `paymentInfo` | `WAFFO_ACQUIRING_PAYMENT_INFO`（JSON 字符串，结构按合同） |
| `orderCurrency` | `WAFFO_ACQUIRING_ORDER_CURRENCY`（标量，如 `USD`） |
| `orderDescription` | `WAFFO_ACQUIRING_ORDER_DESCRIPTION`（标量） |
| `notifyUrl` | 运行时生成：`NEXT_PUBLIC_SITE_URL` + `/api/webhook`（单一 webhook 入口） |
| `orderRequestedAt` | 运行时生成：当前时间 ISO 8601 |
| `merchantOrderId` | 运行时生成：`SK-<plan>.<userId>-<randomUUID>`（crypto 随机、可追溯） |
| `paymentRequestId` | 运行时生成：`randomUUID()` |

缺任何一个合同变量时，`lib/env.ts` 会抛出**指明变量名和取值位置**的错误（去你的 Waffo 商户合同 / `waffo.com/docs` 集成指南复制，make1day 不代填）。此外还必填 `WAFFO_PRIVATE_KEY`（PEM，用于 RSA-SHA256 请求签名）与 `WAFFO_WEBHOOK_PUBLIC_KEY`（验签 webhook）。

可在 `.env.example` 的「Acquiring」段找到变量清单。`GET /api/payments/self-check` 的 `waffo.missing` 会列出所有仍缺失的 `WAFFO_ACQUIRING_*` 变量，`node scripts/waffo-preflight.mjs` 也会按 flavor 检查。

### 需按你的 Waffo 合同核对（不确定的协议细节）

以下细节**公开文档没有写清，本实现是尽力而为、不是已验证事实**，上线前必须按你自己的合同 / 联调结果核对：

- **签名串**：Acquiring 的签名 canonical 未公开。`WAFFO_ACQUIRING_SIGN_MODE` 做成可配置项：`pancake`（默认）复用 Pancake 的 `METHOD\nPATH\nTS\nBASE64(SHA256(BODY))` 并带 `X-Merchant-Id` / `X-Timestamp` / `X-Signature` 头；`raw` 改为对原始 body 直接签名。具体字段、头名、大小写以合同为准。
- **9 个字段的精确名称 / 嵌套结构 / 必填子字段**：`merchantInfo` / `userInfo` / `paymentInfo` 的内部结构是合同约定的 JSON，这里只做透传，不校验子字段。
- **`orderRequestedAt` 的格式**（ISO 8601 还是其它）与 `orderCurrency` 的取值域。
- **响应结构**：文档提到 `data.orderAction` 是 JSON 字符串，内含 `webUrl` / `deeplinkUrl`；适配器已兼容这几种包装并优先返回 `url`。**如果网关只返回订单号**，`CheckoutResult` 会带 `orderId`，但本站 `POST /api/checkout` 目前只对 `url` / `approvalUrl` 做跳转（否则 502）——这种合同需要另接跳转逻辑。
- **webhook 回传的归属信息**：`plan` / `userId` 目前只编码在 `merchantOrderId` 前缀里；`normalizeAcquiringEvent()` 读的是通知里的 `metadata`。若你的合同通知不回传这些字段，订单无法归属到用户/套餐，需要在合同允许的自定义字段里携带并相应调整归一化逻辑。
- **RSA 密钥**：请求签名用商户私钥、webhook 验签用 Waffo 公钥，二者是否同一对、如何分发，以合同为准。

**静态自检不证明能真实扣款**：配置齐全后仍必须按 `docs/waffo-launch-checklist.md` 做一笔 test 付款，确认签名、字段与响应都和你的合同一致。

## 6. 上线自检清单

> **完整联调手册**：[`docs/waffo-launch-checklist.md`](waffo-launch-checklist.md)
> （后台字段逐项对照、test→prod 切换、端到端 9 步、故障排查速查）。
> **可直接填的 env**：`.env.waffo-pancake.example`（`cp` 成 `.env.local` 后替换所有 `REPLACE_ME_*`）。

```bash
# 本地静态自检：不联网、不打印密钥；--strict 时 WARN 也会失败
node scripts/waffo-preflight.mjs --strict
# 线上配置自检：只返回配置状态，不返回任何密钥
curl https://<domain>/api/payments/self-check | jq
```

- [ ] `waffo.missing` 为空；`license.secretConfigured=true`
- [ ] Pancake 后台建好两个产品，填入 `WAFFO_PRICE_ID_BUYOUT` / `_CARE`
- [ ] 单一 webhook `POST https://<domain>/api/webhook` 已在后台注册
- [ ] `WAFFO_WEBHOOK_PUBLIC_KEY_TEST` / `_PROD` 两套公钥都填了
- [ ] `LICENSE_SECRET`（`openssl rand -hex 32`）、`ADMIN_USER` / `ADMIN_PASSWORD` 已设置
- [ ] 执行 `supabase/migrations/0003_licenses.sql`（生产幂等 + 授权持久化）
- [ ] Test 卡 `4576 7500 0000 0110` 跑通，`/admin/licenses` 出现新 key
- [ ] 用该 key 在 `/license` 兑换，`/builder` 能下载 ZIP
- [ ] 切 prod 密钥，重新验一次 webhook（test 公钥验不了 prod 事件）

## 7. 已废弃 / 不再有效的旧配置

| 旧项 | 现状 |
|---|---|
| `WAFFO_WEBHOOK_SECRET` + HMAC-SHA256 验签 | ❌ 两套 Waffo 都是 RSA；保留变量仅为兼容旧 env，不参与验签 |
| `WAFFO_API_BASE=https://api.waffo.com` + `/v1/checkout/session` | ❌ 假想端点；Pancake 是 `https://api.waffo.ai` + `/v1/actions/checkout/create-session` |
| body `mode: "payment" \| "subscription"` | ❌ Pancake 用 `productType: "onetime" \| "subscription"` |
| `WAFFO_API_KEY` Bearer 鉴权 | ❌ Pancake 用 Store-Slug 或 RSA 签名头 |
