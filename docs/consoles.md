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
| `/admin/users` | 运营者 | 用户列表 + 角色列（admin/staff/member），管理员可改他人角色 | Supabase Auth + `profiles`，或本地 SQLite `profiles` 表 + `UserRoleSelect` |
| `/admin/licenses` | 运营者 | 全部已签发授权码 | `listLicenses()` |
| `/admin/orders` | 运营者 | 订单流水：客户、支付商、套餐、金额、状态、订单号 | `getAdminSnapshot().orders` ← `lib/orders.ts` |
| `/admin/access` | 运营者 | 付费查看聚合：付费邮箱用户数、已签发授权数、订阅记录数、最近授权明细 | `getAdminSnapshot().access` |
| `/admin/stats` | 运营者 | 第一方页面浏览统计 | `getStats()` |
| `/admin/system` | 运营者 | 只读运行时开关，**不显示密钥值**（含当前支付商与切换说明） | 环境变量推导 |

两个后台共用：

- `components/console/ConsoleNav.tsx` — 客户端 tab 导航（高亮当前路由）
- `components/console/ConsoleUI.tsx` — 卡片 / 统计块 / 键值表 / 数据表 / 提示条
- `lib/console.ts` — 服务端数据聚合与权限判定
- `lib/content/console.ts` — 完整 en / zh / ja / fr / de 五语文案
- `components/console/SignOutButton.tsx` — 仅用户后台使用（不依赖 demo dashboard 的 `SignOut`）

页面都是 `force-dynamic` 的 Server Component，`layout.tsx` 统一输出 `noindex` metadata。
`robots.ts` 显式 disallow `/account`、`/admin`，sitemap 不收录。

## 3. 权限模型（运营者登录 + 真 RBAC）

`/admin` 有**两条互不依赖**的入口，都是会话校验：

| 入口 | 凭据 | 服务端记录 | 权限 |
|---|---|---|---|
| 运营者账号 | `ADMIN_USER` / `ADMIN_PASSWORD` | 首次使用时播种进 `admin_users`（只存 scrypt 哈希 + 随机盐，明文不落库），换取不透明会话 cookie `sk_admin_session`（HttpOnly / SameSite=Lax / 7 天） | **完整管理员**——它就是这个部署的所有者 |
| Supabase 角色 | 已登录用户的 `profiles.role` | Supabase 会话 | `admin` / `staff` 可进；`staff` 只读用户目录；`member` 不可进 |

未登录时 `/admin` 直接渲染登录屏，**不返回任何后台数据**；深链接带 `?next=`
回跳参数，登录后跳回原页面。

要点：

- 运营者会话存在本地库的 `admin_sessions` 表，服务端可随时吊销、可自动过期；登出会真删会话行，不是只清 cookie。登录失败按 IP 限流（8 次/分钟）。
- Edge 中间件只能校验 cookie **是否存在**（`node:sqlite` 是 Node-only），权威校验放在 Node 侧：`app/admin/layout.tsx` 与各 API 路由。
- 角色读取走 SECURITY DEFINER 函数 `is_staff_or_admin()`，配合 RLS：`profiles` 仅 admin/staff 可读全部行；本人可改 `display_name / full_name / company`，但 RLS 的 WITH CHECK **禁止自改 `role`**（防自提权）。
- `ADMIN_EMAILS` 种子邮箱在访问 `/admin` 时由 `ensureSeedAdmins()` 幂等提升为 `role='admin'`。既是首登兼容，又让「白名单」成为真实持久化角色，而非仅运行时判断。
- 运营者账号等价于 `role='admin'`：`getAdminSnapshot()` 的 `identityKind` 区分 `operator` 与 `supabase`，用户页据此给出不同提示，不再把运营者误判成只读员工。
- `/admin/system` 只输出「已配置 / 未配置」标志与数量，从不打印邮箱列表、密钥或完整 env 值。
- 授权码只在登录用户自己的 `/account/licenses` 和管理员 `/admin/licenses` 展示，不进日志、统计或 JSON-LD。

## 3.5 付费查看（Paid access）/ 订单 / 付费墙样例

两类需求都来自「ShipKit 站 + 生成模板都要」：在后台看得到，模板里也有可运行样例。

### 订单数据层（支付商无关 / provider-agnostic）

`lib/orders.ts` 维护一张 `orders` 表（`supabase/migrations/0005_orders.sql`）：

- 字段：`provider`、`provider_order_id`（与 `provider` 联合唯一）、`customer_email`、
  `plan`、`amount numeric(12,2)`、`currency`、`status`、`created_at`。
