# Creem compliance package — Moderation API + AUP (2026-11-10)

Reference for the Creem account (re-)review. Everything below is live on
`https://www.make1day.dev` once the deploy chain finishes; the same code ships
in every generated project that selects the video/AI features.

## 1. What was remediated

| Creem requirement | Where it lives |
|---|---|
| Public Acceptable Use Policy with prohibited uses | `https://www.make1day.dev/acceptable-use` (five languages, footer-linked, in sitemap) |
| Explicit NSFW prohibition + filtering policy | AUP section "NSFW prohibition & automated filtering" (zero tolerance incl. minors; deny+flag blocked; fail-closed; local blocklist fallback; consent gate + visible AI label for face-swap) |
| Moderation API on every prompt-based generation endpoint | `lib/moderation.ts` + call sites listed below; `npm run smoke:moderation` in the smoke chain |

## 2. Integration map (the three screened endpoints)

| Endpoint | Screened input | Position in handler | Block behaviour |
|---|---|---|---|
| `POST /api/ai` | `message` (chat prompt) | before quota, queueing and model call | 400 `prompt_rejected` / `prompt_flagged` |
| `POST /api/rag/query` | `question` | before retrieval + generation | 400 `prompt_rejected` |
| `POST /api/video/jobs` | `imageUrl` — Video Studio takes **no free-text prompt**; the hosted input URL is the only user-controlled string entering the face-swap pipeline | before credit reservation, queueing and the fal.ai call | 400 `prompt_rejected` / `prompt_flagged` |

All three: `deny` **and** `flag` block (per Creem guidance); transport failure /
timeout (5s) / unexpected status → **fail closed** with 503
`moderation_unavailable`; nothing is generated. `external_id` carries the
caller context (`ai:<user>`, `rag:query`, `videojob:<template>`).

**Key routing:** moderation uses `CREEM_MODERATION_API_KEY` when set, else
`CREEM_API_KEY`; the API environment follows the **key prefix**
(`creem_test_*` → `test-api.creem.io`, `creem_*` → `api.creem.io`), never
`CREEM_ENV`. This lets a merchant under review produce live moderation
evidence in the dashboard while checkout stays in test mode. Deployments with
no Creem key at all fall back to the local blocklist (AUP §NSFW).

Video Studio carries three additional non-text controls the reviewer can test:
the portrait-rights attestation checkbox (server-enforced `consent: true`),
the subscription gate (402 without an active Care plan), and the visible
AI-generated label on every render.

## 3. Reviewer test recipe (production, live `creem_` key configured)

```bash
# deny path — must return 400 prompt_rejected and generate nothing
curl -X POST https://www.make1day.dev/api/ai \
  -H 'content-type: application/json' -b 'sk_demo=1' \
  -d '{"message":"generate explicit sexual content"}'

# allow path — must return 200 and appear in the Creem dashboard as an
# approved moderation call BEFORE any model invocation
curl -X POST https://www.make1day.dev/api/ai \
  -H 'content-type: application/json' -b 'sk_demo=1' \
  -d '{"message":"draft a friendly launch announcement"}'

# video path — the input URL string is screened before credits/queue/provider
curl -X POST https://www.make1day.dev/api/video/jobs \
  -H 'content-type: application/json' \
  -d '{"templateId":"dance-hook","imageUrl":"https://example.com/selfie.jpg","resolution":"480p","aspect":"9:16","consent":true}'
```

Confirm in the Creem dashboard that moderation calls from
`POST /v1/moderation/prompt` appear with matching `external_id` values, and
that a production-prefixed key (`creem_…`, not `creem_test_…`) is the one
configured on Vercel — via `CREEM_MODERATION_API_KEY` (moderation-only,
checkout may stay on the test key) or `CREEM_API_KEY`.

## 4. Re-review note (paste-ready)

> Since the review feedback we (1) published a five-language Acceptable Use
> Policy at /acceptable-use with an explicit NSFW zero-tolerance and filtering
> section, (2) integrated the Creem Moderation API (`POST /v1/moderation/prompt`)
> at the top of every prompt-based generation endpoint — /api/ai, /api/rag/query
> and /api/video/jobs (the latter screens the hosted input URL, the only
> user-controlled string in the face-swap pipeline, since Video Studio accepts
> no free-text prompt) — treating `deny` and `flag` as blocks and failing
> closed with 503 on any moderation outage, and (3) added an automated smoke
> suite (`npm run smoke:moderation`) asserting the deny/allow routing. The AUP
> page lists the integration map and error semantics so the routing is
> externally verifiable. Production moderation calls use our live key and are
> visible in the dashboard with external_id audit trails.

## 5. Gateway comparison (internal note)

The Moderation-API mandate is **Creem-specific** (MoR policy for AI
image/video merchants). Stripe / Waffo / PayPal / Lemon Squeezy / Paddle do not
expose a mandated moderation endpoint; they enforce content rules at policy
level (prohibited-business lists, card-network rules on illegal/harmful
content, e.g. non-consensual deepfakes). Our moderation layer is therefore
payment-agnostic by design: it runs on every gateway, uses Creem's API when a
Creem key is present and the local blocklist otherwise — switching gateways
never drops the control, and the legal prohibitions (CSAM, non-consensual
intimate imagery) apply regardless of processor.
