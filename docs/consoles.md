# 用户后台 / 管理员后台

> 一套源码，两个后台：本站 `/account`、`/admin` 与**生成模板里的两套后台是同一份代码**。
> Builder 里 `features=account` / `features=admin` 分别控制是否把整棵路由树打进 ZIP。

## 1. 为什么这样设计

生成器的打包逻辑（`lib/generator/pack.ts`）复制的是本站源码树，而不是另写一份模板。
因此「模板也需要这两个」最稳妥的做法是：在站点里把两套后台做成**真实可运行、可独立裁剪的模块**，
再由 `computeSkip()` 按勾选项剪枝。这样不存在「站点版」和「模板版」文档/行为漂移。

## 2. 路由与职责

| 路由 | 受众 | 内容 | 数据来源 |
|---|---|---|---|
| `/account` | 登录用户 | 概览：资料、订阅、授权、快捷入口 | `getAccountSnapshot()` |
| `/account/billing` | 登录用户 | Supabase `subscriptions` 行：套餐、支付商、状态、续费日 | `lib/subscriptions.ts` |
| `/account/licenses` | 登录用户 | 按邮箱过滤的授权码、到期时间、订单号 | `getMyLicenses()` |
| `/account/settings` | 登录用户 | 资料编辑（display name / full name / company）+ 语言 / 主题 / 会话 / 退出登录 | `ProfileForm` + `SignOutButton` |
| `/admin` | 运营者 | KPI：已签发授权、浏览量、已知账户 | `getAdminSnapshot()` |
| `/admin/users` | 运营者 | 用户列表 + 角色列（admin/staff/member），管理员可改他人角色 | `profiles` + `UserRoleSelect` |
| `/admin/licenses` | 运营者 | 全部已签发授权码 | `listLicenses()` |
| `/admin/orders` | 运营者 | 订单流水：客户、支付商、套餐、金额、状态、订单号 | `getAdminSnapshot().orders` ← `lib/orders.ts` |
| `/admin/access` | 运营者 | 付费查看聚合：付费邮箱用户数、已签发授权数、订阅记录数、最近授权明细 | `getAdminSnapshot().access` |
| `/admin/stats` | 运营者 | 第一方页面浏览统计 | `getStats()` |
| `/admin/system` | 运营者 | 只读运行时开关，**不显示密钥值**（含当前支付商与切换说明） | 环境变量推导 |

两个后台共用：

- `components/console/ConsoleNav.tsx` — 客户端 tab 导航（高亮当前路由）
- `components/console/ConsoleUI.tsx` — 卡片 / 统计块 / 键值表 / 数据表 / 提示条
- `lib/console.ts` — 服务端数据聚合与权限判定
- `lib/content/console.ts` — 完整 en / zh / ja / fr 四语文案
- `components/console/SignOutButton.tsx` — 仅用户后台使用（不依赖 demo dashboard 的 `SignOut`）

页面都是 `force-dynamic` 的 Server Component，`layout.tsx` 统一输出 `noindex` metadata。
`robots.ts` 显式 disallow `/account`、`/admin`，sitemap 不收录。

## 3. 权限模型（真 RBAC + 会话校验）

角色持久化在 `profiles.role`，取值 `admin | staff | member`（由 `supabase/migrations/0004_profiles_rbac.sql` 创建）。
`/admin` 不再只是 Basic Auth + 邮件白名单，而是**基于角色的访问控制**：

| 区域 | 第一层（会话） | 第二层（RBAC 角色） | 未配置 Supabase 时 |
|---|---|---|---|
| `/account`（含 `/dashboard`） | `middleware.ts` 用 `supabase.auth.getUser()` 校验会话；demo 模式用 `sk_demo` cookie | — | 跳过 gating（方便模板预览），UI 显示「未登录」 |
| `/admin` | 必须已登录——`getUser()` 返回空则 307 跳转 `/login?redirect=/admin` | 登录用户的 `profiles.role` 须为 `admin` 或 `staff`，或命中 `ADMIN_EMAILS` 种子；否则返回 **403** | 跳过角色 gating（仍受 Basic Auth 约束，见下） |

要点：