- 写入：webhook 落地后由 `app/api/webhook/route.ts` 调 `recordOrder()`，按
  `provider + provider_order_id` **幂等 upsert**；Supabase 不可用时回退到本地
  SQLite 库（`.data/shipkit.db`，`node:sqlite` 内置模块，无需原生依赖）。
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
- 五语文案在 `lib/i18n-core.ts` 的 `premium.*` 键下。

> 此页是「模板里也要有付费墙样例」的落地：克隆出的客户工程直接带一个能跑的内容
> 付费墙，配合任意支付商即可上线。

## 3.6 组织 / 多租户（真实落地）

`multitenancy` 不再是「只有文案的开关」，而是真实脚手架：

- **数据模型**（`supabase/migrations/0007_orgs.sql`）：`organizations`、`memberships`
  （`user_id + org_id + role`，role ∈ `owner/admin/member`）+ `profiles.org_id`。
  带 RLS——成员只可读自己所在组织的行，owner/admin 可改组织。
- **帮助函数** `lib/org.ts`：`getUserOrgs()` / `createOrg()` / `getActiveOrgId()` /
  `requireTenant()`。当前租户用 `sk_org` cookie 记录，查询时应 `.eq("org_id", orgId)`
  做租户隔离。无 Supabase / 无此表时全部优雅降级为空。
- **UI**：`app/account/workspaces`（创建 / 切换工作区，`WorkspaceManager`）、
  `/api/org`（创建并切换）、`/api/org/active`（切换当前租户）。账号导航的
  Workspaces 入口由 `WORKSPACES_HREF` 常量控制，生成器在**未选**多租户时通过
  `pruneWorkspacesLink` 剪掉该入口与 `lib/org.ts` 等文件（build matrix 断言）。

## 3.7 统计持久化 + 后台访问加固

两条此前已知的短板已补齐：

- **统计 durable**：`lib/stats.ts` 在配置 `SUPABASE_SERVICE_ROLE_KEY` 时把
  pageview 计数写入 `pageviews` 表（原子自增 RPC `increment_pageview`，
  `supabase/migrations/0006_observability.sql`），serverless / 多实例下不再丢失；
  未配置时回退到本地 SQLite 库（`.data/shipkit.db`，仅本地开发，非持久）。
- **会话级事件**：`lib/traffic.ts` 记录 `view / cta / checkout / conversion`
  四类事件，带访客与会话 id（30 分钟无活动断新会话），据此算出跳出率、CTR、
  转化率与嵌套漏斗。访客 id 是不透明随机 token（HttpOnly first-party cookie），
  不存 IP / UA；referrer 只保留域名；访客同意 Cookie 后才记录。
- **后台不再默认开放**：`/admin` 与 `/api/stats` 都要求运营者会话。`ADMIN_USER` /
  `ADMIN_PASSWORD` 存在时播种出运营者账号（页内登录，不走 HTTP Basic Auth），
  未配置且没有 Supabase 管理员时，生产返回 **503**（关闭），开发环境给出明确提示。

## 3.8 用户目录与角色：本地 SQLite ↔ Supabase 双后端

用户目录与角色**不再依赖** `SUPABASE_SERVICE_ROLE_KEY` 才能工作。整套后台沿用
授权 / 订单 / 统计那一套「配了 service role 就用 Supabase，否则用本地 SQLite」的约定：

| 部署形态 | 用户目录来源 | 角色来源 | 角色可写 |
|---|---|---|---|
| 配了 `SUPABASE_SERVICE_ROLE_KEY` | Supabase Auth 完整列表 | Supabase `profiles` 表 | 是（service role 直写，绕过 RLS） |
| 未配置（本地开发 / 自托管） | 本地 SQLite `profiles` 表 + 已签发授权 + 订单 + 运营者账号 | 本地 SQLite `profiles` 表 | **是**（真实写入 `.data/shipkit.db`） |

实现要点：

- `lib/sqlite.ts` 的 `SCHEMA` 新增 `profiles` 表，列名与
  `supabase/migrations/0004_profiles_rbac.sql` 对齐（`email` 为主键，另有
  `role / display_name / full_name / company / created_at / updated_at`），
  并用 `addColumnIfMissing()` 给既有库补列。
- `lib/local-profiles.ts` 是本地账户存储层（Node-only，经动态 import 引入，
  避免把 `node:sqlite` 拖进不该出现的构建路径）。
- `lib/rbac.ts` 的 `getRolesByEmail()` / `setUserRole()` / `ensureSeedAdmins()` /
  `resolveAdminRole()` 按 service role 有无自动切换后端，**业务代码零改动**。
