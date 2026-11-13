---
name: payment-compliance
description: Run the compliance audit workflow - detect the wired payment gateways, fetch each gateway's live policy pages, fix findings, and cover GDPR / UK GDPR / CCPA / LGPD / PDPA / DPDP data-protection controls. TRIGGER ON: "合规修复", "合规审核", "合规改进", "compliance fix", "compliance audit", "compliance review", "compliance improvement" - and ALWAYS before any first deploy / production release / after any payments change.
globs: contracts/**, scripts/payment-compliance-check.mjs, lib/payments/**, app/api/webhook/**, app/terms/**, app/privacy/**
---

# Skill: Payment Compliance Audit (make1day)

Two halves: the machine-readable **contract** (`contracts/payment-compliance.json`)
and the **auditor** (`scripts/payment-compliance-check.mjs`). The audit
workflow below ties them to the live platform policies and to regional
data-protection law.

## Workflow (run in order, do not skip fetches)

### 1. Detect — which gateways does THIS build actually wire?
- `npm run compliance:check` prints the detected set (it greps
  `lib/payments/index.ts` and honors `PAYMENT_PROVIDER` / `.env.local`).
- Generated projects wire ONLY the selected adapter; never audit against a
  gateway the buyer did not pick.

### 2. Fetch — read the platform's CURRENT rules, live
The checker ends with a `POLICY REVIEW QUEUE`: for each selected gateway it
lists `policySources` URLs from the contract (docs entry, AUP / restricted-
business page, seller/MoR terms). For each URL:
1. Fetch it with a web tool (or ask the operator to paste the current text —
   no memory, no training-data recitation).
2. Diff against the contract's `obligations[]` for that gateway.
3. **Live text wins.** Update `contracts/payment-compliance.json` in the same
   PR and note the source URL + date in the PR description.

### 3. Check — local wiring against the contract
The same run enforces (FAIL = block, WARN = fix before launch):
1. Single webhook route, signature verified on the RAW body before any logic.
2. Selected gateways' required env vars documented in `.env.example`.
3. `--url=https://staging-or-prod`: `/terms` and `/privacy` return 200 — a
   checkout landing on a 404 legal page fails store review everywhere.
4. Gateway specifics: Waffo RSA `${t}.${rawBody}` + per-env key +
   `subscription.payment_succeeded` must NOT provision; Stripe restricted keys
   + real recurring Prices; PayPal has no portal — the in-app cancel route
   must exist; Creem/Lemon Squeezy MoR + event names per contract.

### 4. Data protection — GDPR / UK GDPR / CCPA / LGPD / PDPA / DPDP
The checker prints the `dataProtection` checklist split in TWO tiers - read
the prefix, it matters:
- **`in your build:`** controls this project actually ships: the cookie
  consent component, the absence of any ad tracker (CCPA "Do Not Sell/Share"
  honored by construction), `/terms` + `/privacy` pages (placeholders -
  replace the copy, they are not finished legal text), and
  `docs/dpa-template.md`, a fill-in DPA you sign per processor before B2B
  selling.
- **`your todo:`** capabilities that stay OPERATOR-side and are pruned from
  generated projects - do not claim them in an audit. Access/erasure
  endpoints, the retention cron, and consent/breach evidence: implement
  equivalents (or document who handles requests and by when) before serving
  EU/California buyers. The reference implementations exist in make1day's own
  deployment; this build starts without them on purpose.
- Regional extras ride on top: LGPD/PDPA/DPDP reuse the GDPR-shaped controls;
  DPDP adds verifiable consent for minors - AI/video features must not
  target minors. Check the official source URL the checklist prints.

### 5. Improve + re-verify
Turn findings into patches in this order: FAIL (webhook/legal 404/double
grant) → contract drift → WARN (env docs, unscheduled cron) → region extras.
After the last change re-run: `npm run compliance:check --url=…` must exit
`0`, then the payments verify loop (test payment → exactly one license key →
replay still one key).

## Deploy gate (this is what "before deploy triggers it" means)
Any first deploy / release PR must contain the audit run:

```bash
npm run compliance:check --url="https://<staging-or-production>"   # exit 0 required
```

Wire it as CI: run AFTER build, gate the publish step on its exit code
(documented in the deploy skill). Skipping the gate with WARNs open is the
operator's written decision, not silence.

## Honesty rules
- This skill automates engineering support. It is NOT legal advice; the
  operator owns lawful basis, registrations and processor agreements.
- Never invent a platform policy. No fetch access → block the audit and ask
  for the current text instead of guessing.
- Every `compliance:check` claim must point at a file in this repo.
