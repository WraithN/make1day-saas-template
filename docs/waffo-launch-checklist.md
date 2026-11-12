# Waffo Pancake 上线联调清单（make1day）

> 适用前提：`PAYMENT_PROVIDER=waffo` 且 `WAFFO_FLAVOR=pancake`（`docs.waffo.ai` 那套 MoR 产品）。
> 依据 `lib/payments/waffo.ts` 的实际请求/验签逻辑与 `docs/waffo.md` 的官方协议整理。
> **本清单按官方公开文档编写，尚未与你的真实商户后台联调**：后台菜单名称可能随版本变化，字段值一律以你的 Dashboard 为准。
> 如果你签的是 `waffo.com` 的 Acquiring，请**停止**本清单（本清单只针对 Pancake），见 `docs/waffo.md` 第 5 节——下单已实现，但 `merchantInfo` / `userInfo` / `paymentInfo` 等合同字段必须由 `WAFFO_ACQUIRING_*` 环境变量提供，签名串与响应结构需按你的 Waffo 合同核对。

---

## 0. 先做一次身份确认

| 判断依据 | Pancake（本清单） | Acquiring（不适用） |
|---|---|---|
| 你登录的域名 | `docs.waffo.ai` / Pancake 商户后台 | `waffo.com` |
| 产品形态 | MoR：平台代收款、代缴税，个人可卖数字产品 | 东南亚收单网关，商户自己收单 |
| 下单端点 | `/v1/actions/checkout/create-session` | `/api/v1/order/create` |
| 订单标识 | `productId`（= 产品 ID，无独立 price） | `merchantOrderId` + 大段 merchantInfo |

确认后再继续。把 `WAFFO_FLAVOR` 写死为 `pancake`，不要留空靠默认值。

---

## 1. 后台字段 → env 对照表（逐项抄）

| # | 后台取值位置 | 填入的变量 | 格式 / 校验 | 常见错误 |
|---|---|---|---|---|
| 1 | Store Settings → **Store Slug**（公开店铺标识） | `WAFFO_STORE_SLUG` | 纯 slug，小写字母数字与连字符，**不带 `https://`** | 误填 Store ID 或完整店铺 URL |
| 1b | *（二选一）* API Key 页 → **Merchant ID** + 生成的 **RSA 私钥** | `WAFFO_MERCHANT_ID`、`WAFFO_PRIVATE_KEY` | 私钥为 PEM，单行 env 里用 `\n` 表示换行；`env.waffoPrivateKey()` 会还原 | 与 Store Slug 同时配置（官方互斥）；私钥带真实换行导致 env 解析截断 |
| 2 | 环境切换 | `WAFFO_ENVIRONMENT` | `test` \| `prod`，决定请求头 `X-Environment` 与验签公钥选择 | test 下单、prod 公钥验签（必然 400） |
| 3 | Products → **一次性产品**（Buyout $249，BF $174）ID | `WAFFO_PRICE_ID_BUYOUT` / `_BF` | `PROD_…`；币种 USD；产品类型 onetime | 用订阅产品 ID → 客户被按月扣款 |
| 4 | Products → **月订阅产品**（Care $19/mo，BF $13/mo）ID | `WAFFO_PRICE_ID_CARE` / `_BF` | `PROD_…`；币种 USD；产品类型 subscription | 与 Buyout 填同一个 ID |
| 5 | Settings → Webhooks → **Webhook Public Key（test）** | `WAFFO_WEBHOOK_PUBLIC_KEY_TEST` | PEM **`BEGIN PUBLIC KEY`**，平台级，不是商户密钥 | 误填私钥或商户 API Key |
| 6 | Settings → Webhooks → **Webhook Public Key（prod）** | `WAFFO_WEBHOOK_PUBLIC_KEY_PROD` | 同上；**两套都要填**，因为重试会跨环境 | 只填 test，切 prod 后所有事件 400 |
| 7 | Settings → Webhooks → Endpoint URL | 固定写 `https://<你的域名>/api/webhook` | 全站**唯一**一个 webhook 路由，POST + raw body | 注册成 `/api/webhooks/waffo`（旧文档错误地址） |
| 8 | — | `WAFFO_API_BASE` / `WAFFO_CHECKOUT_PATH` | 保持默认：`https://api.waffo.ai` + `/v1/actions/checkout/create-session` | 改成旧版假想端点 `api.waffo.com/v1/checkout/session` |
| 9 | 站点公开地址 | `NEXT_PUBLIC_SITE_URL` | 生产必须是 `https://` 真实域名；结账 `successUrl`、canonical、sitemap、llms.txt 全依赖它 | 留 `localhost:3000`，客户付款后跳回本地 |
| 10 | 生成随机串 `openssl rand -hex 32` | `LICENSE_SECRET` | ≥32 字符，仅服务端 | 为空 → 生产不签发 license，付费用户也下载不了（门禁本身不受它影响，`auto` 在生产恒开） |
| 11 | — | `LICENSE_GATE` / `FREE_GENERATIONS_PER_DAY` | `auto`（生产恒开，fail-safe）/ `on` / `off`；匿名**预览包**额度默认每访客每天 1 次（另按网络 20 次封顶） | 误在**客户模板**里设 `on`（模板已强制 `off`）；生产设 `off` = 白送源码 |
| 12 | 自建管理员账号 | `ADMIN_USER` / `ADMIN_PASSWORD` | 必填；否则 `/admin` 与 `/admin/licenses` 公开 | 上线忘设，已签发 license key 可被任意查看 |
| 13 | Supabase Project Settings → API | `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY` | service role 仅服务端 | 把 service role 填进 `NEXT_PUBLIC_` |
| 14 | Supabase SQL Editor | 执行 `supabase/migrations/0003_licenses.sql` | 建 `licenses` + `webhook_events`，RLS 开启、仅 service role 可写 | 不执行 → 落 `.data/*.json`，serverless 上重启即丢 |

