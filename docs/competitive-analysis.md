# 竞品调研与差异化评估（2026-11）

> 调研日期：2026-11-05。数据来源为各厂商官网、官方定价页与 2026 年第三方横评
> （VibeReady 横评、BoilerplateHub、saqibcode、Lovable 指南、Supastarter 博客、
> dev.to「AI coding agents 如何选 boilerplate」）。
> ⚠️ VibeReady 那篇横评**明确披露 "VibeReady is our own product"**，其排名需打折扣看，
> 但其中的功能矩阵与字段定义仍可作为行业口径参考。价格随促销变动，以官网为准。
> 📌 第 1–3 节是**调研当时的状态快照**；`4.1 本轮落地状态` 记录之后两轮（A+C、P0）的
> 实际改动。读结论时以 4.1 与 `docs/agent-native.md` / `docs/mcp.md` 为准。
>
> 🆕 **状态校正（2026-11-08）**：下文表格与「待办」清单是 **2026-11-05 的历史快照**，
> 其中多项已不成立，请勿据此判断当前能力。当前事实：
> - 风格 **11 套**（10 套调色板 + Doodle），语言 **五语**（en/zh/ja/fr/de），构建矩阵 **18 组**；
> - `/styles` 交互预览页已上线，`/build-matrix` 本地快照页可展示通过率与产物体积；代表用例支持 `--build` 真跑 `next build`；
> - 两套后台**已可写**：`/api/profile` 改资料、`/api/admin/users` 改角色、`/api/billing/portal` 账单门户、`/admin/tickets` 改工单状态；`0004_profiles_rbac.sql` / `0007_orgs.sql` 随包交付；`/admin` 未配置凭据时**全环境关闭**；
> - 白标清理已完成：`pack.ts` 对 ZIP 全文本文件 sweep `neutralizeBrand()`，`verify-matrix.mjs` 对 18 组做全文本品牌断言；
> - 付款已自动发 key 邮件（失败进 `mail_outbox` 重试），guest checkout 走 `/api/license/claim`；保留期清理、consent / delivery 审计日志、数据导出/删除、DPA 模板都已落地；
> - `npm run agents:lint` 把 `AGENTS.md` / scoped rules / skills 索引变成机器可校验的契约；
> - MCP 增加 `resources/read`，新增 `/.well-known/agent-card.json` 与 `?format=md`；
> - Cloudflare 目标改用 Workers + OpenNext + `nodejs_compat`（仍需 Supabase 才能持久化）。
> 仍然真实的历史限制：无 IaC/Docker、无社区、多租户业务表需自行加 `org_id` 过滤、PayPal 无账单门户、SMTP 未实现。

## 1. 市场地图：产品在卖什么

2026 年这个品类的竞争已经不在「谁有 auth + Stripe + 邮件」——那已经是入场券。
真正的三条分界线是：

1. **交付形态**：整包仓库（ShipFast / Makerkit / Supastarter） vs **可视化配置后导出**（Divjoy / make1day）。
2. **买方是谁**：人（看落地页、社区、教程） vs **AI coding agent**（读 README / AGENTS.md / llms.txt / 目录结构）。
3. **深度 vs 速度**：B2B 多租户 / RBAC / IaC（Makerkit / Supastarter / VibeReady） vs 单人周末上线（ShipFast / make1day）。

