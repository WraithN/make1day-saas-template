# Generated-template Build Matrix

> 生成器最大的信任问题是「下载的 ZIP 到底能不能编译」。这份矩阵把答案变成 CI 里可复现的事实，而不是 README 里的一句承诺。
> 对应竞品报告 `docs/competitive-analysis.md` 的 P1 机会（Build Matrix CI）。

## 它验证什么

`scripts/verify-matrix.mjs` 对每个代表性配置走**真实用户路径**：

1. `POST /api/generate` 下载真实 ZIP（不是直接调内部函数，连授权/剪枝/打包都一起验）；
2. 解压到 `.matrix-out/<case>`；
3. 断言必需文件、站点专属端点已剪掉、**生成器本身（`lib/generator/*`、`/builder`、`/api/generate`）绝不出现在客户包里**、支付/RAG/dashboard/skills/两套后台剪枝正确、manifest 与选项一致、模板 `LICENSE_GATE=off`、每个工程都带 `LICENSE`；
4. 在解压出的工程里执行 `tsc --noEmit -p tsconfig.json`；加 `--build` 时，部分代表用例会再跑一次真实 `next build` 并采集共享 First Load JS 与 `.next` 体积。

任一断言或类型检查失败，该 case 即失败；`--all` 会跑完全部 case 再汇总失败列表。

## 覆盖维度（18 个 case）

| 维度 | 覆盖 |
|---|---|
| 支付商 | `waffo` / `stripe` / `creem` / `paypal` / `lemonsqueezy` / `none`（6/6） |
| 视觉风格 | doodle, midnight, candy, aurora, paper, mono, sunset, ocean, slate, emerald, sand（11/11） |
| 部署目标 | `vercel` / `cloudflare` / `selfhost`（3/3） |
| 功能模块 | rag on/off、dashboard on/off、multitenancy on/off、全功能组合 |
| 两套后台 | 全开、全关、仅 account、仅 admin（新增 `account-only` / `admin-only` 两个 case） |
| AI 供应商 | openai / anthropic / gemini 单选与全选 |
| 登录 | 仅 email、全 5 项 |
| skills | 空集、单选、全 12 项 |

case 定义在 `scripts/verify-matrix.mjs` 的 `CASES`；CI 的 `.github/workflows/generated-matrix.yml` 用 `strategy.matrix` 把每个 case 拆成独立 job 并行执行，`fail-fast: false` 保证一个失败不会掩盖其他组合的真实结果。

## 本地运行

```bash
npm ci
npx next build                                  # 先做干净生产构建
LICENSE_GATE=off npx next start -p 3000        # 另一个终端（只读 .next）
node scripts/verify-matrix.mjs --all            # 或 npm run verify:matrix
node scripts/verify-matrix.mjs --case stripe-candy
node scripts/verify-matrix.mjs --list
node scripts/verify-matrix.mjs --all --base http://127.0.0.1:3002
# 更深一层的检查：代表用例跑真实 next build 并发布报告到 public/build-matrix.json
node scripts/verify-matrix.mjs --all --build --publish
node scripts/verify-matrix.mjs --case default-waffo-midnight --build --publish
```

> CI 里把启动服务、等待就绪、执行验证放在**同一个 step**，并用 `trap` 清理进程，避免后台进程跨 step 被 runner 回收。本地不要用 `next dev` 与 `next build` 共用同一个 `.next`，否则 `next start` 的路由清单会被 dev 覆盖。
> `LICENSE_GATE=off` 是必须的：矩阵要下载**完整付费 ZIP**，而门禁在生产恒开（fail-safe），不开门禁 `/api/generate` 只会返回 402。生成出来的客户项目本身也强制 `LICENSE_GATE=off`，两者互不冲突。

## 断言清单（也是回归护栏）

