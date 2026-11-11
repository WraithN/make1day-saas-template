# How to test six payment gateways without going mad

> Configuration (keys, products, webhook URLs) lives in `docs/payments.md`.
> This document is about **verification**.

## 0. The short answer

You do **not** need six independent test suites. The code has one checkout
route (`POST /api/checkout`), one webhook route (`POST /api/webhook`), one
`PaymentProvider` interface (`lib/payments/types.ts`) and one shared business
pipeline: verify signature → dedupe by `(eventType, eventId)` → upsert
subscription → **issue license** → record order → record conversion. Only one
gateway is active at a time (`PAYMENT_PROVIDER`), selected by env.

So test **one shared pipeline** thoroughly, then test **six small adapters**
for the part that differs: signature verification and event normalisation.

```
checkout ──► provider.createCheckout()      (per-gateway: hosted page / order)
webhook  ──► provider.verifyWebhook()       (per-gateway: signature + mapping)
         ──► grantLicense / recordOrder     (shared, test once)
```

## 1. A real bug this testing discipline would have caught

Static review (2026-11-07) found that only Waffo (both flavours) and Lemon
Squeezy set `grantsAccess` on their normalised events. `grantLicense()` in
`app/api/webhook/route.ts` returns early unless `grantsAccess && plan` are
present — so **Stripe, Creem and PayPal buyers would have paid and received no
license key**. Those three adapters now emit `grantsAccess`, `email`,
`eventType`, `eventId` and `orderId` on a completed payment. The subscription
*update* events deliberately do not grant access: they carry no buyer email,
and the key was already issued by the original checkout event.

This is the single most important assertion in the whole matrix:

> **A completed test payment must create exactly one `licenses` row.**

## 2. Four layers

| Layer | What | Tool | Needs an account? |
|---|---|---|---|
| L0 | Env / secret readiness | `GET /api/payments/self-check`, `npm run waffo:preflight`, `GET /api/mail/self-check` | No |
| L1 | Signature contract (offline, repeatable, CI-able) | `scripts/payment-webhook-probe.mjs` | No |
| L2 | Real sandbox checkout + real webhook | each gateway's test mode + a tunnel | Yes (sandbox only) |
| L3 | Live smoke before launch | one real low-value purchase per gateway you actually enable | Yes (live) |

`npm run smoke` does **not** cover payments — it covers the license gate, AI
quota and AI streaming. That is why L1/L2 exist.

## 3. L1 — the offline signature probe

Start the site with the gateway you want to test, then run the probe:

```bash
# terminal 1 — one gateway at a time
PAYMENT_PROVIDER=stripe STRIPE_WEBHOOK_SECRET=whsec_xxx \
  LICENSE_SECRET=a-long-random-string npx next start -p 3000

# terminal 2
STRIPE_WEBHOOK_SECRET=whsec_xxx \
  node scripts/payment-webhook-probe.mjs --provider stripe --grant
```

For each provider it asserts:

| Case | Expected |
|---|---|
| missing signature | `400` |
| invalid signature | `400` |
| valid signature over a malformed JSON body | `400` |
| valid signature, body `{}` (legitimate but unhandled event) | `200 {"ignored":true}` |
| `--grant`: minimal paid event | `200` + one `licenses` row |
| `--grant`: replay the same event id | `200`, no second license |

Supported offline: `stripe`, `creem`, `lemonsqueezy`, `waffo-pancake`,
`waffo-acquiring`. For the two Waffo flavours, put the **private** key that
matches the server's public key in `WAFFO_PROBE_PRIVATE_KEY` (PEM, `\n`
escapes accepted).

**PayPal is intentionally skipped**: its adapter calls PayPal's own
`/v1/notifications/verify-webhook-signature`, so a local forged request cannot
pass without a live sandbox API call. Use the PayPal developer dashboard's
"Webhook events → Send test event" instead.

`--grant` needs `LICENSE_SECRET` set on the server (otherwise key signing
fails with 500) and a resolvable plan mapping (`*_PRICE_ID_*` /
`*_VARIANT_ID_*` in `lib/env.ts`). A `200` on `--grant` does **not** prove a
license was issued — check the row:

```sql
-- local backend
SELECT key, email, plan, order_id FROM licenses WHERE email = 'probe@example.com';
-- Supabase backend: same query in the SQL editor
```

Put this probe in CI for every gateway; it is the regression guard for the
"verify failure returns `[]`" bug that once made forged webhooks return 200.

## 4. L2 — sandbox end-to-end per gateway

General setup: expose your local `/api/webhook` over HTTPS with Stripe CLI,
ngrok, Cloudflare Tunnel or Tailscale Funnel, register that URL in the
gateway's **test/sandbox** dashboard, and copy the test signing secret into
`.env.local`. Use a distinct buyer email per run so you can find the row.