| 产品 | 价格（一次性） | 定位 | 关键强项 | 明确短板 |
|---|---|---|---|---|
| **make1day** | **$99 一次性买断（含 12 个月免费更新）+ $9/月 Care 管护** | 可配置、可剪枝的生成器 | 按选项真剪枝、10 套风格、根 AGENTS.md + design.md + scoped rules + 12 skills、混合 RAG、四语 i18n + llms-full/OpenAPI/MCP、可勾选的四语用户/管理员后台、17 组构建矩阵 CI、MoR 支付 | 无社区、无多租户、无 IaC/Docker、后台为只读起步版、build matrix 未跑 next build、白标未清干净 |
| ShipFast | $199（All-in $249） | 最快上线 | 5,000+ Discord、转化型落地页、口碑 | **无 AGENTS.md / skills / 质量门禁**、无多租户、MongoDB 为主 |
| Divjoy | $199（Standard），目录站报 $299–599 | 可视化代码生成器 | 选 UI kit / auth / DB / 支付后导出 | React(非 Next) 仍用已废弃 CRA，2025–26 社区沉寂 |
| Makerkit | $299（Pro）/ $599（Team） | 国际化 B2B | i18n、Next.js + React Router 7、AGENTS.md / Cursor rules / MCP / 子代理、多租户最深 | 按席位分层收费、无 IaC、质量靠 MCP 非提交门禁 |
| Supastarter | $349 / $799 / $1,499 | 功能最全 | 5 个支付商、3 框架、i18n、文件存储、博客引擎、AGENTS.md + .cursorrules | 按席位加价、无 agent skills / 强制门禁、复杂度高 |
| VibeReady | $149–399 | **AI 开发框架** | 3-layer AI Framework（AGENTS.md + 14 scoped rules + 22–24 skills + commit 门禁 + living docs）、Terraform / GitHub Actions / Docker、端到端 RAG | **无 i18n**、无预置落地页组件、仅 Next.js、社区新 |
| Open SaaS (Wasp) | 免费 MIT | 免费全栈 | Auth + 计费 + 后台 + AGENTS.md/Claude 插件 | 绑定 Wasp 框架，不是标准 Next.js |
| GitHub 免费 starter | 免费 | 学习 | 结构透明 | 功能最少、维护不稳定 |

价格带：**$0（免费）→ $99–149（低价新秀）→ $199–249（主流）→ $299+（B2B / 团队）**。
make1day 的 $99 处于最低付费档，但功能密度接近 $299 档——这是当前最锋利的价格武器，
代价是**没有品牌与社区背书**，必须靠"看得见的差异"而不是"我更便宜"来转化。

## 2. 能力矩阵（重点看 AI 与工程化）

| 维度 | make1day | ShipFast | Divjoy | Makerkit | Supastarter | VibeReady |
|---|---|---|---|---|---|---|
| 生成器按选项真剪枝 | ✅ | — | ✅（较老） | — | — | — |
| AGENTS.md / 智能体说明 | ✅ 按风格生成 | ❌ | ❌ | ✅ | ✅ | ✅ 核心卖点 |
| 设计系统说明书 design.md | ✅ **按风格生成** | ❌ | ❌ | ❌ | ❌ | ❌ |
| 内置 skills 包 | 5 个 | ❌ | ❌ | 5 个 | ❌ | 22–24 个 |
| 提交时质量门禁 / living docs | ❌ | ❌ | ❌ | 仅 MCP | ❌ | ✅ |
| llms.txt / GEO 机器可读 | ✅ llms-full + OpenAPI 3.1 | ❌ | ❌ | 未强调 | 未强调 | ❌ |
| 端到端 RAG | ✅ BM25 + 向量 + RRF | ❌ | ❌ | 付费模板 | ❌ | ✅ |
| 五语 i18n | ✅ EN/ZH/JA/FR/DE | ❌ | ❌ | ✅ | ✅ | ❌ |
| 多租户 / RBAC | ⚠️ 表 + RLS + 助手（UI 需同时勾选用户后台） | ❌ | ❌ | ✅ | ✅ | ✅ |
| IaC / CI / Docker | ⚠️ 17 组生成矩阵 CI（每组 tsc），无 IaC/Docker | ❌ | ❌ | 基础 | 基础 | ✅ |
| MoR 收款（无公司实体） | ✅ Waffo Pancake | ❌ Stripe 系 | ❌ | ❌ | ❌ | ❌ |
| 社区规模 | 无 | 5,000+ | 沉寂 | 活跃 | 活跃 | 新 |

## 3. 差异化审计：哪些是真的，哪些是自嗨

### ✅ 真差异（竞品普遍没有，且 make1day 已落地）

1. **按选项剪枝 + 下载即可构建**。Divjoy 是同类里最接近的，但已明显老化；
   Makerkit/Supastarter/ShipFast 都是"给一整个仓库，自己删"。
2. **design.md + 根 AGENTS.md 随所选风格生成**。10 套风格的配色/圆角/纹理 token 会写进文档，
   这是 VibeReady 也没有的（它有 AGENTS.md 但没有"按视觉风格生成的设计系统说明书"）。P0 之后还多了
   scoped rules、12 skills、Cursor/Claude Code 适配与 `npm run ai:docs` 确定性重建。
