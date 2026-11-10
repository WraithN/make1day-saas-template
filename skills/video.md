---
name: video
description: Build or extend the video studio (consent-gated face-swap) module - fal.ai jobs, credits, labeling, webhook.
---

# Skill: Video Studio (face-swap)

## What ships with the feature
- `lib/video/fal.ts` — fal.ai queue adapter (submit / poll / result / webhook HMAC).
- `lib/video/quota.ts` — monthly credits (Care = 6/mo; 480p=1, 720p=2, 1080p=5) with refund-on-failure.
- `lib/video/store.ts` — dual-backend (Supabase RLS / local SQLite) job ledger.
- `app/video` + `app/video/studio` — gallery and consent-first studio UI (session-gated by middleware).
- `app/api/video/jobs`, `app/api/video/jobs/[id]`, `app/api/video/webhook`.
- `supabase/migrations/0013_video.sql` (owner-only RLS on both tables).

## Rules of the road
1. **Consent before compute.** The API rejects any payload without `consent: true`;
   the checkbox copy (five languages) names the prohibited categories. Do not
   add routes that bypass it.
2. **Label everything.** Outputs keep the visible AI-generated label (deep-synthesis
   rules: CN 《互联网信息服务深度合成管理规定》, EU AI Act Art.50). No de-watermark tooling, ever.
3. **Money-safe credits.** Reserve → submit → refund on any failure path, including
   webhook FAILED and lazy-sync FAILED. Add new failure paths with a refund.
4. **Webhook discipline.** Raw-body HMAC, timing-safe compare, fail closed when
   VIDEO_WEBHOOK_SECRET is unset in production (same contract as payments).
5. **Assets are the customer's.** Template clips come from
   `VIDEO_TEMPLATE_<ID>_URL`; never commit binary media. New template = entry in
   `lib/content/video-templates.ts` (five-language name/tag) + env doc line.
6. **Provider keys stay server-side** (`FAL_KEY`); the studio renders a configuration
   notice when missing instead of erroring at click time.

## Extending
- New resolution: add to `COST_BY_RESOLUTION` + the studio select + i18n note.
- New provider: implement submit/poll/result behind `lib/video/fal.ts`'s shape and
  select via `VIDEO_PROVIDER`; keep the webhook verifier per-provider.
- Storage of results (Supabase Storage/S3, 7-day retention) is the planned phase 2;
  until then `output_url` points at the provider's signed URL.