| Gateway | Test mode env (from `lib/env.ts`) | Test credentials | Webhook signature | Notes |
|---|---|---|---|---|
| **Stripe** | `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY=sk_test_…`, `STRIPE_WEBHOOK_SECRET=whsec_…`, `STRIPE_PRICE_ID_BUYOUT/CARE` | test card `4242 4242 4242 4242`, any future expiry/CVC | `stripe-signature: t=…,v1=…` (HMAC over `t.body`) | `stripe listen --forward-to localhost:3000/api/webhook` + `stripe trigger checkout.session.completed`. Most mature; start here |
| **Creem** | `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, `CREEM_ENV=test` (→ `test-api.creem.io`), `CREEM_PRICE_ID_*` | Creem test-mode checkout + test card from their docs | `creem-signature` = hex HMAC-SHA256(raw body) | MoR handles VAT. Portal endpoint/field names are best-effort — 需按 Creem 文档核对 |
| **PayPal** | `PAYPAL_CLIENT_ID/SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_ENV=sandbox` (→ `api.sandbox.paypal.com`), `PAYPAL_PLAN_ID_*` | sandbox business + sandbox personal buyer accounts | verified **via PayPal API** (`paypal-transmission-*`, `paypal-cert-url`, …) | Needs outbound network; subscription checkouts only; no billing portal |
| **Waffo Pancake** | `WAFFO_FLAVOR=pancake`, `WAFFO_ENVIRONMENT=test`, `WAFFO_STORE_SLUG`, `WAFFO_PRICE_ID_*`, `WAFFO_WEBHOOK_PUBLIC_KEY_TEST` | Waffo test-mode hosted checkout | `x-waffo-signature: t=<ms>,v1=<base64 RSA>` over `t.body`; **45-minute** replay tolerance | `npm run waffo:preflight` checks required vars first |
| **Waffo Acquiring** | `WAFFO_FLAVOR=acquiring` + all `WAFFO_ACQUIRING_*` contract fields, `WAFFO_PRIVATE_KEY`, `WAFFO_WEBHOOK_PUBLIC_KEY`, `WAFFO_ACQUIRING_SIGN_MODE` | merchant test credentials from your Waffo contract | `x-signature` = base64 RSA over the raw body | Canonical signing string, response shape and webhook metadata are **需按你的 Waffo 合同核对** (`docs/waffo.md §5`); do not guess them |
| **Lemon Squeezy** | `PAYMENT_PROVIDER=lemonsqueezy`, `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_WEBHOOK_SECRET`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_VARIANT_ID_*` | store in test mode + test card | `x-signature` = hex HMAC-SHA256(raw body) | JSON:API checkout; `custom_data` echo location and portal id (customer vs subscription) are **需按账户核对** |

For each gateway, run **the same six assertions**:

1. `GET /api/payments/self-check` → no missing vars, provider name matches.
2. Signed-in `POST /api/checkout` → `200 { url }` (an anonymous call must be `401`).
3. Complete the sandbox payment with the test card / test buyer.
4. Webhook arrives → `200`; **one** `licenses` row with the buyer email and
   the right plan; **one** `orders` row; a `conversion` event in `traffic_events`.
5. Re-send the same event from the dashboard (or `--grant` replay) → still one
   license row (dedupe on `eventType + eventId`).
6. Trigger refund / cancellation → subscription status updates, access
   behaviour matches the plan, no duplicate order.

## 5. Failure injection checklist

| Inject | Expected |
|---|---|
| Forged / missing / stale signature | `400`, no DB write |
| Malformed JSON with a valid signature | `400` |
| Duplicate `eventId` | `200`, no second license |
| Unknown event type | `200 {"ignored":true}`, no write |
| Webhook handler throws (e.g. DB down) | `500` so the gateway retries; retry succeeds after recovery |
| Waffo Pancake timestamp older than 45 min | `400` (replay window) |
| `LICENSE_SECRET` unset | paid path fails loudly, never silently grants a free ZIP |
| Refund / chargeback event | status `canceled`, no new license |

## 6. L3 — before you take real money

1. Pick **only the gateways you will actually enable**; you do not need to
   certify all six. Keep the rest out of the production config.
2. Repeat the L2 flow in **live** mode with a low-value real purchase, then
   refund it. Confirm live keys, live webhook URL and `NEXT_PUBLIC_SITE_URL`
   (it feeds `successUrl`, `cancelUrl` and `notifyUrl`).
3. Walk the **buyer** path end to end, not just the admin view:
   sign in → pay → webhook → **receive the key** → redeem at `/license` →
   `POST /api/generate` → download ZIP → `npm i && npm run build`.
