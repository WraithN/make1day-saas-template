# Agent-Native Delivery — ShipKit P0

> 竞品报告 `docs/competitive-analysis.md` 的 P0 项。目标：让 AI coding agent 下载 ZIP 后
> **不需要猜** —— 根目录就有契约、按风格锁定的设计说明、按目录生效的 scoped rules，
> 且配置一改，所有文档一键重建。

## 1. 单一真源

```
lib/generator/spec.ts          (TypeScript：从 BuilderConfig + PALETTES + 选项生成纯 JSON)
        │
        ▼
scripts/lib/ai-docs.mjs        (零依赖 ESM：唯一的文档渲染器，buildDocSet(spec))
        │
        ├──► lib/generator/pack.ts  → 打包时把 buildDocSet() 的结果写进 ZIP
        └──► scripts/ai-docs.mjs   → 客户工程内读 shipkit.config.json（主源）
                                     + ai/doc-spec.json（目录），写回同样的文件
             scripts/ai-setup.mjs  → 只刷新 .cursor/rules/* 与 CLAUDE.md
```

`ai/doc-spec.json` 随 ZIP 一起交付，包含 `config` 缓存、**全 12 个 skill 的元数据**、
**全 10 套 palette**（token/HEX/radius/texture）、字体栈和全部选项 label。
`shipkit.config.json` 是**选项的主源**：`ai-docs` / `ai-setup` 每次运行都先读它，
再用 catalog 重新派生 labels 与 style（`deriveSpec()`），因此改 manifest 才会真正改文档。
**不要手改输出文件。**

## 2. 每个 ZIP 里的产物

| 路径 | 消费者 | 内容 |
| --- | --- | --- |
| `AGENTS.md` | 所有 agent | 本构建选项表、命令、仓库地图、scoped rules 索引、skills 索引、8 条不可协商规则、style lock CSS、模块备注、完成定义 |
| `design.md` | 所有 agent | 按风格生成的色板 token/HEX、字体、radius、texture、组件词表、响应式/a11y、UI 检查清单 |
| `ai/rules/*.md` | 支持 globs 的 agent | 7 条常驻模块规则 + payments（启用支付时）+ rag / account / admin（各自选中时），共 7–11 条，再加每条选中 skill 一条；带 `name`/`description`/`globs` frontmatter |
| `.cursor/rules/*.mdc` | Cursor | 同一批规则的 Cursor 原生格式（`alwaysApply: false`） |
| `CLAUDE.md` | Claude Code | `@AGENTS.md`、`@design.md`、全部 rules 与 skills 的 import 列表 |
| `skills/README.md` | 任意 agent | 按选中项动态生成的索引，含「N of 12」 |
| `skills/*.md` | 任意 agent | 12 份聚焦 playbook，按 Builder 选择剪枝 |
| `scripts/lib/ai-docs.mjs` + `scripts/ai-*.mjs` | 客户 | 离线重建能力，无网络、无新依赖 |

**为什么用 `AGENTS.md` 而不是 `agents.md`**：主流 coding agent 认根目录大写标准名；
Windows/macOS 默认文件系统大小写不敏感，同时保留两个名字会互相覆盖，因此旧的小写
文件已从 ZIP 中移除。`verify-matrix.mjs` 明确断言 ZIP 里没有 `agents.md`。

## 3. 技能清单（12）

`frontend` / `ui` / `backend` / `testing` / `seo`（原有）＋
`auth`（Supabase/OAuth/middleware）、`payments`（单 webhook/RSA/买断 vs 订阅）、
`database`（迁移/RLS/service role）、`rag`（BM25+embeddings+RRF）、
`i18n`（五语字典/Trans/SSR lang）、`deploy`（env/runtime/构建顺序）、
`agents`（阅读顺序/ai:docs/DoD）。

每份都有 frontmatter 的 `globs`，并映射为一条 `ai/rules/skill-<id>.md`。
`SKILL_FILES` / `SKILL_GLOBS` 在 `lib/generator/prune.ts`；新增 skill 必须同步
`config.ts`、`prune.ts`、`lib/generator/schema.ts`、`verify-matrix.mjs` 四处。

## 4. 配置变更后一键重建

```bash
# 修改 shipkit.config.json 或 ai/doc-spec.json
npm run ai:docs     # 重建全部文档 + 顺带刷新工具集成
npm run ai:setup    # 只刷新 .cursor/rules 与 CLAUDE.md
npm run ai:setup -- --tool cursor
node scripts/ai-docs.mjs --dry-run   # 只报告哪些文件会变
```

渲染是确定性的：spec 不变时重复执行不会改动任何文件（`ai-docs.mjs` 会逐文件比较内容）。
`scripts/ai-setup.mjs --tool all|cursor|claude` 支持只接一个工具。

## 5. 验收方式

- `verify-matrix.mjs --all`（16 组）对每组真实 ZIP 断言：`AGENTS.md` 存在且含本构建 style、
  `agents.md` 不存在、scoped rules 精确等于条件计数、`.cursor/rules/*.mdc` 与 `ai/rules/*.md` 数量一致、
  两套后台文件按勾选存活且无死链、
  `CLAUDE.md` import 完整、`ai/doc-spec.json` 的 style/skills 与配置一致、
  `skills/README.md` 显示「N of 12」、客户 `package.json` 有 `ai:docs`/`ai:setup` 且无站点专用脚本。
- 解压后单独 `tsc --noEmit` 0 错。
- 解压后执行 `npm run ai:docs -- --dry-run` 应报告 0 文件变化（说明打包内容与重建结果一致）。

## 6. 诚实边界

- `AGENTS.md` 里的规则是**约定**，不是静态检查；仓库没有 lint rule 强制执行它们。
- Scoped rules 是否自动生效取决于客户端是否读取 `.cursor/rules` / `CLAUDE.md` / `globs`；
  `AGENTS.md` 是通用兜底。
- Cursor 的 `.mdc` 格式、`@import` 语法会随工具版本变化，接入示例见 `docs/mcp.md`。
- 生成工程仍保留 ShipKit 品牌与营销页；白标清理是 P2，不在本次范围。
- **改 `style` 只重建文档，不会重写 `app/globals.css`**（CSS 是打包时注入的）。要真正换配色必须回 Builder 重新生成 ZIP；`ai:docs` 覆盖的是 skills / features / payment / auth / deploy 等不改变 CSS 的配置。
