#!/usr/bin/env node
// Webhook signature-contract probe for the payment gateways.
//
// Why this exists: all six gateways share ONE route (POST /api/webhook) and
// ONE business pipeline, so the part that actually differs per gateway is the
// signature verification + event normalisation. A forged request must never
// be acknowledged with 200. This script replays four cases against a running
// site without needing any gateway account:
//
//   1. missing signature        -> 400
//   2. invalid signature        -> 400
//   3. valid signature, bad JSON-> 400
//   4. valid signature, no event-> 200 (ignored)
//   5. (--grant) a minimal paid event -> 200, plus a DB check hint
//
// Usage (the site must be running with the matching PAYMENT_PROVIDER):
//   STRIPE_WEBHOOK_SECRET=whsec_xxx \
//     node scripts/payment-webhook-probe.mjs --provider stripe
//
//   node scripts/payment-webhook-probe.mjs --provider stripe --grant \
//     --base http://localhost:3000
//
//   --provider  stripe | creem | lemonsqueezy | waffo-pancake |
//               waffo-acquiring | paypal | all
//   --base      site origin (default http://localhost:3000)
//   --grant     also send a minimal paid event (Stripe / Waffo only)
//
// Secrets are read from the SAME env vars the app uses:
//   STRIPE_WEBHOOK_SECRET, CREEM_WEBHOOK_SECRET,
//   LEMONSQUEEZY_WEBHOOK_SECRET, WAFFO_PROBE_PRIVATE_KEY (PEM; only needed
//   for the two Waffo flavours; the server must hold the matching public key).
//
// PayPal cannot be probed offline: its provider calls PayPal's own
// /v1/notifications/verify-webhook-signature endpoint. Use the PayPal
// developer dashboard's "Webhook events" test sender instead — see
// docs/payment-testing.md.

import { createHmac, createSign } from "node:crypto";

const argv = process.argv.slice(2);
function arg(name, fallback) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--")
    ? argv[i + 1]
    : fallback;
}
const BASE = (arg("base", process.env.PROBE_BASE || "http://localhost:3000")).replace(/\/$/, "");
const GRANT = argv.includes("--grant");
const ALL = ["stripe", "creem", "lemonsqueezy", "waffo-pancake", "waffo-acquiring"];
const requested = (arg("provider", process.env.PROBE_PROVIDER || "stripe")).split(",");
const providers = requested.includes("all") ? ALL : requested;

const hmac = (secret, raw) => createHmac("sha256", secret).update(raw).digest("hex");
function rsa(privateKey, raw) {
  return createSign("RSA-SHA256").update(raw).sign(privateKey, "base64");
}

const DEFS = {
  stripe: {
    secret: () => process.env.STRIPE_WEBHOOK_SECRET,
    headers(raw, secret) {
      const t = Math.floor(Date.now() / 1000);
      return { "stripe-signature": `t=${t},v1=${hmac(secret, `${t}.${raw}`)}` };
    },
    grantEvent() {
      const id = `evt_probe_${Date.now()}`;
      return JSON.stringify({
        id,
        object: "event",
        type: "checkout.session.completed",
        data: {
          object: {
            id: `cs_probe_${Date.now()}`,
            object: "checkout.session",
            mode: "payment",
            payment_status: "paid",
            customer_details: { email: "probe@example.com" },
            customer_email: "probe@example.com",
            payment_intent: `pi_probe_${Date.now()}`,
            amount_total: 9900,
            currency: "usd",
          },
        },
      });
    },
  },
  creem: {
    secret: () => process.env.CREEM_WEBHOOK_SECRET,
    headers: (raw, secret) => ({ "creem-signature": hmac(secret, raw) }),
  },
  lemonsqueezy: {
    secret: () => process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
    headers: (raw, secret) => ({ "x-signature": hmac(secret, raw) }),
  },
  "waffo-pancake": {
    secret: () => process.env.WAFFO_PROBE_PRIVATE_KEY,
    headers(raw, key) {
      const t = String(Date.now());
      return { "x-waffo-signature": `t=${t},v1=${rsa(key, `${t}.${raw}`)}` };
    },
    grantEvent() {
      const ts = Date.now();
      return JSON.stringify({
        eventType: "order.completed",
        eventId: `probe_${ts}`,
        mode: "test",
        data: {
          orderId: `order_probe_${ts}`,
          paymentId: `pay_probe_${ts}`,
          buyerEmail: "probe@example.com",
          amount: 9900,
          currency: "USD",
        },
      });
    },
  },
  "waffo-acquiring": {
    secret: () => process.env.WAFFO_PROBE_PRIVATE_KEY,
    headers: (raw, key) => ({ "x-signature": rsa(key, raw) }),
    grantEvent() {
      const ts = Date.now();
      return JSON.stringify({
        eventType: "PAYMENT_NOTIFICATION",
        notifyId: `probe_${ts}`,
        result: {
          acquiringOrderId: `acq_probe_${ts}`,
          orderStatus: "PAY_SUCCESS",
          buyerEmail: "probe@example.com",
          amount: 9900,
          currency: "USD",
          metadata: { plan: "buyout" },
        },
      });
    },
  },
};