4. **Verify the delivery chain**: `grantLicense()` now returns the issued key
   and the webhook calls `deliverLicenseKey()` (dedupe key `license:<jti>`).
   Confirm the buyer received the `licenseKey` email, that a `delivery_events`
   row of kind `key_email` was written with a hashed email, and that a failed
   send landed in `mail_outbox` for `POST /api/cron/mail-outbox` to retry.
   Guest checkout / mismatched emails use `/api/license/claim` — test it too,
   and confirm the endpoint never reveals whether an address has a licence.
   Keep `MAIL_PROVIDER` off `none` for live tests; otherwise nothing is sent.
5. Reconcile `orders` against the gateway dashboard, then delete the test
   rows (see `docs/legal-data-map.md`; `POST /api/cron/retention` handles
   time-bounded rows but deliberately keeps `orders` / `licenses` for
   accounting, so test rows must be removed explicitly).

## 7. Honest boundaries

- The probe covers the **signature layer**, not the gateway's real payload
  shape. Only a sandbox event proves the field mapping (`grantsAccess`, `email`,
  `plan`, `eventId`) is right.
- Waffo Acquiring's protocol details, Lemon Squeezy's `custom_data` location,
  Creem's portal endpoint and PayPal's webhook event names are explicitly
  marked 需按服务商文档/合同核对 in `AGENTS.md`. Do not promote an assumption
  to "tested" until a real sandbox event has passed assertion #4.
- Prices, plan mappings and Merchant-of-Record tax behaviour are account
  configuration, not code. A missing `*_PRICE_ID_*` makes `plan` undefined,
  which silently prevents license issuance — assertion #4 catches it.
- No automated payment tests currently exist in `npm run smoke`; adding the
  probe to CI is a manual step.

## 8. Creem runbook (test mode, zero real money)

Test mode is a fully isolated environment (separate keys, separate
`test-api.creem.io` endpoint, separate webhooks). Nothing is charged.

### Cards (any future expiry, any CVV, any billing info)

| Card | Behaviour |
|---|---|
| `4111 1111 1111 1111` | success |
| `4507 9900 0000 0028` | declined |
| `4507 9900 0000 0010` | insufficient funds |
| `4507 9900 0000 0044` | incorrect CVC |

### Preconditions

- `CREEM_ENV=test`, the TEST `CREEM_API_KEY` and the **test-mode** webhook's
  `CREEM_WEBHOOK_SECRET` (register `https://<domain>/api/webhook` while the
  dashboard is in Test Mode — test events only go to test webhooks)
- four test products mapped to `CREEM_PRICE_ID_*` (incl. `_BF`), amounts
  per `lib/pricing.ts`:

  | Creem product | Type | Amount | env var |
  |---|---|---|---|
  | Buyout regular | one-time | $249 | `CREEM_PRICE_ID_BUYOUT` |
  | Buyout Black Friday | one-time | $174 | `CREEM_PRICE_ID_BUYOUT_BF` |
  | Care regular | monthly | $19 | `CREEM_PRICE_ID_CARE` |
  | Care Black Friday | monthly | $13 | `CREEM_PRICE_ID_CARE_BF` |
- redeploy after env changes (Vercel snapshots env per deployment)

### Cases

1. Checkout: /black-friday → Buy → Creem hosted checkout shows the TEST badge.
2. Success: 4111… → paid → redirect → key visible at /account/licenses.
3. Durability: `licenses`/`orders`/`webhook_events` each +1 row; replay the
   same event from the dashboard → no second license (dedupe on (type,id)).
4. Delivery: mail contains `SK1.…` (Resend verified) else a `mail_outbox`
   row (cron retries); `delivery_events` hash present.
5. Gate: incognito POST /api/generate without key → 402; with the SK1 key → 200 ZIP.
6. Declines: 4507…0028 / 0010 / 0044 → checkout error; no license/order rows.
7. Care: 4111… on the monthly product → `subscriptions` active; the first
   `subscription.payment_succeeded` must NOT double-grant (ignored by design).
8. Claim: pay with an email different from the signed-in account →
   /api/license/claim flow works.
9. Console: /admin licenses + orders show the rows; traffic funnel counts the
   conversion.

### Live (real money) — optional, once, before launch

Not required for functional testing. For a single live sanity check: create a
**$1 live product**, temporarily point `CREEM_PRICE_ID_BUYOUT_BF` at it, pay
with a real card, refund from the Creem dashboard afterwards (MoR refunds).
Net cost ≈ 0 (processing fees may be non-refundable). Creem's live account
review requires the store on its **own custom domain** — bind www.make1day.dev
before requesting live keys.