**不要设置**：`WAFFO_WEBHOOK_SECRET`（旧 HMAC 假设，不参与验签）、`WAFFO_API_KEY`（Pancake 不用 Bearer）、`WAFFO_WEBHOOK_PUBLIC_KEY`（那是 Acquiring 的单公钥变量）。

---

## 2. 本地静态自检（不联网、不打印密钥）

```bash
cp .env.waffo-pancake.example .env.local   # 只保留 Pancake 必填项，逐项替换 REPLACE_ME
node scripts/waffo-preflight.mjs            # 或 npm run waffo:preflight
node scripts/waffo-preflight.mjs --strict  # 上线前用：WARN 也会让退出码变 1
node scripts/waffo-preflight.mjs --env .env.production.local
```

脚本检查：flavor / environment、Store-Slug 与 API-Key **互斥**、PEM 头尾、两个产品 ID 不重复且非占位、两套公钥、`LICENSE_SECRET` 长度、站点 URL、Supabase 三项、Admin 密码、废弃变量残留。它**不会**发起任何网络请求，也不会输出密钥内容，只显示 `<set: N chars>`。

`FAIL` 必须清零；`--strict` 下 `WARN` 也必须清零。

---

## 3. 部署后的线上自检

```bash
curl -fsS https://<你的域名>/api/payments/self-check | jq
```

期望：

```json
{
  "provider": "waffo",
  "waffo": {
    "flavor": "pancake",
    "environment": "test",
    "auth": "store-slug (public)",
    "apiBase": "https://api.waffo.ai",
    "checkoutPath": "/v1/actions/checkout/create-session",
    "webhookUrl": "/api/webhook",
    "priceIdsConfigured": { "buyout": true, "care": true },
    "missing": [],
    "ready": true
  },
  "license": { "secretConfigured": true, "gateEnabled": true, "freeGenerationsPerDay": 1 },
  "ready": true
}
```

`waffo.missing` 非空时**不要**开始真实收款。该端点只回配置状态，不回任何密钥。

---

## 4. Test 模式端到端联调（按此顺序）

1. `WAFFO_ENVIRONMENT=test`，用 test 公钥，注册 test webhook 指向测试域名。
2. 用 Supabase 邮箱登录 → `/pricing` 点 Buyout → `POST /api/checkout` 应返回 `{ "url": "https://…" }`。
   - 适配器实际发出：`productId=WAFFO_PRICE_ID_BUYOUT`、`productType:"onetime"`、`currency:"USD"`、`buyerEmail`、`metadata:{plan:"buyout",userId,source:"shipkit"}`、`successUrl:${NEXT_PUBLIC_SITE_URL}/dashboard?welcome=1`。
3. 用官方测试卡 `4576 7500 0000 0110` 完成付款（其余测试卡号以 Pancake 后台为准）。
4. 后台应看到 `order.completed` 投递到 `/api/webhook`；本站返回 `{"received":true}` 且 HTTP 2xx。
5. 打开 `/admin/licenses`：出现 1 条 `plan=buyout`、邮箱与下单一致的 `SK1.…` key。
   - 同时确认 `webhook_events` 里该 `(eventType, eventId)` 只有 1 条。
6. **手动重放同一个事件**（后台 Retry）：license 数量仍为 1，无重复发码。
7. 用该 key 到 `/license` 兑换（写 httpOnly `sk_license`），或在 Builder 的授权面板粘贴 → `/builder` 能下载 ZIP，响应头 `X-ShipKit-Entitlement: license-key`。
8. 再跑一遍 Care（月订阅）路径：期望 `subscription.activated` 发码；**`subscription.payment_succeeded` 必须被忽略**，否则首付款会重复开通。
9. 检查取消/退款：`subscription.canceled` / `refund.succeeded` 应把状态置 canceled；`subscription.canceling` 要保留到 `currentPeriodEnd`。

> 未登录匿名下载：`POST /api/generate` 一律返回 `402 PAYMENT_REQUIRED`（带 `pricingUrl` / `licenseUrl` / `previewAvailable`）——**匿名永远拿不到源码 ZIP，下载本身就是商品**。匿名只能下载 `POST /api/generate/preview` 的**无源码预览包**（文件清单 + 设计令牌），额度按访客令牌 + 网络双桶计数；完全不想要预览就设 `FREE_GENERATIONS_PER_DAY=0`。