3. **机器可读分发**：llms.txt / llms-full.txt / OpenAPI 3.1 / MCP `scaffold_project` /
   `/templates` 样板间 + FAQ/Compare/Blog 结构化数据 + JSON-LD，面向"AI agent 替人选型"的新渠道。
4. **内置可运行的混合 RAG**（BM25 + embedding + RRF，无 key 自动降级），不是文案里的"RAG boilerplate"。
5. **四语 i18n + 合规/SEO 包**，而横评里最强的 VibeReady 恰恰明确「No i18n」，ShipFast 也无。
6. **MoR 支付（Waffo Pancake）**：无需公司实体即可全球收款、代缴税，对独立开发者是真痛点，竞品清一色 Stripe 系。
7. **服务化商业模型**：$9/月 Care + 1V1 定制，竞品多为一次性授权后靠社区。

### ⚠️ 半真（有代码但没形成卖点）

- 调研当时只有 5 个 skills、无 scoped rules / 提交门禁 / living docs；**P0 后已补齐 12 skills + scoped rules + `ai:docs` 重建**，但数量仍少于 VibeReady 的 22–24 个，且规则未被 lint 强制（见 4.1）。
- "白标"没做干净：生成的 ZIP 仍带 make1day 营销页与品牌，README 宣称 MIT 却无 LICENSE 文件。
- 10 套风格只在生成器里，站点没有一个可交互的"风格→产物"展示页，说服力弱。

### ❌ 伪差异（别写进文案）

- 「多租户」：`0007_orgs.sql` 与 `lib/org.ts` 是真实产物，但工作区 UI 依赖同时勾选 `account`，且客户业务表要自行加 `.eq("org_id", ...)`；不要声称「开箱即用的 B2B 租户隔离」。
- 「Observability」：无 error boundary / logger。
- 「1-click deploy 到 Cloudflare」：API 依赖 Node runtime / node:crypto / fs。
- 「流式 AI」「每天 5 条」：chat() 是 `stream:false`，无配额。

## 4. 机会评估（影响力 × 成本）

| 优先级 | 差异化功能 | 为什么现在做 | 验收标准 |
|---|---|---|---|
| **P0** | **Agent-Native Delivery**：把 design.md/agents.md 升级成完整 AI 开发包 —— 根 `AGENTS.md`、按模块生成的 scoped rules、可调用 skills（加到 12+）、`make ai-setup` 式一键适配 Cursor/Claude Code、以及"配置变更自动重生成文档" | 直接对标 VibeReady 的 3-layer 框架（$149–399 的核心卖点），而 make1day 独有「按风格生成 design.md」和「按选项剪枝」，组合起来是更强的故事；2026 买方大量变成 AI agent | 生成 ZIP 含 AGENTS.md + ≥12 skills + scoped rules；README/llms.txt 明确声明；AI agent 能按文档新增一个受保护页面并通过 `tsc && build` |
| **P0** | **GEO / Agent Discovery**：`llms.txt` 扩成 `llms-full.txt` + `/.well-known/agents.md`，把"选型所需的机器可读事实"（价格、栈、剪枝组合、限制）标准化；提供 MCP server 暴露 `scaffold_project` 工具 | 竞品几乎都没做；AI agent 会从 README/AGENTS.md/llms.txt 判断用哪个 starter，这是 2026 新增的分发入口 | 有可抓取的 llms-full.txt；MCP 工具能返回项目 ZIP 或配置 JSON；官网有独立落地页讲这件事 |
| **P1** | **Build Matrix CI**：对「10 风格 × 关键选项组合」在 CI 里跑 `tsc + next build`，站点展示实时通过率与产物体积 | 生成器最大的信任问题是"下载后能不能编译"；竞品没人敢公开这个指标 | GitHub Actions 覆盖 ≥12 组合，失败即阻断；对比页新增"下载即构建通过"一行 |
| **P1** | **Style Playground**：可交互预览 10 套风格并一键切换到 Builder，展示 design.md 片段 | 10 套风格是已投入的资产，但当前藏在下拉框里，无法形成转化 | 独立 `/styles` 页，四语，含 token 表与 design.md 摘录，跳转带 `?style=` |
| **P1** | **Hybrid RAG 作为旗舰模块**：补命中率评测集 + 引用高亮 + 一键导入自有文档 | 竞品里只有 VibeReady 有完整 RAG，Makerkit 是付费模板；B 档已实现，差的是"可证明的效果" | `/rag` 页展示评测指标与示例问答，README 有 benchmark |
| **P2** | **MoR / 无公司收款包**：以 Waffo Pancake 为默认，写「无需注册公司即可全球收款」的落地页与长尾词 | 独立开发者真实痛点，竞品全是 Stripe 系；已接通 | `/blog` 新增 1 篇中英长尾文，对比页新增 MoR 行 |
| **P2** | **白标清理 + 真 LICENSE**：ZIP 去掉 make1day 营销页，补 LICENSE 与品牌替换脚本 | 现在"白标"是虚假宣传，是退款/差评风险 | 生成 ZIP 无 make1day 品牌字符串；`npm run rebrand` 一键改名 |

