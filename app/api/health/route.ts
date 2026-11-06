import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// Lightweight liveness/readiness probe. Returns 200 with build metadata so
// uptime monitors and orchestrators can health-check the deployment. It does
// NOT touch the database (keep it cheap) — use /api/stats for deeper status.
export const dynamic = "force-dynamic";

export async function GET() {
  logger.debug("health probe");
  return NextResponse.json({
    ok: true,
    service: "shipkit",
    version: process.env.npm_package_version ?? "0.0.0",
    region: process.env.VERCEL_REGION ?? process.env.DEPLOYMENT_ID ?? "local",
    time: new Date().toISOString(),
  });
}
