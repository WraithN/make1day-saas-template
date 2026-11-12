import { guardApiWrite } from "@/lib/http-guard";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { env } from "@/lib/env";
import {
  getCurrentUser,
  getCurrentSubscription,
} from "@/lib/subscriptions";
import { isDemoMode, DEMO_COOKIE, DEMO_USER } from "@/lib/demo";
import { logger } from "@/lib/logger";
import {
  videoConfigured,
  submitFaceSwap,
} from "@/lib/video/fal";
import { consumeCredits, costOf, CREDITS_PER_MONTH, refundCredits } from "@/lib/video/quota";
import { insertJob, listJobs } from "@/lib/video/store";
import { getVideoTemplate, templateSourceUrl } from "@/lib/content/video-templates";
import { screenPrompt, blocked as isBlocked } from "@/lib/moderation";

export const runtime = "nodejs";

// POST /api/video/jobs — create a consent-gated face-swap job.
// Subscription-only by product decision: an active **Care** plan is required
// (one-time Buyout does not include video credits).
export async function POST(req: Request) {
  // make1day's own store operates no hosted generation entry point: with
  // SHOW_VIDEO_STUDIO=false the entire feature surface — pages AND API —
  // 404s. Customer builds ship this route with the flag unset (= enabled).
  if (!env.showVideoStudio()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const blocked = await guardApiWrite(req, {
    bucket: "video",
    limit: 20,
    windowMs: 3600000,
  });
  if (blocked) return blocked;

  const demoCookie = (await cookies()).get(DEMO_COOKIE)?.value;
  const demo = isDemoMode() && demoCookie;

  let userId: string | null = null;
  if (!demo) {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const sub = await getCurrentSubscription();
    if (!sub || sub.plan !== "care" || sub.status !== "active") {
      return NextResponse.json(
        {
          error:
            "The video studio is a subscription feature: an active Care plan is required.",
        },
        { status: 402 },
      );
    }
    userId = user.id;
  } else {
    userId = DEMO_USER.id;
  }

  const body = await req.json().catch(() => ({}));
  const parsed = z
    .object({
      templateId: z.string().min(1).max(60),
      imageUrl: z.string().min(1).max(2048),
      resolution: z.enum(["480p", "720p", "1080p"]).default("480p"),
      aspect: z.enum(["9:16", "16:9", "1:1"]).default("9:16"),
      // The UI only enables submit after the user ticks the portrait-rights
      // attestation; the server records the timestamp as the audit trail.
      consent: z.literal(true),
    })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { templateId, imageUrl, resolution, aspect } = parsed.data;

  // Creem Moderation API (mandatory for AI video merchants): Video Studio
  // takes no free-text prompt, so the only user-controlled string routed into
  // the generation pipeline is the hosted input URL — screen it before any
  // credit, queue or provider call. deny/flag block; failures fail closed.
  try {
    const screen = await screenPrompt(imageUrl, `videojob:${templateId}`);
    if (isBlocked(screen)) {
      return NextResponse.json(
        {
          error:
            screen.decision === "deny" ? "prompt_rejected" : "prompt_flagged",
          message:
            "This input violates our Acceptable Use Policy (/acceptable-use).",
        },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "moderation_unavailable" },
      { status: 503 },
    );
  }

  const template = getVideoTemplate(templateId);
  if (!template) {
    return NextResponse.json({ error: "Unknown template" }, { status: 404 });
  }
  const sourceUrl = templateSourceUrl(template);
  if (!sourceUrl) {
    return NextResponse.json(
      {
        error:
          "This template has no hosted source clip configured (VIDEO_TEMPLATE_<ID>_URL).",
      },
      { status: 409 },
    );
  }
  if (!videoConfigured()) {
    return NextResponse.json(
      { error: "Video provider is not configured (FAL_KEY missing)." },
      { status: 503 },
    );
  }

  const cost = costOf(resolution);
  const quota = await consumeCredits(userId, cost);
  if (!quota.ok) {
    return NextResponse.json(
      {
        error: `Monthly video credits exhausted (${quota.used}/${quota.limit}). Resets on the 1st.`,
        resetAt: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1)).toISOString(),
      },
      { status: 429 },
    );
  }

  try {
    const handles = await submitFaceSwap({ videoUrl: sourceUrl, imageUrl, aspect, resolution });
    const job = await insertJob({
      id: "",
      user_id: userId,
      template_id: templateId,
      resolution,
      aspect,
      status: "queued",
      provider_job_id: handles.request_id,
      status_url: handles.status_url,
      response_url: handles.response_url,
      input_image_url: imageUrl,
      source_video_url: sourceUrl,
      output_url: null,
      credits: cost,
      consent_at: new Date().toISOString(),
      error: null,
    });
    return NextResponse.json({ jobId: job.id, credits: quota }, { status: 202 });
  } catch (err) {
    // Credits were reserved above; give them back so a provider outage never
    // eats a subscriber's monthly budget.
    await refundCredits(userId, cost);
    logger.error("video job submit failed", { err: String(err) });
    return NextResponse.json(
      { error: "Provider rejected the job; credits were refunded." },
      { status: 502 },
    );
  }
}

// GET /api/video/jobs — the caller's own job list (studio history).
export async function GET(req: Request) {
  const demoCookie = (await cookies()).get(DEMO_COOKIE)?.value;
  const demo = isDemoMode() && demoCookie;
  let userId: string | null = null;
  if (!demo) {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
  } else {
    userId = DEMO_USER.id;
  }
  const jobs = await listJobs(userId);
  return NextResponse.json({
    jobs,
    limit: CREDITS_PER_MONTH,
    configured: videoConfigured(),
  });
}
