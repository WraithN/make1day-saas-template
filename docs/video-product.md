# Video Studio（网红视频模板 + AI 换脸）— 产品设计与护栏

> 状态：设计稿（2026-11-10）。订阅专属（Care 权益），未开始编码；
> 开工前置决策见 §6。定价口径见 `lib/pricing.ts`（Care 含每月视频额度）。

## 1. 产品定义

用户选择一支**网红风格视频模板**（舞蹈/口播/种草/开箱等预置片段），上传**自己的**
正脸自拍，系统调用第三方换脸+渲染 API 产出成片：下载 / 分享 / 用于自己的社媒。
订阅（Care）专属权益，按月度额度计费（credits），不做单条售卖。

## 2. 合规护栏（不可协商，写进代码与 ToS）

1. **同意前置（consent-first）**：v1 仅允许"换自己的脸"——上传自拍时强制勾选
   肖像权声明（五语），并做活体/人脸一致性校验（selfie 与请求者会话绑定）；
   上传他人肖像需单独书面同意流程，v1 不做、ToS 明确禁止。
2. **深度合成标识**：成片带可见 "AI generated" 水印 + 元数据标注。依据：中国
   《互联网信息服务深度合成管理规定》（显著标识、被编辑者同意）、EU AI Act
   Art.50 透明度义务。水印去除 = 违约 + 封号。
3. **用途禁止清单**（ToS + 上传页公示）：未成年人、色情/亲密影像、政治人物与
   选举内容、冒充他人/欺诈、骚扰诽谤。命中即拒绝并保留审计。
4. **供应商约束**：只接允许 consent-based face-swap 的模型端点（fal.ai 的
   face-swap 系列要求 consent attestation）；供应商安全过滤器不关闭。
5. **审计与下架**：`video_jobs` 全量留痕（输入哈希、输出 ID、声明时间戳）；
   举报通道接入 /support 工单；侵权通知 24h 下架流程写进 /terms。

## 3. 架构（MVP）

- `lib/video/provider.ts`：fal.ai 适配器（queue-subscribe 模式：submit → webhook
  回调 → 取结果）；接口留 Replicate 备选。密钥仅服务端。
- 数据：迁移 `0013_video.sql` —— `video_jobs(id, user_id, template_id, status,
  provider_job_id, input_hash, output_url, credits, consent_at, created_at)` +
  RLS；`video_usage` 月度额度计数（参照 `ai_usage` 的配额模式，429/402 语义一致）。
- 路由：`POST /api/video/jobs`（Care 门：非订阅 402；额度耗尽 429）、
  `GET /api/video/jobs/[id]`、`POST /api/video/webhook`（provider 签名校验，
  参照 payments webhook 的验签纪律）、模板目录走 `lib/content/video-templates.ts`
  （site-only，样板间的五语内容模式复用）。
- 存储：成片落 Supabase Storage（私有桶 + 签名 URL，7 天有效，到期清理并入
  retention cron）。
- 页面：`/video`（-gallery，登录可见）与 `/video/studio`（订阅门，上传+进度+结果），
  middleware 会话门复用 `/dashboard` 模式；五语 i18n；JSON-LD 不上（工具页 noindex）。
- 生成器侧：**v1 不进 Builder 选项**（站点产品先跑通商业与合规闭环）；phase 2 再
  作为 `video` Feature 进模板（届时遵守 AGENTS.md 规则 2/3：prune + schema + matrix）。

## 4. 成本与额度（2026-11 调研）

- fal 视频计费按秒：480p ≈ $0.068/s、720p ≈ $0.14/s、1080p ≈ $0.28/s；
  换脸模板片长 15–25s → 单条 COGS ≈ **$1.0(480p) / $2.8(720p) / $6(1080p)**。
- 对照订阅竞品：HeyGen Creator $29/mo、Synthesia Starter $29/mo、D-ID Pro $29/mo
  → Care 常售 $19 / 黑五 $12 含视频额度 = "比他们低一点" 的定位成立，但额度必须
  按 COGS 反推：
  - 默认 **480p、6 credits/月**（常售 Care）→ COGS ≤ $6.6，毛利正；
  - 黑五/分享价入会首月 **3 credits**；
  - 720p = 2 credits/条、1080p = 5 credits/条（分辨率换额度，不加价）；
  - 加量包（10 credits $9）phase 2 再议。
- 熔断：单用户日 ≤3 jobs、并发 1；provider 失败自动退额度并入 mail_outbox 通知。

## 5. 与现有模块的关系

- 门禁复用：middleware 会话门 + `guardApiWrite` 限流 + subscription 402 语义；
- 配额模式复用 `ai_usage` 的日/月计数与 429 头（`Retry-After`、reset 时间）；
- webhook 验签纪律复用 payments 的 raw-body 签名模式（§AGENTS 规则 4）；
- 样板间 phase 2 可加一支 "video studio" 模板面（静态演示）。

## 6. 开工前置决策（需 owner 拍板）

| # | 决策 | 建议 |
|---|---|---|
| D1 | provider：fal.ai / Replicate | **fal.ai**（同模型便宜 ~2x，queue API 成熟）；需注册并给 API key |
| D2 | 同意模型：仅本人 / 任意脸+声明 | **仅本人**（v1），合规成本最低 |
| D3 | 范围：站点产品 / 同时进生成器 | **站点产品先**（本 doc §3），生成器 phase 2 |
| D4 | 额度/分辨率默认 | 480p 6 credits/月（§4），黑五首月 3 |

决策齐 + fal key 到位后，预计 3–5 个_AGENT_工作日可交付 MVP（含迁移、门禁、
水印、五语 UI、matrix/审计脚本同步）。
