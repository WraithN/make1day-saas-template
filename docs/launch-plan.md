# make1day 上线 → 运营计划（2026-11-09）

> 配套文档：`docs/competitive-analysis.md`（2026-11-05 调研 + 11-08 状态校正）、
> `docs/waffo-launch-checklist.md`、`docs/payment-testing.md`、`docs/email.md`、
> `docs/legal-data-map.md`。本文是「离上线还差什么 + 竞品最新变化 + 分阶段执行计划」。

## 0. 部署实况（2026-11-09 晚更新）

**软上线已完成**：`https://make1day-saas-template.vercel.app`（Vercel + Supabase
`UncorneBiz` us-east-2，12 迁移 / 18 表 / RLS）。管线：push → matrix 19/19 →
Deploy（迁移走 `scripts/supabase-migrate-mcp.mjs` 经 Supabase MCP，绕开直连库
仅 IPv6 而 CI 仅 IPv4 的死路；Vercel 构建部署）。已验证：health ok/supabase、
license 门禁 402/200+ZIP、cron Bearer 鉴权、/admin、运行时落库、邮件与支付
self-check 接线。

**已拍板/已配**：支付网关 = **Creem**（`PAYMENT_PROVIDER=creem`，仓库代码默认
仍是 waffo，MoR 场景保留）；邮件 = **Resend**（`MAIL_FROM=noreply@mail.uncorne.com`、
reply-to `support@uncorne.com`；发信子域 `mail.uncorne.com` 待 Resend 控制台验证
+ Cloudflare 加 DNS）；`SQLITE_PATH=/tmp/shipkit.db` 仅作 Supabase 不可用时的降级；
Vercel 环境变量是**部署快照**——改完必须重新部署才生效。

**仍缺（按序）**：① Creem test key + webhook secret + 6 个产品价格 ID → 沙箱演练 →
live；② Resend 域名 DNS 验证；③ 正式域名（make1day.dev 无 DNS / uncorne.com 在
Cloudflare）切换 `NEXT_PUBLIC_SITE_URL` 并重部署；④ LICENSE 口径、Care 文案的
Discord 承诺、BF 后定价锚点三个商务决策。

---

## 1. 现状快照（代码 vs 商业）

**代码成熟度：高，且可验证。**
- 2026-11-09 本地全绿：`tsc` ✅、干净 `next build` ✅、矩阵 **18/18**（3 组真跑 next build）、
  smoke **48/48**、`public/build-matrix.json` 已发布 100%。
- 产品面：16 风格 / 8 AI 供应商 / 6 支付网关（多选）/ 五语 i18n / 混合 RAG（recall@4=100%）/
  用户+管理员双后台 / license gate / paywall / GEO（llms.txt、OpenAPI 3.1、MCP、agent-card）/
  `/templates` 样板间 / `/styles` 主题预览 / 9 篇博客 + 21 条 FAQ + /compare + /faq。

**商业就绪度：≈0。整个「收钱→交付」链路从未在生产环境跑通。**
`.env.local` 实测只有 6 个变量（ADMIN_USER/PASSWORD、LICENSE_SECRET、LICENSE_GATE、
FREE_GENERATIONS_PER_DAY、NEXT_PUBLIC_CONTACT_EMAIL），意味着：

| 环节 | 状态 | 后果 |
|---|---|---|
| 支付网关 | ❌ 无任何 key（Waffo/Stripe/…全未配） | 用户点购买 → 500/降级，收不到一分钱 |
| 邮件 | ❌ `MAIL_PROVIDER=none` | 即使收到钱，license key **发不出去**（只进 mail_outbox） |
| 数据库 | ❌ 本地 SQLite，无 Supabase | 部署到 Vercel/Workers 后账号、license、订单全部不持久 |
| 部署/域名 | ❌ 未部署，`NEXT_PUBLIC_SITE_URL` 未设 | canonical/hreflang/sitemap/OG 全指向 localhost |
| 定时任务 | ❌ 无 host scheduler、无 `CRON_SECRET` | retention 清理与 mail_outbox 重试永不执行 |
| 生产 secrets | ⚠️ ADMIN_PASSWORD 是测试值 | 上线即安全事故 |
| 真实支付演练 | ❌ `probe:webhook` 因无签名 key SKIP | 没有任何一笔 sandbox 付款走完全链路 |