- `/admin/users` 的「来源」列改为**逐行标注**：本地账户 / Supabase 账户 /
  授权密钥 / 付费订单 / 运营者账号 / 订阅，每行都说清自己是什么，不再整列一个标签。
- 运营者账号（`ADMIN_USER`，用户名而非邮箱）也会出现在目录首行，角色固定为
  `admin` 且**不可改**——API 侧对「改自己」与「改运营者账号」都做了拦截。

### 从本地切到 Supabase

```bash
# 1. 导出本地账户与角色（JSON 或 SQL）
npm run export:profiles            # JSON 到标准输出
node scripts/export-local-profiles.mjs --sql

# 2. 在 Supabase 建好 Auth 用户后，把导出的行写进 profiles 表
#    （Supabase 的 profiles 以 auth user id 为主键，脚本会提示哪些账号还缺 id）

# 3. 配置 SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_* 并重启
#    之后后台自动改用 Supabase，无需改任何业务代码
```

## 4. 数据边界（不虚构功能）

- 用户列表：配置 `SUPABASE_SERVICE_ROLE_KEY` 时读取 Supabase Auth 完整目录；
  未配置时读取本地 SQLite `profiles` 表，并合并已签发授权、订单与运营者账号。
  只有在本地库也打不开时（Node < 22.5 或 `.data/` 不可写）才退化为「由授权 / 订阅推导」，
  页面会明确标注「不完整」。
- 订阅：买断是离线授权码，可能没有 `subscriptions` 行，账单页会提示去授权页查看。
- 用户后台**资料可编辑**：登录用户经 `/api/profile` PATCH 自己的 `display_name / full_name / company`（`ProfileForm` 客户端岛提交，service 层清洗长度并受 RLS 锁定）；`role` 字段不在此接口接受，只走管理员端点。
- 角色管理：仅 `admin` 可经 `/api/admin/users` PATCH 他人 `role`（受 `canManageRoles` 校验；且禁止改自己、禁止改运营者账号）；`staff` 只读用户目录。写入目标随部署形态变化：Supabase `profiles` 表或本地 SQLite `profiles` 表。
- 本地 SQLite 文件与内存 RAG 索引在 serverless 环境不持久；授权与 webhook 幂等生产应执行 `supabase/migrations/0003_licenses.sql`。

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
ADMIN_PASSWORD=<强密码>                          # 播种运营者账号，密码只存 scrypt 哈希
ADMIN_EMAILS=you@example.com,ops@example.com   # 种子管理员邮箱，首次访问 /admin 时自动提升为 role=admin
SUPABASE_SERVICE_ROLE_KEY=<service role>        # 配了它：用户目录与角色改由 Supabase 提供；不配则用本地 SQLite
```

未配置 `SUPABASE_SERVICE_ROLE_KEY` 时，后台照常可用：账户与角色存在本地
`.data/shipkit.db`（`profiles` 表），角色列可正常修改。配置该变量后，后台会
**自动切换**到 Supabase Auth + `profiles` 表，业务代码无需改动；切换前用
`npm run export:profiles` 把本地角色导出即可。

角色提升发生在访问受保护后台时（`ensureSeedAdmins()` 幂等），无需手动跑 SQL；但 `0004_profiles_rbac.sql` 必须在部署后执行。
检查顺序：

1. `npm run waffo:preflight -- --strict`（含 Admin 变量）
2. 部署后执行 `supabase/migrations/0004_profiles_rbac.sql`
3. 打开 `/admin`，用 `ADMIN_USER` / `ADMIN_PASSWORD` 在页内登录，确认右上角显示「当前登录 <用户名> · 管理员」
4. 用一个 `member` 角色账号访问 `/admin`，应被拒（无法进入）
5. 用 admin 在 `/admin/users` 将某邮箱改为 `staff` / `admin`，该账号随后即可进入 /admin
6. 用白名单账号访问 `/account/settings`，确认资料编辑可保存

## 7. 相关文件

`app/account/**`、`app/admin/**`、`app/premium/page.tsx`、`components/console/**`、
`lib/console.ts`、`lib/orders.ts`、`lib/content/console.ts`、`lib/rbac.ts`、
`lib/local-profiles.ts`、`lib/sqlite.ts`、`middleware.ts`、
`app/api/profile/route.ts`、`app/api/admin/users/route.ts`、`app/api/webhook/route.ts`、
`supabase/migrations/0004_profiles_rbac.sql`、`supabase/migrations/0005_orders.sql`、
`lib/generator/{config,schema,prune,pack,templates}.ts`、
`scripts/export-local-profiles.mjs`、`scripts/lib/ai-docs.mjs`、`scripts/verify-matrix.mjs`、
`.github/workflows/generated-matrix.yml`。
