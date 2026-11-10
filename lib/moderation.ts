// Content moderation gate for every prompt-based generation endpoint.
//
// Creem's Moderation API is MANDATORY for AI image/video merchants: every
// user-supplied string that reaches a generation model must be screened
// first (POST /v1/moderation/prompt). `deny` AND `flag` block; transport
// failures FAIL CLOSED (503, never generate). See docs.creem.io/features/moderation.
//
// Deployments without a CREEM_API_KEY (customers on other gateways) fall back
// to a local prohibited-content blocklist so the Acceptable Use Policy is
// still enforced in code; the fallback is documented in /acceptable-use.

export type ModerationDecision = "allow" | "flag" | "deny";

export interface ScreenResult {
  decision: ModerationDecision;
  source: "creem" | "local";
  units?: number;
  id?: string;
}

const TIMEOUT_MS = 5000;

/** Local fallback blocklist (used only when no CREEM_API_KEY is configured). */
const LOCAL_DENY = [
  /\b(csam|child sexual|underage sex|minor(s)? porn|loli(con)?\b)/i,
  /\b(nude|naked|nsfw|porn|xxx|sexual content|erotica)\b/i,
  /\b(deepfake porn|non-?consensual (image|video|sexual)|revenge porn)\b/i,
  /\b(behead|gore|snuff|torture video)\b/i,
  /\b(bomb recipe|synthesize (a )?weapon|bioweapon)\b/i,
  /\b(impersonate|identity theft|forge(d)? (id|passport))\b/i,
];

export function moderationConfigured(): boolean {
  return Boolean(moderationKey());
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