**一句话：功能开发已经过度完成，上线卡在「运营配置」而不是「写代码」。**

---

## 2. 上线前缺口清单（按优先级）

### P0-A 钱路闭环（最大 blocker，预计 2–4 天，大部分是等商户审核）

1. **决定主网关**（建议双轨）：
   - 主：**Waffo Pancake（MoR）**——无需公司实体、代缴税，是差异化卖点，必须真实可用；
   - 备：**Stripe 或 Creem**——海外买家熟悉度高、审核快，先跑通第一笔钱。
   - ⚠️ 若 Waffo 商户审核慢，**不要让它阻塞上线**：先 Stripe/Creem 上线，Waffo 审核过后加为多选。
2. **按 `docs/waffo-launch-checklist.md` 走一遍**：建产品（Buyout 一次性 / Care 月订阅）→
   拿 price id → 配 webhook 公钥（test+prod）→ `node scripts/waffo-preflight.mjs --strict`。
3. **真实 sandbox 付款演练（每个上线网关各一次）**，验证完整链路：
   `checkout → webhook 验签 → grantLicense() → deliverLicenseKey()（license:<jti> 去重）→
   邮件收到 SK1.* key → 带 key POST /api/generate → 下载 ZIP → licenses 表恰好一行`。
   guest 邮箱不一致场景走 `/api/license/claim`。记录到 `docs/payment-testing.md`。
4. Lemon Squeezy 若保留为选项：按其账户核对 custom-data 回显位置 / portal id / 事件名
   （README Known gaps 已声明"需核对"，核对完把声明改掉或删掉该网关选项）。

### P0-B 邮件与域名（1 天）

1. 选定 mailer：**Resend（推荐，免费 3k/月、零依赖）**，`MAIL_PROVIDER=resend` +
   `RESEND_API_KEY` + `MAIL_FROM`。
2. 发信域名 DNS：`support@uncorne.com`（或新域名）配 **SPF / DKIM / DMARC** + 专用发信子域
   （如 `mail.uncorne.com`）；这是进收件箱的决定因素，代码侧已就绪。
3. `GET /api/mail/self-check` 全绿；五语模板（verify/reset/ticket/license key）各发一封实测。

### P0-C 基础设施与部署（1–2 天）

1. **Supabase 项目**：跑 `supabase/migrations/0001–0010`，配 URL/anon/service-role key；
   本地 SQLite 数据用 `npm run export:profiles` 迁移（如需要）。
2. **域名 + 部署**：Vercel（首选）或 Cloudflare Workers（OpenNext，需 Supabase 才能持久化）。
   设 `NEXT_PUBLIC_SITE_URL=https://<domain>`，检查 canonical/hreflang/sitemap/OG 全部正确。
3. **生产 secrets**：强 `ADMIN_PASSWORD`、全新 `LICENSE_SECRET`（换 secret 会使旧 key 失效，
   上线前换，上线后不换）、`ADMIN_EMAILS` 白名单、`CRON_SECRET`。
4. **Cron**：Vercel Cron（或 host 等价物）挂 `POST /api/cron/retention`（每日）与
   `POST /api/cron/mail-outbox`（每 15 分钟）。
5. **可观测性三件套（半天）**：Sentry 免费档（或 /api/errors 定期人工看）、UptimeRobot 打
   `/api/health`、Google Search Console + Bing Webmaster 提交 sitemap。

### P0-D 商业决策（不写代码，但上线前必须拍板）