function corrupt(headers) {
  const out = { ...headers };
  for (const k of Object.keys(out)) {
    const v = out[k];
    // Flip the first character to a different one. Always replacing it with
    // "0" would be a no-op when the digest already starts with 0 -> a false
    // "invalid signature passed" failure.
    out[k] = (v[0] === "0" ? "1" : "0") + v.slice(1);
  }
  return out;
}

async function post(body, headers) {
  const res = await fetch(`${BASE}/api/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON reply */ }
  return { status: res.status, json };
}

let failures = 0;
function record(name, got, expected, detail = "") {
  const ok = got === expected;
  if (!ok) failures++;
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${name.padEnd(26)} ${String(got).padEnd(4)} (want ${expected}) ${detail}`,
  );
}

for (const name of providers) {
  console.log(`\n=== ${name} ===`);
  if (name === "paypal") {
    console.log("  SKIP  PayPal verifies signatures by calling PayPal's own API.");
    console.log("         Use the developer dashboard Webhook events test sender.");
    continue;
  }
  const def = DEFS[name];
  if (!def) {
    console.log(`  SKIP  unknown provider "${name}"`);
    failures++;
    continue;
  }
  const secret = def.secret();
  if (!secret) {
    console.log("  SKIP  no signing secret in env (see file header)");
    continue;
  }

  const ignoredBody = "{}";
  const badJson = '{"broken":';
  const okHeaders = def.headers(ignoredBody, secret);

  const missing = await post(ignoredBody, {});
  record("missing signature", missing.status, 400);

  const invalid = await post(ignoredBody, corrupt(okHeaders));
  record("invalid signature", invalid.status, 400);

  // Sign the malformed body correctly: verification passes, parsing must fail.
  const badJsonSigned = def.headers(badJson, secret);
  const malformed = await post(badJson, badJsonSigned);
  record("valid sig / bad JSON", malformed.status, 400);

  const ignored = await post(ignoredBody, okHeaders);
  record("valid sig / no event", ignored.status, 200,
    ignored.json?.ignored ? "(ignored)" : JSON.stringify(ignored.json ?? {}));

  if (GRANT && def.grantEvent) {
    const body = def.grantEvent();
    const granted = await post(body, def.headers(body, secret));
    record("paid event -> license", granted.status, 200,
      "check licenses table for probe@example.com");
    // Replay the same event id: idempotency must not issue a second key.
    const replay = await post(body, def.headers(body, secret));
    record("replay (idempotent)", replay.status, 200);
  }
}

console.log(
  `\n${failures ? `${failures} FAILED` : "All checks passed"}. ` +
    "These are signature-layer checks only; run one real sandbox checkout per " +
    "gateway before launch (docs/payment-testing.md).",
);
if (failures) process.exitCode = 1;
