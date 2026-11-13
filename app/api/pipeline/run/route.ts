import { guardApiWrite } from "@/lib/http-guard";
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { currentOperator } from "@/lib/admin-session";
import { createRun } from "@/lib/workflows";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * POST /api/pipeline/run { brief, scenes? }
 *
 * Creates a workflow run row (visible on /admin/workflows and in the
 * canvas) and sends the start event to Inngest. Admin/operator guarded -
 * every render step spends the operator's fal budget, so this is not a
 * public endpoint.
 * Without INNGEST_EVENT_KEY configured the run is recorded and the send
 * fails with a clear 503 - a half-wired deployment never silently drops
 * a pipeline.
 */
const schema = z.object({
  brief: z.string().min(8).max(4000),
  scenes: z.number().int().min(1).max(12).optional(),
});

export async function POST(req: Request) {
  const blocked = await guardApiWrite(req, { bucket: "pipeline-run", limit: 10, windowMs: 3600000 });
  if (blocked) return blocked;

  if (!(await currentOperator())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid pipeline request", details: parsed.error.flatten() }, { status: 400 });
  }

  const runId = randomUUID();
  const scenes = parsed.data.scenes ?? 4;
  await createRun(runId, "ad-video-pipeline", { brief: parsed.data.brief, scenes });

  const eventKey = process.env.INNGEST_EVENT_KEY?.trim();
  if (!eventKey) {
    return NextResponse.json(
      {
        error: "inngest_not_configured",
        message:
          "Run recorded, but INNGEST_EVENT_KEY is not set. Start the dev server (npm run inngest:dev) or add your Inngest keys, then POST again.",
        runId,
      },
      { status: 503 },
    );
  }

  try {
    const { inngest } = await import("@/inngest/client");
    await inngest.send({
      name: "pipeline/ad-video/start",
      data: { runId, brief: parsed.data.brief, scenes },
    });
  } catch (err) {
    logger.error("pipeline send failed", { err: String(err) });
    return NextResponse.json({ error: "Inngest send failed", runId }, { status: 502 });
  }

  return NextResponse.json({ runId, status: "queued" }, { status: 202 });
}
