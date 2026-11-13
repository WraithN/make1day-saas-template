---
name: video
description: AI video & image workflow module - consent, safety filters, labeling, credits, provider ops
globs: lib/video/**, app/video/**, app/api/video/**
---

# Skill: AI Video Workflow (source module)

This project ships the VIDEO WORKFLOW AS SOURCE: template-driven generation
jobs that run on YOUR hosting with YOUR provider keys (fal via
`@fal-ai/client`). The seller of this template delivers code, not hosted
generation, not media credits, not consent to process other people's faces.

## Do
- Create a job only with explicit `consent:true`; persist `consent_at` as the
  audit trail. Own-face-or-written-consent, full stop.
- Keep the visible "AI-generated" label on every output path.
- Reserve credits BEFORE submit, refund on ANY provider failure or cancel -
  a dead job must never eat the subscriber's monthly budget.
- Route through the model console: provider lanes, unit prices and the cost
  ledger live in `lib/billing.ts` / `/admin/models`; the studio reads them.
- Treat template clips as customer-hosted assets (`VIDEO_TEMPLATE_<ID>_URL`).
- Gate the studio by your own subscription plan (the shipped demo checks an
  active subscription or demo mode) - you own the pricing semantics.

## Don't
- Never add a face-swap entry point that skips consent, a watermark-removal
  path, or any flow that impersonates a real person. Payment providers' AUPs
  (and most jurisdictions) treat this as grounds for instant delisting -
  consent UIs do not cure prohibited use cases.
- Never bundle binary media in the repo; the ZIP must stay a codebase.
- Never log or persist raw provider keys; mask them in admin surfaces.
- Do not run the studio on the make1day store deployment (it sells source and
  switches `SHOW_VIDEO_STUDIO=false` accordingly); this module is for YOUR
  deployment.

## Verify before claiming done
1. `npm run compliance:check` (if the payment-compliance skill is bundled).
2. Job matrix: consent=false rejected · credits reserved→refunded on failure ·
   label present in output · webhook verifies before mutating state.
3. `/admin/models` shows the video lane with the key you configured, masked.
