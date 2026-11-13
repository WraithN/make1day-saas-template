# Skill: Payment Compliance

Every gateway this project can integrate ships with a machine-readable
compliance contract in `contracts/payment-compliance.json`, and
`scripts/payment-compliance-check.mjs` audits the repo against it:
`npm run compliance:check [--url=https://your-landing]`.

## What the checker enforces
1. The single webhook route exists and verifies signatures on the RAW body
   before any business logic (every gateway's non-negotiable).
2. Selected gateways' required env vars are documented in `.env.example`
   (grep lib/payments/index.ts to detect which gateways are wired).
3. Optional live probe: `/terms` and `/privacy` must return 200 on your
   public URL — a checkout that opens to a 404 legal page fails review.
4. Gateway-specific: Waffo Pancake RSA `${t}.${rawBody}` + per-environment
   public key + `subscription.payment_succeeded` must NOT provision (double
   grant); Stripe restricted keys + real recurring Price objects; PayPal
   has no billing portal — the in-app cancel route must exist; etc.

## Operating rules (read before shipping money)
- One-time vs recurring must be two DIFFERENT products at the gateway.
- Never trust an unsigned event; dedupe by event id before granting.
- Refund window must be stated concretely on /pricing, /terms and the
  gateway product description — three places, one sentence.
- MoR gateways (Waffo/Creem) are the seller of record: invoices, tax and
  dispute SLAs (72h Waffo) run through them; your support mailbox must be
  monitored because buyers reply to the receipt.
- AUP: sell downloads/services you own; no prohibited categories. For AI
  products keep moderation + visible labeling (see the video skill).
- Re-run `compliance:check` after ANY payments change; CI should fail on
  exit code 1.
