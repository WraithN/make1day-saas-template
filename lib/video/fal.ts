// fal.ai queue adapter for the video studio (face-swap) module.
//
// The customer supplies FAL_KEY; without it the studio renders a configuration
// notice instead of failing at runtime (same lazy pattern as the AI providers).
// Only consent-attested, provider-allowed face-swap endpoints may be used —
// see ai/rules/video.md and docs/video-product.md §2 (guardrails).

import { createHmac, timingSafeEqual } from "node:crypto";

export function falKey(): string {
  return process.env.FAL_KEY?.trim() ?? "";
}

export function videoWebhookSecret(): string {
  return process.env.VIDEO_WEBHOOK_SECRET?.trim() ?? "";
}

export function videoConfigured(): boolean {
  return falKey() !== "";
}

/** Overridable model id; the default is fal's consent-gated video face-swap. */
export function faceSwapModel(): string {
  return process.env.VIDEO_FAL_MODEL?.trim() || "fal-ai/face-swap/video";
}

export interface FalQueueHandles {
  request_id: string;
  status_url: string;
  response_url: string;
}

export async function submitFaceSwap(input: {
  videoUrl: string;
  imageUrl: string;
}): Promise<FalQueueHandles> {
  const res = await fetch(`https://queue.fal.run/${faceSwapModel()}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video_url: input.videoUrl,
      image_url: input.imageUrl,
    }),
  });
  if (!res.ok) throw new Error(`fal submit failed: HTTP ${res.status}`);
  return (await res.json()) as FalQueueHandles;
}

export async function pollFaceSwap(
  statusUrl: string,
): Promise<{ status: string }> {
  const res = await fetch(statusUrl, {
    headers: { Authorization: `Key ${falKey()}` },
  });
  if (!res.ok) throw new Error(`fal status failed: HTTP ${res.status}`);
  return (await res.json()) as { status: string };
}

export async function fetchFaceSwapResult(
  responseUrl: string,
): Promise<{ videoUrl: string | null }> {
  const res = await fetch(responseUrl, {
    headers: { Authorization: `Key ${falKey()}` },
  });
  if (!res.ok) throw new Error(`fal result failed: HTTP ${res.status}`);
  const j = (await res.json()) as { video?: { url?: string } };
  return { videoUrl: j.video?.url ?? null };
}

/**
 * HMAC-SHA256(hex) over the raw body — the same verification discipline as the
 * payment webhooks (AGENTS.md rule 4). Never trust an unsigned event.
 */
export function verifyVideoWebhook(
  rawBody: string,
  signature: string | null,
): boolean {
  const secret = videoWebhookSecret();
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
