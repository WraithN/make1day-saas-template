---
name: payments
description: Modify checkout, webhook verification and subscription state in a ShipKit project; keep one-time Buyout and recurring Care billing distinct.
globs: lib/payments/**, app/api/checkout/**, app/api/webhook/**, app/api/license/**, app/pricing/**
---

# Skill: Payments & Webhooks (ShipKit)

Use this skill for anything that moves money. Mistakes here lose orders.

## Contract
- `lib/payments/types.ts` defines `PaymentProvider`, `CheckoutParams`, `NormalizedSubEvent`.
- `lib/payments/index.ts` is **generated** to wire only the selected gateway.
- There is exactly **one** webhook endpoint: `POST /api/webhook`. It dispatches by `PAYMENT_PROVIDER`. Never register `/api/webhooks/<provider>`.
- Plans: `buyout` = **one-time**, `care` = **monthly recurring**. Do not collapse them into one mode.

## Webhook rules (non-negotiable)
1. Verify the signature **on the raw body string**, before `JSON.parse`. Re-serialising breaks RSA/HMAC verification.
2. Missing verification config must fail closed (4xx), never fall back to "trust it".
3. Deduplicate on `eventType + eventId` before writing. Payment gateways retry up to 4 times.
4. If the database write fails, return **5xx** so the gateway retries; a 2xx with a failed write loses the order.
5. Only `grantsAccess` events issue a license. For Waffo Pancake, `subscription.payment_succeeded` is deliberately ignored — the initial payment must not double-grant.
6. `subscription.canceling` keeps access until `currentPeriodEnd`; `subscription.canceled` / `refund.succeeded` revoke it.

## Waffo Pancake specifics
- `WAFFO_FLAVOR=pancake` targets `docs.waffo.ai` (Merchant of Record). `acquiring` is a **different, incompatible product**.
- Auth: either `WAFFO_STORE_SLUG` (public) **or** `WAFFO_MERCHANT_ID` + `WAFFO_PRIVATE_KEY` (RSA request signing). They are mutually exclusive.
- Checkout: `/v1/actions/checkout/create-session` with `productId`, `productType: "onetime" | "subscription"`, `currency`, `buyerEmail`, `metadata`, `successUrl`.
- Webhook header `X-Waffo-Signature: t=<ms>,v1=<base64>`; verify `RSA-SHA256` over `${t}.${rawBody}` with the **environment-matching** platform public key (`_TEST` / `_PROD`).
- The product ID *is* the price ID. No separate price object.

## Do / Don't
- DO keep all protocol assumptions inside `lib/payments/<provider>.ts`.
- DO use `checkEntitlement()` before returning any paid artifact.
- DON'T log secrets, raw signatures or full buyer PII.
- DON'T trust `metadata.plan` for authorization without verifying the event signature first.

## Verify
`npm run waffo:preflight -- --strict` (site only) → test payment → `/admin/licenses` shows exactly 1 key → replay the event → still 1 key.