| 决策 | 选项 | 建议 |
|---|---|---|
| 仓库 LICENSE=MIT vs 卖生成包 | 保持 MIT（terms 已写明"收费=配置构建+交付服务"）/ 换商业 license | 上线前拍板；换 license 必须在首笔销售前 |
| Care 承诺 "Priority support (**Discord** + email)" | 建 Discord / 改文案 | 二选一，**不能空头承诺**；建议先改文案为 email+工单，Discord 有 50+ 用户再建 |
| 定价一致性 | 单一真源 `lib/pricing.ts`（2026-11-10 调价）：Buyout 划线 $349 / 常售 $249 / 分享 $219 / 黑五 $174；Care 划线 $29 / 常售 $19 / 分享 $15 / 黑五 $13（含视频额度）。/pricing 与 /black-friday 均读它；BF 窗口内主定价页显示划线锚价 + BF 徽标 | 已落地：改价只动 `lib/pricing.ts`；llms/FAQ/README/payments 文档同步新口径 |
| BF 活动窗口 | `BLACK_FRIDAY_ENDS_AT=2026-11-30` | 天然上线 deadline：**11 月中下旬上线，吃黑五流量** |
| 品牌资产 | make1day 的域名/GitHub org/X handle 是否已注册 | ⚠️ 存在竞品 **shipkit.sh**（内部代号撞名，品牌已改 make1day 是对的）；尽快锁定 make1day.com/.ai/.dev + @make1day 各平台 handle |

### P1 上线周可并行（各半天–1 天）

- **Cookie/consent banner**：五语面向 EU（fr/de），consent_events 表已有、缺 UI；一方
  pageviews 严格说可豁免，但低成本高保险。
- 生成包 README 里 `git clone https://github.com/your-org/shipyourproduct.git` 占位链接
  与 Vercel Deploy 按钮的 `repository-url` 仍是 placeholder——上线前改成真实仓库或删除。
- `/admin` 流量页 + conversion funnel 已内置：上线前定义好漏斗口径（见 §5 KPI）。

### P2 产品弱点（上线后 30 天内补，不阻塞上线）

1. **生成的客户 ZIP 没有事务邮件 / 密码重置 / 支持表单**（全是 site-only 被剪掉）。
   竞品全员标配 email（ShipFast 的核心卖点就是 emails）。这是对比表上最疼的一行。
   修法：给客户包塞一个最小 Resend-only 邮件适配器 + reset-password 页（代码都已存在于
   本仓库，主要是剪枝策略与矩阵断言的改动，遵守 AGENTS.md 规则 2/3）。
2. **规则非强制**：shipkit.sh 用 architecture tests、VibeReady 用 commit 门禁、开源
   ai-saas-starter 用 Claude Code Stop hook。客户包已有 `agents:lint`，可再加
   `npm run check`（tsc+lint 一条龙）与可选 `.claude/hooks`，把「可验证质量」叙事补齐。
3. RAG 跨语言检索弱（已诚实声明）；Next.js 16 升级（MakerKit/NEXTY 已在 16.x）。

---

## 3. 竞品格局更新（2026-11 实测搜索，修正 11-05 调研）

**最重要的变化：$99 价位带的「生成器 + agent 文档」赛道已经从蓝海变红海。**

