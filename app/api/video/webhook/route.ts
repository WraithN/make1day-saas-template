import { NextResponse } from "next/server";
import { verifyVideoWebhook } from "@/lib/video/fal";
import { getJob, updateJob } from "@/lib/video/store";
import { refundCredits } from "@/lib/video/quota";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// POST /api/video/webhook — fal.ai queue webhook, verified with the official
// @fal-ai/client authenticity check (Ed25519 JWT against fal's published
// keys). Unsigned or foreign payloads are rejected before any job mutation -
// the same fail-closed discipline as the payment webhooks (AGENTS rule 4).
export async function POST(req: Request) {
  const raw = await req.text();
  const ok = await verifyVideoWebhook(raw, {
    requestId: req.headers.get("x-fal-webhook-request-id"),
    userId: req.headers.get("x-fal-webhook-user-id"),
    timestamp: req.headers.get("x-fal-webhook-timestamp"),
    signatureHex: req.headers.get("x-fal-webhook-signature"),
  });
  if (!ok) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: {
    request_id?: string;
    status?: string;
    response_url?: string;
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!payload.request_id) {
    return NextResponse.json({ error: "missing request_id" }, { status: 400 });
  }

  // Locate the job by provider id (the store is dual-backend; a direct lookup
  // keeps the webhook idempotent per provider event).
  const job = await findByProviderId(payload.request_id);
  if (!job) {
    // Unknown job: ack so the provider stops retrying.
    return NextResponse.json({ ok: true, matched: false });
  }

  const status = (payload.status ?? "").toUpperCase();
  if (status === "COMPLETED") {
    let outputUrl: string | null = job.output_url;
    if (!outputUrl && job.response_url) {
      const { fetchFaceSwapResult } = await import("@/lib/video/fal");
      outputUrl = (await fetchFaceSwapResult(job.response_url).catch(() => ({ videoUrl: null }))).videoUrl;
    }
    await updateJob(job.id, {
      status: outputUrl ? "done" : "failed",
      output_url: outputUrl,
      error: outputUrl ? null : "provider returned no video",
    });
  } else if (status === "IN_PROGRESS") {
    await updateJob(job.id, { status: "running" });
  } else if (status === "FAILED" || status === "ERROR") {
    await updateJob(job.id, { status: "failed", error: "provider failed" });
    await refundCredits(job.user_id, job.credits);
  }
  logger.info("video webhook processed", {
    jobId: job.id,
    status: payload.status,
  });
  return NextResponse.json({ ok: true, matched: true });
}

// Small helper kept local: webhook volume is low, so a targeted lookup by
// provider id keeps this endpoint idempotent per provider event.
async function findByProviderId(providerJobId: string) {
  const { findJobByProviderId } = await import("@/lib/video/store");
  return findJobByProviderId(providerJobId);
}