- 必需存在：`package.json`、`tsconfig.json`、`.env.example`、`README.md`、`LICENSE`、`shipkit.config.json`、`design.md`、**`AGENTS.md`**、`CLAUDE.md`、`ai/doc-spec.json`、`ai/README.md`、`ai/rules/README.md`、`ai/rules/core.md`、`.cursor/rules/core.mdc`、`scripts/lib/ai-docs.mjs`、`scripts/ai-docs.mjs`、`scripts/ai-setup.mjs`
- **旧的小写 `agents.md` 不得出现**（大小写不敏感文件系统会与 `AGENTS.md` 冲突）
- 站点专属端点**不得**出现在客户 ZIP：`payments/self-check`、`llms.txt`、`llms-full.txt`、`openapi.json`、`api/mcp`（`SITE_ONLY_FILES`）；站点营销页 `templates/page.tsx`、`templates/[slug]/preview/page.tsx`、`components/TemplateSite.tsx`、`components/TemplateCard.tsx`、`components/home/TemplateGallerySection.tsx`、`lib/content/templates.ts` 同样不得出现（`SITE_MARKETING_FILES`）
- 支付适配器只保留选中的那一个；`payment=none` 时五个全剪且生成 `lib/payments/none.ts`
- `rag` / `dashboard` 未选时对应文件必须消失；未选的 12 个 `skills/*.md` 必须消失
- **两套后台**：`app/account/page.tsx` / `app/admin/users/page.tsx` 与勾选状态严格一致；共享层（`lib/console.ts`、`lib/content/console.ts`）在且仅在至少一个后台被选时存在
- **无死链**：`account` 被剪时 `Nav.tsx`、`app/login/page.tsx`、`app/auth/callback/route.ts` 不得再含 `/account` 字面；只留 `account` 时 `app/account/layout.tsx` 不得再含指向 `/admin` 的常量
- `shipkit.config.json` 与 `ai/doc-spec.json` 的 style/payment/deploy/skills 与请求一致
- 站点专用 npm scripts（`waffo:preflight`、`verify:matrix`）不得进入客户 `package.json`；`ai:docs` / `ai:setup` **必须存在**
- `design.md` 非空、`AGENTS.md` >2000 字符且含本构建 style 与 `npm run ai:docs`；`CLAUDE.md` 含 `@AGENTS.md` / `@design.md`
- scoped rules **精确等于** `7 常驻 + payment(启用时) + rag + account + admin(各自选中时) + 选中 skills 数`，`.cursor/rules/*.mdc` 数量与 `ai/rules/*.md` 完全一致；`skills/README.md` 显示「N of 12」
- 生成工程 `tsc --noEmit` 退出码为 0

失败时解压产物保留在 `.matrix-out/<case>`，可直接进去复现。

## 加一个新 case

1. 在 `scripts/verify-matrix.mjs` 的 `CASES` 追加 `{ id, config }`（`c({...})` 基于 `BASE` 覆盖）；
2. 把同一个 `id` 加进 `.github/workflows/generated-matrix.yml` 的 `matrix.case`；
3. 同步更新 `scripts/verify-matrix.mjs` 里的 `CASES.length` 断言与顶部注释，以及 README / CI / `llms*.txt` / `openapi.json` / `/api/mcp` / compare 里的用例数（当前 **18**）与支付商数（当前 **6**）。新网关还要加进 `PAYMENT_FILES`、`prune.ts` 的 `PAYMENT_FILES` / `PAYMENT_LABELS` 与 `schema.ts` 的 zod 枚举；
4. 本地跑 `node scripts/verify-matrix.mjs --case <id>` 通过后再提交。

## 诚实边界

- 默认跑的是 **TypeScript 类型检查**；`--build` 会对代表用例（默认 `default-waffo-midnight` / `account-only` / `admin-only`，或 `--build-all` 全量）再跑真实 `next build` 并采集共享 First Load JS 与 `.next` 体积。CI 里默认只跑 tsc 以保证速度，发布报告时再开 `--build`。
- 矩阵验证的是**可编译性**，不验证运行时行为（支付回调、登录、RAG 检索质量）。
- `.matrix-out/` 是本地临时产物，不应提交；CI 每次在干净 checkout 中运行。`public/build-matrix.json` 由 `--publish` 写入，是展示用快照，可被后续运行覆盖。
- 站点 `/build-matrix` 页读取 `public/build-matrix.json` 展示最近一次发布结果（通过率、各 case 文件数、ZIP 体积、next build 耗时与产物体积）。