| 产品 | 价格（2026-09/11 实测） | 与 make1day 的关系 |
|---|---|---|
| **Agentic Boilerplate** (agenticboilerplate.com) | **$99 一次** | **最直接竞品**：同为 Next.js 生成器、只交付所选服务代码、AGENTS.md + 30 rules + 29 skills + 7 subagents + 74 bug fixes + 7 safety hooks、31 套设计、适配 10 个 AI 工具 |
| **ShipKit.sh** | $99（launch） | TanStack Start/CF Workers；卖点是「规则由 architecture tests + CI **强制**」；⚠️ 与内部代号撞名 |
| MkSaaS | $129 | agents.md + claude.md + 17 Cursor rules |
| ixartz/SaaS-Boilerplate | 免费 + Pro ~$99 | Clerk 系，开源引流 |
| FlareStarter | 免费 + Pro $99 | TanStack 系 |
| nikandr/ai-saas-starter | **免费开源** | Next.js 16、AGENTS.md + DESIGN.md + path-scoped rules + skills + **Stop hook（tsc 不过不算完）** + code-reviewer agent —— 免费档直接对标我们的 P0 叙事 |
| Divjoy | 降到 $149 | 老牌生成器持续老化（CRA） |
| ShipFast | $199–299 | **被 MakerKit 2026-09 横评公开点名「无法确认仍在维护、不再推荐」**——挖角窗口 |
| MakerKit | 涨到 $349/$649 | 已加 MCP server + skills + Playwright E2E，Next.js 16.3；B2B 标杆 |
| supastarter | $299/$799/$1,499 | AGENTS.md + Agent Skills + .cursorrules；多框架 |
| NEXTY.DEV | $188 | Next.js 16、Better Auth、5 支付商、i18n(en/zh/ja)、CMS——功能面很全 |
| TurboStarter | $249 | AGENTS.md + skills + reviewer subagent + docs MCP |
| Open SaaS (Wasp) | 免费 | AGENTS.md + skills + Claude plugin + llms-full.txt |

### 差异化打法修正

原「agent 原生 + 真剪枝 + 最低价」三连已被 Agentic Boilerplate 在 $99 同价位正面复制。
**必须把叙事重心移到它没有、且短期难抄的四条腿上：**

1. **可视化 Builder + 实时预览 + 样板间**（/builder 在线配置 → 立即看 /templates 六套真实
   生成的演示站 → /styles 16 主题交互预览）。Agentic/ShipKit 是「静态卖点页」，make1day
   是「所见即所得的生成体验」——这是转化率武器，也是 Divjoy 老化后空出的生态位。
2. **五语 i18n（en/zh/ja/fr/de）**：$99 档唯一；NEXTY 只有 en/zh/ja 且 $188。打「面向
   非英语市场的唯一 agent-native starter」+ 日语/中文长尾词几乎无竞争。
3. **可运行的混合 RAG + 公开 benchmark（recall@4=100%, MRR=0.917）**：$99 档唯一，
   全场只有 $149+ 的 VibeReady 可比。
4. **MoR 收款（Waffo Pancake）+ 6 网关多选**：「没有公司也能全球收款」竞品无人做；
   网关数量 6 > NEXTY 5 > supastarter 5。
5. （辅助）**公开构建矩阵 18/18 + smoke 48/48**：质量可验证性全站公开，只有 shipkit.sh
   声称 CI 强制但不公开结果——把 /build-matrix 页做成对比页第一行。
6. （辅助）**$9/月 Care**：全场唯一经常性收入模型，LTV 故事。

**主动进攻点：**
- `/compare` 与博客立即更新 ShipFast 行（「维护状态无法确认」是第三方横评原话，引用出处
  即可，不算抹黑）；抢 "ShipFast alternative 2026" 长尾。
- 对免费开源夹击（ai-saas-starter/Open SaaS）的回应不是降价，而是强调「剪枝到刚好够用 +
  风格化 design.md + 五语 + RAG + MoR」是免费仓库不做的脏活。
- 补 enforcement（P2-2）之前，文案**不要**声称「规则被强制执行」，只说「机器可校验的
  文档契约（agents:lint）+ 公开构建矩阵」——保持诚实边界（AGENTS.md 规则 6）。

---

## 4. 上线 → 运营时间线

### Phase 0：上线准备（本周起，目标 11/17–11/21 软上线，赶黑五窗口）