- 角色读取走 SECURITY DEFINER 函数 `is_staff_or_admin()`，配合 RLS：`profiles` 仅 admin/staff 可读全部行；本人可改 `display_name / full_name / company`，但 RLS 的 WITH CHECK **禁止自改 `role`**（防自提权）。
- `ADMIN_EMAILS` 种子邮箱在访问 `/admin` 时由 `ensureSeedAdmins()` 幂等提升为 `role='admin'`（需 `SUPABASE_SERVICE_ROLE_KEY`）。既是首登兼容，又让「白名单」成为真实持久化角色，而非仅运行时判断。
- Basic Auth（`ADMIN_USER` / `ADMIN_PASSWORD`）保留为**可选第二因素**，叠在 RBAC 之上；未配置时该层不生效。
- `/admin/system` 只输出「已配置 / 未配置」标志与数量，从不打印邮箱列表、密钥或完整 env 值。
- 授权码只在登录用户自己的 `/account/licenses` 和管理员 `/admin/licenses` 展示，不进日志、统计或 JSON-LD。

## 3.5 付费查看（Paid access）/ 订单 / 付费墙样例

两类需求都来自「ShipKit 站 + 生成模板都要」：在后台看得到，模板里也有可运行样例。

### 订单数据层（支付商无关 / provider-agnostic）

`lib/orders.ts` 维护一张 `orders` 表（`supabase/migrations/0005_orders.sql`）：

- 字段：`provider`、`provider_order_id`（与 `provider` 联合唯一）、`customer_email`、
  `plan`、`amount numeric(12,2)`、`currency`、`status`、`created_at`。
- 写入：webhook 落地后由 `app/api/webhook/route.ts` 调 `recordOrder()`，按
  `provider + provider_order_id` **幂等 upsert**；Supabase 不可用时回退到
  `.data/orders.json`（带串行写入队列，避免并发撕裂）。
- 读取：`listOrders()` 取最近 100 条给 `/admin/orders`。

四种支付商（Stripe / Creem / PayPal / Waffo）的 `verifyWebhook` 在归一化事件
（`NormalizedSubEvent`）里都填充 `amount` / `currency`，金额走 `toMajor()`
做最小单位 → 主单位换算（JPY / KRW 等零小数货币自动处理），因此订单金额与
具体网关解耦，后台无需为每家写分支。

### 付费查看聚合（/admin/access）

`getAdminSnapshot().access` 由 `readAccess()` 汇总三类来源：

- 已签发授权码（`licenses` 去重邮箱）
- 有效订阅（`subscriptions`）
- 最近 50 条授权明细（`AccessGrant { email, plan, type: license|subscription, since }`）

页面展示三张统计卡（付费邮箱用户 / 已签发授权 / 订阅记录）+ 明细表。

### 付费墙样例页（/premium，站点与模板共用）

`app/premium/page.tsx` 是一个**可运行的付费墙样例**：

- 服务端用 `headers()` 构造 `Request` 调 `checkEntitlement(req)`，按授权网关判定是否放行；
- 放行 → 渲染付费内容；未放行 → 显示「用套餐解锁」CTA（指向 `/pricing`）；
- `LICENSE_GATE` 关闭时显示提示条（内联样式，不依赖 `components/console/ConsoleUI`，
  因此两套后台被剪枝时 /premium 仍可独立存活）；
- 四语文案在 `lib/i18n-core.ts` 的 `premium.*` 键下。

> 此页是「模板里也要有付费墙样例」的落地：克隆出的客户工程直接带一个能跑的内容
> 付费墙，配合任意支付商即可上线。

## 4. 数据边界（不虚构功能）

- 用户列表：配置 `SUPABASE_SERVICE_ROLE_KEY` 时从 `profiles` 读取角色映射（`getRolesByEmail()`）；否则只从 `licenses` 与 `subscriptions` 推导，页面明确标注「不完整」。
- 订阅：买断是离线授权码，可能没有 `subscriptions` 行，账单页会提示去授权页查看。
- 用户后台**资料可编辑**：登录用户经 `/api/profile` PATCH 自己的 `display_name / full_name / company`（`ProfileForm` 客户端岛提交，service 层清洗长度并受 RLS 锁定）；`role` 字段不在此接口接受，只走管理员端点。
- 角色管理：仅 `admin` 可经 `/api/admin/users` PATCH 他人 `role`（service role 直写，受 `canManageRoles` 校验；且禁止改自己）；`staff` 只读用户目录。
- `.data/*.json` 与内存 RAG 索引在 serverless 环境不持久；授权与 webhook 幂等生产应执行 `supabase/migrations/0003_licenses.sql`。

## 5. Builder / 剪枝

`lib/generator/config.ts` 新增两个 `Feature`：

```ts
"account" | "admin"
```

`lib/generator/schema.ts` 的 `features` 枚举同步扩到 6 项，`DEFAULT_CONFIG` 两项默认勾选。

