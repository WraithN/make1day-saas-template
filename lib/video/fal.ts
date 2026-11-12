// fal.ai integration via the official @fal-ai/client SDK (queue submit /
// status / result). Webhook authenticity uses fal's published reference
// algorithm (Ed25519 over JWKS keys - fal ships no npm package for it, so
// this is the documented Node implementation, ported):
// https://fal.ai/docs/documentation/model-apis/inference/webhooks
//
// The customer supplies FAL_KEY; without it the studio renders a
// configuration notice instead of failing at runtime. Only consent-attested,
// provider-allowed face-swap endpoints may be used — see ai/rules/video.md
// and docs/video-product.md §2 (guardrails).

import { fal } from "@fal-ai/client";
import { createHash, createPublicKey, verify as cryptoVerify } from "node:crypto";

export function falKey(): string {
  return process.env.FAL_KEY?.trim() ?? "";
}

export function videoConfigured(): boolean {
  return falKey() !== "";
}

/** Overridable model id; the default is fal's consent-gated video face-swap. */
export function faceSwapModel(): string {
  return process.env.VIDEO_FAL_MODEL?.trim() || "fal-ai/face-swap/video";
}

// The SDK is a singleton configured from env; reconfigure only when the key
// changes (tests / credential rotation without a restart).
let configuredKey = "";
function client(): typeof fal {
  const key = falKey();
  if (!key) throw new Error("FAL_KEY is not configured - the video studio cannot run.");
  if (configuredKey !== key) {
    fal.config({ credentials: key });
    configuredKey = key;
  }
  return fal;
}

export interface FalQueueHandles {
  request_id: string;
  status_url: string;
  response_url: string;
}

export async function submitFaceSwap(input: {
  videoUrl: string;
  imageUrl: string;
  aspect: string;
  resolution: string;
}): Promise<FalQueueHandles> {
  const res = await client().queue.submit(faceSwapModel(), {
    input: {
      video_url: input.videoUrl,
      image_url: input.imageUrl,
      aspect_ratio: input.aspect,
      resolution: input.resolution,
    },
  });
  // Persist the same handle triple the studio history rows already store, so
  // polling and webhooks keep working against existing jobs.
  return {
    request_id: res.request_id,
    status_url: res.status_url ?? `https://queue.fal.run/${faceSwapModel()}/requests/${res.request_id}/status`,
    response_url: res.response_url ?? `https://queue.fal.run/${faceSwapModel()}/requests/${res.request_id}`,
  };
}

/** Parse queue URLs back into (appId, requestId) for SDK calls. */
function parseQueueUrl(url: string): { app: string; requestId: string } {
  const { pathname } = new URL(url);
  const segs = pathname.split("/").filter(Boolean);
  const at = segs.indexOf("requests");
  if (at < 1 || !segs[at + 1]) throw new Error(`Unrecognized fal queue URL: ${url}`);
  return { app: segs.slice(0, at).join("/"), requestId: segs[at + 1] };
}

export async function pollFaceSwap(
  statusUrl: string,
): Promise<{ status: string }> {
  const { app, requestId } = parseQueueUrl(statusUrl);
  const status = await client().queue.status(app, { requestId });
  return { status: status.status };
}

export async function fetchFaceSwapResult(
  responseUrl: string,
): Promise<{ videoUrl: string | null }> {
  const { app, requestId } = parseQueueUrl(responseUrl);
  const res = await client().queue.result(app, { requestId });
  const data = res.data as { video?: { url?: string } } | undefined;
  return { videoUrl: data?.video?.url ?? null };
}

const JWKS_URL = "https://rest.fal.ai/.well-known/jwks.json";
const JWKS_TTL_MS = 24 * 60 * 60 * 1000; // fal permits 24h caching
let jwksCache: { keys: ReturnType<typeof createPublicKey>[]; at: number } = { keys: [], at: 0 };

async function falPublicKeys(): Promise<ReturnType<typeof createPublicKey>[]> {
  if (!jwksCache.keys.length || Date.now() - jwksCache.at > JWKS_TTL_MS) {
    const res = await fetch(JWKS_URL, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
    const json = (await res.json()) as { keys?: { x?: string }[] };
    jwksCache = {
      keys: (json.keys || [])
        .filter((k) => typeof k.x === "string")
        .map((k) => createPublicKey({ key: { crv: "Ed25519", kty: "OKP", x: k.x }, format: "jwk" })),
      at: Date.now(),
    };
  }
  return jwksCache.keys;
}

/**
 * fal's documented webhook signature scheme: Ed25519 over
 * `requestId\nuserId\ntimestamp\nsha256(body)` with a 5-minute freshness
 * window, verified against fal's published JWKS keys. Unsigned, stale or
 * foreign deliveries are rejected - same fail-closed discipline as payment
 * webhooks (AGENTS.md rule 4).
 */
export async function verifyVideoWebhook(
  rawBody: string,
  headers: {
    requestId: string | null;
    userId: string | null;
    timestamp: string | null;
    signatureHex: string | null;
  },
): Promise<boolean> {
  const { requestId, userId, timestamp, signatureHex } = headers;
  if (!requestId || !userId || !timestamp || !signatureHex) return false;
  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > 300) return false;
  try {
    const bodyHash = createHash("sha256").update(rawBody).digest("hex");
    const message = Buffer.from([requestId, userId, timestamp, bodyHash].join("\n"), "utf8");
    const signature = Buffer.from(signatureHex, "hex");
    const keys = await falPublicKeys();
    return keys.some((key) => {
      try {
        return cryptoVerify(null, message, key, signature);
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}