### 4.1 本轮落地状态（2026-11-05，用户选 A + C）

| 机会 | 已落地 | 仍未做 |
|---|---|---|
| **用户后台 + 管理员后台**（2026-11-05 追加） | 站点 `/account`（概览/账单/授权/设置）与 `/admin`（概览/用户/授权/流量/系统）共 9 个四语页面；共享 `components/console/*`、`lib/console.ts`、`lib/content/console.ts`；`middleware.ts` 分别做会话门与 Basic Auth + `ADMIN_EMAILS` 角色白名单；Builder 新增 `account` / `admin` 两个可勾选 feature，按选项真剪枝并改写 Nav/登录后跳转/后台快捷入口杜绝死链；`account`/`admin` 两条条件 scoped rule；矩阵新增 `account-only` / `admin-only`。详见 `docs/consoles.md` | 两套后台均为只读起步版：无资料修改接口、无 org/RBAC 表、无客户账单门户；`/admin` 未设密码时仍公开；用户列表无 service role key 时由订单推导且不完整 |
| **P0 Agent-Native Delivery**（2026-11-05 追加） | 根 `AGENTS.md`（取代小写 `agents.md`，避免大小写文件系统冲突）、`design.md`、**12 个 skills**（新增 auth/payments/database/rag/i18n/deploy/agents）、`ai/rules/*.md` scoped rules（最多 11 条模块规则：7 常驻 + payments/rag/account/admin 条件规则，再加每 skill 一条，带 globs）、`.cursor/rules/*.mdc`、`CLAUDE.md`、`skills/README.md` 动态索引；**单一真源** `scripts/lib/ai-docs.mjs` + `ai/doc-spec.json`，站点 `pack.ts` 与客户工程 `npm run ai:docs` 共用；`npm run ai:setup --tool cursor\|claude\|all`；`verify-matrix` 17 组全部增加文档断言。详见 `docs/agent-native.md` | lint 层面的规则强制（目前只是文字约定）、客户端是否自动加载 `.cursor/rules` / `CLAUDE.md` 取决于工具版本、白标清理（P2） |
| **P0 GEO / Agent Discovery**（2026-11-05 追加） | `llms.txt` / `llms-full.txt` / OpenAPI 3.1；**本轮补齐** `/api/mcp`（4 个 JSON-RPC 工具，含 `scaffold_project`，`includeZip` 走同一 license gate）、`scripts/mcp-server.mjs` stdio 桥接 Cursor/Claude Code、`docs/mcp.md`、**`/templates` 样板间**（真实生成的模板演示站 + 画廊，sitemap/robots/Nav/Footer 入口） | MCP 无状态（无 sampling/prompts/订阅/SSE）、站点实时通过率页、build matrix 每组跑 `next build` |
| **P0 GEO / Agent Discovery**（上一轮） | `llms-full.txt`（含完整 BuilderConfig 枚举、剪枝规则、RAG 参数、支付协议、gate 顺序、诚实限制）、标准 **OpenAPI 3.1** `/openapi.json`、`docs/agent-discovery.md`；robots 显式放行 AI 爬虫与 `/builder`、sitemap 列出机器可读端点；`llms.txt`、对比页（EN/ZH 各 2 行）、README 同步；4 个站点专属端点加入 `SITE_ONLY_FILES`，不进客户 ZIP | MCP server / `scaffold_project` 工具、`/.well-known/agents.md`（非通用标准，暂不引入）、独立落地页 |
| **P1 Build Matrix CI** | `.github/workflows/generated-matrix.yml` + `scripts/verify-matrix.mjs`：**17 组**（≥12 达标），覆盖 6 支付商 / 10 风格 / 3 部署目标、RAG/dashboard/skills 与两套后台开关；每组下载真实 ZIP → 断言剪枝 → 在解压工程内跑 `tsc --noEmit`；对比页新增"生成产物构建矩阵"行；`docs/build-matrix.md` | 每组跑 `next build`（当前只跑 `tsc`）、站点展示实时通过率与产物体积 |
| **A（支付上线）** | `docs/waffo-launch-checklist.md`、`.env.waffo-pancake.example`、`scripts/waffo-preflight.mjs --strict`；`docs/waffo.md` 与 README 挂入口 | 真实 Waffo 商户后台联调、Acquiring 下单 payload（依赖合同字段） |