`computeSkip()` 的规则：

| 勾选 | 保留 | 剪掉 |
|---|---|---|
| 两个都选 | 两套路由树 + 共享层 | — |
| 只选 account | `/account/*` + 共享层 | `/admin/*` |
| 只选 admin | `/admin/*` + 共享层 | `/account/*` |
| 都不选 | — | 两套路由树（含 `/admin/orders`、`/admin/access`）+ `components/console/*` + `lib/console.ts` + `lib/content/console.ts` |

`/premium` 是**通用站点页**（非后台），不在 `ADMIN_FILES` 内，两套后台都被剪枝时
仍独立存活——它内联了自己的提示样式，不依赖 `components/console/ConsoleUI`。

配套 rewrite（`lib/generator/prune.ts`）：

- `pruneNav()`：`/account` 被剪时，Nav 账户入口改指 `/dashboard`（若保留）或 `/login`。
- `prunePostLoginRedirects()` / `pruneDemoRoute()`：登录、OAuth 回调、结账成功、demo 登录的字面量统一改指真实存在的路由。
- `pruneAdminLink()`：只保留用户后台时，「管理员后台」快捷入口改指 `/` 并换成「返回站点」文案，不留死链。
- `pruneStylesLink()` / `pruneStylesSitemap()`：`/styles` 是 ShipKit 站点自有的营销页（导入站点自己的 `lib/generator/themes`，不进模板），从生成的 `Nav.tsx` 与 `sitemap.ts` 中剪掉，避免每个客户工程出现指向 404 的导航项。
- `app/api/profile/route.ts` 随 `account` 剪枝；`app/api/admin/users/route.ts` 随 `admin` 剪枝（见 `ACCOUNT_FILES` / `ADMIN_FILES`）。
- `app/styles/page.tsx` 与 `components/StylePlayground.tsx` 列入 `SITE_ONLY_FILES`，与 `app/agent-ready/page.tsx` 同等处理。
- `scripts/lib/ai-docs.mjs` 增加 `account` / `admin` 两条条件 scoped rule，`AGENTS.md` 按选项目动写明两套后台是否存在。

`scripts/verify-matrix.mjs` 的 16 组矩阵包含 `account-only`、`admin-only` 与两者皆无的组合，
逐组断言 ZIP 内文件存在性、共享层存活、Nav/回调无死链，并在解压工程里跑 `tsc --noEmit`。

## 6. 上线配置

```bash
ADMIN_USER=admin
ADMIN_PASSWORD=<强密码>
ADMIN_EMAILS=you@example.com,ops@example.com   # 种子管理员邮箱，首次访问 /admin 时自动提升为 role=admin（需 SUPABASE_SERVICE_ROLE_KEY）
SUPABASE_SERVICE_ROLE_KEY=<service role>        # 用于完整用户目录 + 角色提升/管理
```

角色提升发生在访问受保护后台时（`ensureSeedAdmins()` 幂等），无需手动跑 SQL；但 `0004_profiles_rbac.sql` 必须在部署后执行。
未配置 Supabase 时 `/admin` 仍按设计保持开放（跳过 gating），一旦配置即按 RBAC 收紧。检查顺序：

1. `npm run waffo:preflight -- --strict`（含 Admin 变量）
2. 部署后执行 `supabase/migrations/0004_profiles_rbac.sql`
3. 用 admin 邮箱登录后访问 `/admin/system`，确认角色显示为 Admin、Basic Auth 显示「开启」
4. 用一个 `member` 角色账号访问 `/admin`，应返回 **403**
5. 用 admin 在 `/admin/users` 将某邮箱改为 `staff` / `admin`，该账号随后即可进入 /admin
6. 用白名单账号访问 `/account/settings`，确认资料编辑可保存

## 7. 相关文件

`app/account/**`、`app/admin/**`、`app/premium/page.tsx`、`components/console/**`、
`lib/console.ts`、`lib/orders.ts`、`lib/content/console.ts`、`lib/rbac.ts`、`middleware.ts`、
`app/api/profile/route.ts`、`app/api/admin/users/route.ts`、`app/api/webhook/route.ts`、
`supabase/migrations/0004_profiles_rbac.sql`、`supabase/migrations/0005_orders.sql`、
`lib/generator/{config,schema,prune,pack,templates}.ts`、
`scripts/lib/ai-docs.mjs`、`scripts/verify-matrix.mjs`、
`.github/workflows/generated-matrix.yml`。