---

## 5. 切 Prod 的差异（逐项换，别只换一个）

| 项 | Test | Prod |
|---|---|---|
| `WAFFO_ENVIRONMENT` | `test` | `prod` |
| 请求头 `X-Environment` | `test` | `prod` |
| 验签公钥 | `WAFFO_WEBHOOK_PUBLIC_KEY_TEST` | `WAFFO_WEBHOOK_PUBLIC_KEY_PROD` |
| 产品 ID | test 环境产品 | **prod 环境重新创建**的产品 ID（不通用） |
| Webhook 注册 | 测试域名 | 生产域名，同一个 `/api/webhook` 路径 |
| `NEXT_PUBLIC_SITE_URL` | 测试域名 | 正式 https 域名 |
| 卡号 | 测试卡 | 真实小额付款自测 |

**最容易踩的坑**：test 公钥验不了 prod 事件（验签直接 400，Waffo 重试 4 次后丢弃订单）。切环境后必须重新走一遍第 4 节。

---

## 6. 故障排查速查

| 症状 | 最可能原因 | 处理 |
|---|---|---|
| `/api/webhook` 400 验签失败 | 公钥环境不匹配 / 用了 `JSON.stringify` 后的 body / 把 `X-Waffo-Signature` 解析错 | 必须用 **raw body 字符串** 验 `${t}.${rawBody}`；检查 payload `mode` 对应的公钥 |
| 所有事件都 400，重试 4 次后消失 | 只填了 test 公钥 | 补 `WAFFO_WEBHOOK_PUBLIC_KEY_PROD` |
| `/api/checkout` 500，信息含 product id | `WAFFO_PRICE_ID_BUYOUT` / `_CARE` 未填或填了占位符 | 跑 preflight；Pancake 里产品 ID 就是价格 ID |
| 下单成功但客户被按月扣款 | Buyout 绑成了订阅产品 | 后台把 Buyout 产品改成 onetime |
| `/api/generate` 一直 402 | 这是**预期行为**（匿名无授权）；付费用户也 402 则是 `LICENSE_SECRET` 未配或 key 无效 | 看响应头 `X-ShipKit-Entitlement`（付费应为 `license-key` / `subscription`）；客户模板 `.env.example` 必须是 `LICENSE_GATE=off` |
| 付款成功但 `/admin/licenses` 没 key | webhook 未注册、验签失败、或 0003 迁移没执行导致写库失败 | `self-check` → 后台投递日志 → `/admin` → Supabase 表；写库失败时本站返回 500 让网关重试 |
| 重复发码 | 事件去重键缺失 | 去重键是 `eventType + eventId`，确认 `webhook_events` 表存在 |
| 付款后跳回 localhost | `NEXT_PUBLIC_SITE_URL` 未改 | 改成正式域名并重新部署（该值在构建期被注入） |
| PEM 相关报错 | env 里用了真实换行 / 忘了 `\n` 转义 | 单行 PEM，头尾完整；preflight 会校验 |
| 同时配了 Slug 和 Merchant ID | 官方明确互斥 | 删掉其中一套，preflight 会直接 FAIL |

---

## 7. 上线前最终勾选

- [ ] 已确认账户是 **Waffo Pancake**（不是 Acquiring）
- [ ] `node scripts/waffo-preflight.mjs --strict` 退出码 0
- [ ] `/api/payments/self-check` 的 `waffo.missing=[]` 且 `ready=true`
- [ ] 两个产品 ID 分别对应 onetime Buyout / monthly Care，币种 USD
- [ ] 唯一 webhook `https://<域名>/api/webhook` 已在 **test 和 prod** 都注册
- [ ] test / prod 两套 Webhook Public Key 均已配置
- [ ] `LICENSE_SECRET`、`ADMIN_USER`、`ADMIN_PASSWORD` 已设置
- [ ] `supabase/migrations/0003_licenses.sql` 已执行
- [ ] `NEXT_PUBLIC_SITE_URL` 是正式 https 域名
- [ ] Test 卡跑通：付款 → 发码 → 重放不重复 → 兑换 → 下载 ZIP
- [ ] Care 订阅路径跑通，且 `payment_succeeded` 未造成重复授权
- [ ] 切 prod 后重新跑过一次完整链路

---

## 8. 边界与诚实说明

- `/api/payments/self-check` 与 preflight 都只检查**配置状态**，不能证明 Waffo 后台真的能扣款；必须真实跑一笔。
- `.data/*.json` 兜底与 RAG 内存索引在 serverless 上不持久；生产请依赖 Supabase 迁移。
- `/admin` 未设 `ADMIN_USER` / `ADMIN_PASSWORD` 且没有 Supabase 管理员时，生产环境直接返回 503（关闭），开发环境仅显示醒目警告。
- 本清单没有覆盖 Acquiring、多币种、税费配置与退款人工流程，这些属于商户后台运营范畴。
