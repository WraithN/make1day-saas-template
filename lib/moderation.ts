// Content moderation gate for every prompt-based generation endpoint.
//
// The gateway's OFFICIAL moderation API is used when it offers one:
//  - Waffo Pancake: Prompt Sift — POST /v1/actions/verification/scan-prompt
//    (RSA-signed, {prompt} -> {data.action: allow|block|pending}), auto-used
//    when PAYMENT_PROVIDER=waffo + merchant signing credentials exist.
//  - Creem: Moderation API — POST /v1/moderation/prompt (docs.creem.io).
// "deny" AND "flag" block; an unknown action holds the gate shut (flag);
// transport failures FAIL CLOSED (503, never generate).
//
// Gateways with no official moderation endpoint (Stripe, PayPal, Lemon
// Squeezy, Paddle) — and deployments without credentials — fall back to the
// local prohibited-content blocklist below, so the Acceptable Use Policy is
// enforced in code on every stack; the matrix is published in /acceptable-use.

import { createHash, sign as rsaSign } from "node:crypto";

export type ModerationDecision = "allow" | "flag" | "deny";

export interface ScreenResult {
  decision: ModerationDecision;
  source: "waffo" | "creem" | "local";
  units?: number;
  id?: string;
}

const TIMEOUT_MS = 5000;

/** Local fallback blocklist (used only when no official API is configured). */
const LOCAL_DENY = [
  /\b(csam|child sexual|underage sex|minor(s)? porn|loli(con)?\b)/i,
  /\b(nude|naked|nsfw|porn|xxx|sexual content|erotica)\b/i,
  /\b(deepfake porn|non-?consensual (image|video|sexual)|revenge porn)\b/i,
  /\b(behead|gore|snuff|torture video)\b/i,
  /\b(bomb recipe|synthesize (a )?weapon|bioweapon)\b/i,
  /\b(impersonate|identity theft|forge(d)? (id|passport))\b/i,
];

export function moderationConfigured(): boolean {
  return waffoSiftEnabled() || Boolean(moderationKey());
}

/** True when the primary gateway is Waffo Pancake and its signing
 *  credentials exist — Prompt Sift then becomes the moderation channel. */
export function waffoSiftEnabled(): boolean {
  const provider = (process.env.PAYMENT_PROVIDER ?? "").split(",")[0].trim();
  const flavor = (process.env.WAFFO_FLAVOR ?? "pancake").toLowerCase();
  return (
    provider === "waffo" &&
    flavor === "pancake" &&
    !!(
      process.env.WAFFO_MERCHANT_ID?.trim() &&
      process.env.WAFFO_PRIVATE_KEY?.trim()
    )
  );
}

function waffoPrivateKeyPem(): string {
  const raw = (process.env.WAFFO_PRIVATE_KEY ?? "").replace(/\\n/g, "\n").trim();
  if (raw.includes("-----BEGIN")) return raw;
  const body = raw.replace(/\s+/g, "");
  const lines = body.match(/.{1,64}/g)?.join("\n") ?? body;
  return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----\n`;
}

async function waffoScreen(text: string): Promise<ScreenResult> {
  const base = process.env.WAFFO_API_BASE?.trim() || "https://api.waffo.ai";
  const path =
    process.env.WAFFO_SCAN_PATH?.trim() ||
    "/v1/actions/verification/scan-prompt";
  const bodyStr = JSON.stringify({ prompt: text });
  const ts = Math.floor(Date.now() / 1000).toString();
  const bodyHash = createHash("sha256").update(bodyStr).digest("base64");
  const canonical = `POST\n${path}\n${ts}\n${bodyHash}`;
  const signature = rsaSign(
    "sha256",
    Buffer.from(canonical),
    waffoPrivateKeyPem(),
  ).toString("base64");
  const res = await fetch(base + path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Merchant-Id": (process.env.WAFFO_MERCHANT_ID ?? "").trim(),
      "X-Timestamp": ts,
      "X-Signature": signature,
    },
    body: bodyStr,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`waffo_sift_http_${res.status}`);
  const json = (await res.json()) as {
    data?: { action?: string; requestId?: string };
  };
  const action = (json?.data?.action ?? "").toLowerCase();
  const id = json?.data?.requestId;
  if (action === "allow") return { decision: "allow", source: "waffo", id };
  if (action === "block") return { decision: "deny", source: "waffo", id };
  // pending-review or anything unknown: never let an unjudged prompt through.
  return { decision: "flag", source: "waffo", id };
}

/**
 * Moderation-specific key override: during Creem account review the merchant
 * may already see a LIVE key while checkout must stay in test mode. Setting
 * CREEM_MODERATION_API_KEY routes moderation to production without touching
 * payments. Falls back to CREEM_API_KEY.
 */
function moderationKey(): string {
  return (
    process.env.CREEM_MODERATION_API_KEY?.trim() ||
    process.env.CREEM_API_KEY?.trim() ||
    ""
  );
}

// Environment follows the KEY PREFIX (creem_test_* = sandbox, creem_* = live),
// not CREEM_ENV, so a moderation-only live key cannot be mis-routed by the
// payments environment setting.
function creemBase(): string {
  const key = moderationKey();
  const isTest = key.startsWith("creem_test_");
  return isTest ? "https://test-api.creem.io" : "https://api.creem.io";
}

/**
 * Screen one user-controlled string. Throws only when the Creem call itself
 * fails (caller must fail closed). Never throws for the local fallback.
 */
export async function screenPrompt(
  text: string,
  externalId: string,
): Promise<ScreenResult> {
  const clean = (text ?? "").trim();
  if (!clean) return { decision: "allow", source: "local" };

  // Waffo Pancake deployments screen through the gateway's own Prompt Sift.
  if (waffoSiftEnabled()) return await waffoScreen(clean);

  const key = moderationKey();
  if (!key) {
    return {
      decision: LOCAL_DENY.some((re) => re.test(clean)) ? "deny" : "allow",
      source: "local",
    };
  }

  const res = await fetch(`${creemBase()}/v1/moderation/prompt`, {
    method: "POST",
    headers: { "x-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ prompt: clean, external_id: externalId }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`moderation_http_${res.status}`);
  const json = (await res.json()) as {
    id?: string;
    decision?: ModerationDecision;
    usage?: { units?: number };
  };
  const decision = json.decision;
  if (decision !== "allow" && decision !== "flag" && decision !== "deny") {
    throw new Error("moderation_bad_decision");
  }
  return { decision, source: "creem", units: json.usage?.units, id: json.id };
}

/** True when generation must be blocked for this screen result. */
export function blocked(r: ScreenResult): boolean {
  return r.decision === "deny" || r.decision === "flag";
}
