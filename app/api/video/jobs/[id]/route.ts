import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/subscriptions";
import { isDemoMode, DEMO_COOKIE, DEMO_USER } from "@/lib/demo";
import { getJob, updateJob } from "@/lib/video/store";
import {
  videoConfigured,
  pollFaceSwap,
  fetchFaceSwapResult,
} from "@/lib/video/fal";
import { refundCredits } from "@/lib/video/quota";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// GET /api/video/jobs/[id] — owner-only job status. While a job is still
// queued/running and the provider is reachable, this lazily syncs its state
// (the signed webhook is the primary channel; polling is the fallback).
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const demoCookie = (await cookies()).get(DEMO_COOKIE)?.value;
  const demo = isDemoMode() && demoCookie;
  let userId: string;
  if (!demo) {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
  } else {
    userId = DEMO_USER.id;
  }

  const job = await getJob(id);
  if (!job || job.user_id !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    (job.status === "queued" || job.status === "running") &&
    videoConfigured() &&
    job.status_url
  ) {
    try {
      const st = await pollFaceSwap(job.status_url);
      if (st.status === "COMPLETED" && job.response_url) {
        const result = await fetchFaceSwapResult(job.response_url);
        await updateJob(job.id, {
          status: result.videoUrl ? "done" : "failed",
          output_url: result.videoUrl,
          error: result.videoUrl ? null : "provider returned no video",
        });
      } else if (st.status === "IN_PROGRESS" && job.status === "queued") {
        await updateJob(job.id, { status: "running" });
      } else if (st.status === "FAILED" || st.status === "ERROR") {
        await updateJob(job.id, { status: "failed", error: "provider failed" });
        await refundCredits(job.user_id, job.credits);
      }
    } catch (err) {
      logger.debug("video lazy sync skipped", { err: String(err) });
    }
  }

  return NextResponse.json({ job: await getJob(id) });
}
