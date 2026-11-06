# Agent Discovery / GEO：机器可读分发面

> 对应 `docs/competitive-analysis.md` 的 P0 机会。2026 年选择 SaaS 启动模板的往往不是人，而是先读 README / AGENTS.md / `llms.txt` 的 AI coding agent 与答案引擎。让它们**不靠猜**就能拿到准确事实，是一条新的分发入口。

## 端点总览

| 路径 | 格式 | 读者 | 内容 |
|---|---|---|---|
| `/llms.txt` | text/plain | 答案引擎、爬虫 | 短版产品概述、定价、差异点、关键页面与文档链接 |
| `/llms-full.txt` | text/plain | coding agent、选型 agent | **长版事实表**：BuilderConfig 完整枚举、剪枝规则、RAG 算法参数、支付协议、license gate 顺序、API 汇总、已知限制 |
| `/openapi.json` | OpenAPI 3.1 JSON | 工具型 agent、集成脚本 | 11 个路径 / 16 个操作的请求/响应 schema、错误码、安全方案、`BuilderConfig` 完整 JSON Schema |
| `/api/mcp` | JSON-RPC 2.0 / MCP | coding agent | `get_product_info`、`get_builder_config`、`scaffold_project`、`get_agent_delivery`；`includeZip` 与网站同一 license gate；`scripts/mcp-server.mjs` 提供 stdio 桥接 |
| `/agent-ready` | HTML + TechArticle JSON-LD | 人 + agent | 五语落地页：四层发现面、建议抓取顺序、每个 ZIP 内的 agent 契约、诚实边界 |
| `/sitemap.xml` | XML | 搜索引擎 | 可索引页面 + 五种语言 `?lang=` 变体 + 三个机器可读端点 + `/agent-ready` |
| `/robots.txt` | text/plain | 所有爬虫 | 默认规则；对 GPTBot / ClaudeBot / PerplexityBot / Google-Extended / Applebot-Extended / CCBot / Bytespider 显式放行，并显式允许机器可读路由与 `/builder` |
| 各页面 JSON-LD | JSON-LD | 搜索/答案引擎 | Organization、WebSite、FAQPage、BlogPosting、OfferCatalog |
| `/api/payments/self-check` | JSON | 运维、部署 agent | 只读配置就绪状态，不返回密钥 |

`/llms.txt` 是入口，`/llms-full.txt` 是详情，`/openapi.json` 是可执行契约，`/api/mcp` 是「让 agent 动手」的工具层，`/agent-ready` 是给人看的说明页：五者互相链接，避免 agent 只抓到营销话术。

## 建议的 agent 抓取顺序

1. `/llms.txt` → 判断这是什么、卖多少钱、值不值得继续读。
2. `/llms-full.txt` → 拿到「能力 + 边界」：能选什么、哪些模块会真剪掉、RAG 用什么算法、哪些功能其实没实现。
3. `/openapi.json` → 若要调用生成器，直接按 `BuilderConfig` schema 构造 `POST /api/generate`。
4. `/api/mcp` → `scaffold_project` 组装并校验配置，拿到可直接 POST 的请求体；`/agent-ready` 是人类可引用的说明。
5. `/pricing`、`/compare`、`/faq`、`/blog` → 人类可引用的出处与长尾内容。
6. 下载 ZIP 后先读 `AGENTS.md`、`design.md` 与 `ai/rules/*.md` → 开始改代码。

## 为什么把「已知限制」写进机器可读文档

`llms-full.txt` 第 12 节明确列出：Waffo Acquiring 下单报文未实现、Cloudflare 选项仍有 Node runtime 冲突、PayPal 无账单门户、多租户虽带 `0007_orgs.sql` + `lib/org.ts` 但工作区 UI 需同时勾选用户后台且业务表需自行加租户过滤、生成工程的法律页仍是占位符、build matrix 默认只跑 `tsc`（代表用例另跑 `next build`）、MCP 为无状态 JSON-RPC、`AGENTS.md`/scoped rules 只是文字约定而非 lint 强制。AI 已改为真流式并带每用户每日配额，客户首页/定价页已无 ShipKit 品牌并附带 MIT LICENSE——这些**不再**是限制。`/agent-ready` 四语页同样列出这些边界。

答案引擎引用一份**诚实**的事实表，比引用一份夸大宣传更不容易在后续对话里被打脸；这也是 `/compare` 与 `/faq` 已经修正过的不实文案原则的延伸。

## 与生成模板的隔离

以下 **7 个文件**是本站专属，不能出现在客户下载的 ZIP 里：

- `app/llms.txt/route.ts`
- `app/llms-full.txt/route.ts`
- `app/openapi.json/route.ts`
- `app/api/payments/self-check/route.ts`
- `app/api/mcp/route.ts`
- `app/agent-ready/page.tsx` + `lib/content/agent-ready.ts`

`lib/generator/prune.ts` 的 `SITE_ONLY_FILES` 统一排除它们；`scripts/verify-matrix.mjs` 对每个组合断言它们不在 ZIP 里。`pack.ts` 另外：
- 用 `pruneAgentReadyLink()` 从 `components/Footer.tsx` 去掉 `/agent-ready` 链接，避免生成工程出现死链；
- 从 `package.json` 删掉 `waffo:preflight` / `verify:matrix`，并**注入** `ai:docs` / `ai:setup`（客户工程自己拥有 AI 文档重建能力）。

客户项目仍保留 `robots.ts` / `sitemap.ts` 与结构化数据脚手架，因为那是模板卖点之一。

## 本地验证

```bash
curl -fsS http://localhost:3000/llms.txt | head -5
curl -fsS http://localhost:3000/llms-full.txt | grep -n "Builder / generator contract"
curl -fsS http://localhost:3000/openapi.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const d=JSON.parse(s);console.log(d.openapi, Object.keys(d.paths).length+' paths')})"
curl -fsS http://localhost:3000/robots.txt
curl -fsS http://localhost:3000/sitemap.xml | grep -o "llms-full.txt" | head -1
```

## 诚实边界

- **已实现** MCP server / `scaffold_project`（`app/api/mcp/route.ts` + `scripts/mcp-server.mjs`，详见 `docs/mcp.md`），但它是**无状态 JSON-RPC over HTTP**：没有 sampling、prompts、订阅或 SSE 流式；`includeZip=true` 受 license gate 约束，默认只返回配置 JSON。
- **没有**实现 `/.well-known/agents.md`：该路径不是通用标准，先不引入未验证约定。
- **没有**在官网展示 build matrix 实时通过率与产物体积；CI 结果在 GitHub Actions，见 `docs/build-matrix.md`。
- 端点内容主要是静态事实描述，**不读取数据库实时状态**；实时状态请用 `/api/payments/self-check` 与 `/api/license`。
- `AGENTS.md` / scoped rules 是文字约定，未被 lint 强制执行；客户端是否自动加载 `.cursor/rules`、`CLAUDE.md` 取决于工具版本。