| # | 任务 | 产出/验收 | 预估 |
|---|---|---|---|
| 0.1 | 注册/确认域名 + 全平台 handle（make1day.*、GitHub org、X、PH） | 域名解析生效 | 0.5d（审核等待并行） |
| 0.2 | 支付商户申请（Waffo Pancake + Stripe/Creem 双轨并行提交） | 商户后台可用、price id 到手 | 1d + 审核等待 |
| 0.3 | Resend + 发信域 DNS（SPF/DKIM/DMARC） | mail/self-check 全绿、五语模板实收 | 0.5d |
| 0.4 | Supabase 建库跑迁移 0001–0010 | RLS 生效、profiles/licenses/orders 可写 | 0.5d |
| 0.5 | Vercel 部署 + 全部生产 env + Cron 两个端点 | 线上 /api/health 200；cron 日志可见 | 0.5d |
| 0.6 | **端到端真钱演练**（sandbox 或 $1 真实付款）：付款→key 邮件→下载 ZIP→退款流程各一次 | `docs/payment-testing.md` 记录完整；licenses 恰好一行 | 0.5d |
| 0.7 | 商业决策四件事（LICENSE / Discord 文案 / 定价口径 / BF 窗口） | 全站文案一致 | 0.5d |
| 0.8 | 线上完整 DoD：tsc/build/matrix/smoke + 五语五页面手机人工走查 + 死链扫描 | 全绿 | 0.5d |
| 0.9 | P1：consent banner、占位仓库链接修正、Sentry/uptime、GSC 提交 | — | 1d |

### Phase 1：发布周（11/24–11/30，黑五截止日前完成主要动作）

发布顺序（每步间隔 1–2 天，避免互相抢流量）：
1. **软上线**（11/17 起）：不宣传，观察 48h 错误日志/漏斗埋点是否正常。
2. **Product Hunt**：素材 = 「The SaaS starter your AI agent can read — configured, pruned,
   and build-verified (18/18 public matrix)」。首发折扣挂 BF $99。
3. **Hacker News Show HN**：角度选「公开构建矩阵」或「llms.txt/MCP 的 agent 分发」——
   HN 吃「可验证/诚实」叙事，忌营销腔。
4. **X/Twitter 线程**：_builder 录屏（配置→预览→下载→AI agent 按 AGENTS.md 开发）是最强素材。
5. **中文渠道**：V2EX（分享创造）、即刻、少数派 Matrix、微信公号投稿；主打「MoR 无公司
   收款 + 中文 i18n」。
6. **Reddit**：r/SideProject、r/nextjs、r/SaaS（守规矩、先给价值）。
7. **SEO/GEO 收口**：GSC 确认 llms.txt/openapi.json 被抓；投 3–5 个 boilerplate 目录站
   （BoilerplateHub 等）；给 11-05 调研引用过的那几篇横评作者发邮件求收录。

发布周纪律：
- 每天看 /admin 流量页 + conversion funnel；402→付款转化率是核心数字。
- 前 10 个付费用户**人工白手套**：邮件感谢 + 15 分钟 onboarding call 邀约 + 求反馈。
- 支持工单首响 <24h（五语，用模板兜底）。
- 任何线上事故先降级（LICENSE_GATE fail-safe 已内置），事后写 Known gaps。

### Phase 2：运营（30 / 60 / 90 天）

**Day 1–30：修最疼的 + 建立口碑**
- 补 P2-1（生成包内最小邮件适配器 + 密码重置页）——对比表最大的洞。
- 补 P2-2（`npm run check` + 可选 Claude hooks）——对上 shipkit.sh 的 enforcement 叙事。
- 上线 `/changelog` 页（竞品横评把「无 changelog」作为 ShipFast 扣分项，我们反过来做加分项）。
- 内容：每周 2 篇长尾文（先 EN+ZH），主题池：ShipFast alternative、AGENTS.md boilerplate、
  MoR 无公司收款、Divjoy alternative、boilerplate with RAG、五语 i18n starter。
- 收集 3–5 条真实 testimonial 上首页（案例墙已删，testimonial 用真实用户替代）。
- 周复盘指标：UV、builder 试用数、402 数、付款数、退款数、工单数。