**两个 P0 都已落地**（Agent-Native Delivery + GEO/Agent Discovery）。下一步最大机会转为 **P1**：
1. **Style Playground** `/styles`（四语、token 表、design.md 摘录、`?style=` 跳转）——10 套风格已投入但藏在下拉框里，转化损失最大；
2. **RAG 可证明的效果**（命中率评测集、引用高亮、自有文档导入、README benchmark）；
3. **build matrix 升级**：少量 case 跑 `next build`、站点展示实时通过率与产物体积。

不建议因为「竞品有」就回头补多租户：目标用户仍是单人独立开发者，继续放大「agent 原生 + 可验证产物质量」的差距更划算。

### 明确不建议碰

- **多租户 / RBAC / 超级后台**：Makerkit、Supastarter 深耕多年，补齐成本极高，且目标用户（单人独立开发者）不需要；先把勾选项从 Builder 移除或标注 coming soon，避免虚假宣传。
- **Terraform / K8s / 完整 CI 平台**：VibeReady 的定位，make1day 打"轻"才有优势。
- **社区运营**：5000 人 Discord 不是短期能补的，用「可验证的产物质量」替代「社区背书」。

## 5. 建议定位语

> **「给 AI coding agent 用的 Next.js 启动包」——选好技术栈与风格，下载一份
> 自带 AGENTS.md、design.md、skills 和混合 RAG、且剪枝到刚好够用的源码，$99 买断。**

一句话里同时打中三个竞品空白：**agent 原生上下文**、**可视化真剪枝**、**最低价**；
把价格从"便宜"重新框定为"没有为用不上的 B2B 功能付费"。

对照文案建议（可直接上站）：
- 首页 hero 副标：`The starter your AI agent can read — and your project can actually ship with.`
- 对比页新增行：`AGENTS.md + design.md generated per style` / `llms.txt for agent discovery` / `Hybrid RAG (BM25 + vectors)` / `MoR checkout, no company needed`
- 长尾词：`AGENTS.md boilerplate`、`AI coding ready Next.js starter`、`ShipFast alternative with RAG`、
  `llms.txt SaaS boilerplate`、`buy SaaS boilerplate without a company (MoR)`、`Divjoy alternative 2026`。

## 6. 结论

make1day 不缺功能，缺的是**把已有功能组织成一个别人没有的故事**。当前最值钱的两块资产
（按风格生成设计文档、按选项剪枝）恰好都是 2026 年 AI coding 工作流最需要的东西，而竞品
要么没有（ShipFast / Divjoy），要么有框架但没有设计系统层（VibeReady / Makerkit / Supastarter）。
建议把资源集中在 **Agent-Native Delivery + GEO 分发 + 可验证的构建矩阵**，而不是补多租户追平 B2B 竞品。

> 2026-11-05 更新：GEO 分发（llms-full + OpenAPI + 爬虫放行）与可验证的构建矩阵（17 组 CI）已落地，见 4.1；三者中只剩 **Agent-Native Delivery** 未系统化，应作为下一轮主攻方向。