**Day 31–60：放大渠道**
- **Affiliate 计划**（30% 佣金）：ShipFast/MakerKit 生态里大量 KOL 靠联盟吃饭，是最便宜的
  增量渠道；用现有 license 体系加 referral 参数即可。
- 模板样板间 6 → 12 套（第二条变现线：主题包/垂类模板可单独定价）。
- Care 转化动作：buyout 用户 30 天邮件序列 → Care 试用 offer（$19/月、首月 $13）。
  卖点框架（2026-11-10 定稿）：**消耗 + 适配，不卖保险**——① 每月视频渲染额度
  （不用即重置）② 新模块 Care 首发（video 已适用；买断 6 个月后解锁或单购）
  ③ agent 契约每月重铸 ④ 上游合并补丁 ⑤ 12h 首响 SLA。文案已落 pricing 五语 +
  llms.txt/llms-full；Discord 承诺删除（50 付费用户前不建社区）。
- 日语市场试水：/styles 与 /templates 的 ja 落地内容 + note.com/Zenn 发文（五语资产的
  独家变现，几乎无竞争）。

**Day 61–90：定价与产品升级**
- BF 结束后价格回调：$99 → **$149 常态价**（$299 list 锚定保留），观察转化弹性。
- Next.js 16 升级评估（MakerKit/NEXTY 已上 16；生成包跟着升，作为 Care 的第一个大交付）。
- 社区决策点：付费用户 ≥50 或 Care ≥20 时建 Discord（此前文案已改为 email+工单，无空头承诺）。
- RAG 跨语言增强（多语 embedding 或 query 翻译层），更新 benchmark 并诚实刷新 Known gaps。
- 评估第二产品：「Agent-Native 落地页生成」或「模板订阅」——用 90 天数据决定，不拍脑袋。

---

## 5. KPI 与看板（用内置 /admin 流量页，不加第三方）

| 指标 | 发布周 | 30 天 | 90 天 |
|---|---|---|---|
| 日均 UV | PH 当日峰值 ≥1,000 | 150–300 | 400+（SEO 起量） |
| Builder 试用（游客生成/预览） | ≥100 | ≥400 | ≥1,500 |
| 付费单数（buyout） | ≥10 | ≥40 | ≥150 |
| 访客→付款转化 | ≥1% | 1.5–2.5% | 2–3% |
| Care 订阅 | — | ≥5 | ≥20（attach 10–15%） |
| 收入 | $990+ | ~$4k | $15k+（含 Care MRR ~$180） |
| 退款率 | <5% | <5% | <5% |
| 构建矩阵 | 18/18 常绿（CI 阻断） | 同 | 同 |
| 工单首响 | <24h | <24h | <12h |

北极星：**「试用了 Builder 的游客 → 付款」转化率**。它同时检验产品说服力（预览/样板间）、
定价（BF 锚定）与信任（矩阵/诚实文档），是唯一值得每天看的数字。

---

## 6. 风险登记

| 风险 | 概率 | 缓解 |
|---|---|---|
| Waffo 商户审核拖过黑五 | 中 | 双轨：Stripe/Creem 先上，Waffo 后补为多选项 |
| 邮件进垃圾箱（新域名冷启动） | 中 | 专用发信子域 + DMARC + 首周低量预热；下载页同时展示 key（登录 /account 可见） |
| $99 档价格战（Agentic/ShipKit/免费开源） | 高 | 不打价格战，打五语/RAG/MoR/样板间四条腿；BF 后回调 $149 |
| 单人支持带宽（五语工单） | 中 | 模板化回复 + FAQ 21 条前置 + Care 分级响应 |
| 本地 SQLite 习惯残留（忘配 Supabase 的部署分支） | 低 | 上线 checklist 0.4/0.5 硬验收；/admin system 页显示存储后端 |
| shipkit.sh 撞名混淆 | 低 | 品牌已全部 make1day；SEO 上主动占 "make1day" 词 + 对比页说明 |
