import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { isLicenseGateEnabled, operatorMissingVars } from "@/lib/env";

// Readiness probe. Unlike the old liveness-only version it actually checks
// the dependencies an order depends on: the local database, the storage
// backend, mail, payments and error reporting. No secret value is returned.
export const dynamic = "force-dynamic";

export async function GET() {
  logger.debug("health probe");
  let database = "unavailable";
  try {
    const { get } = await import("@/lib/sqlite");
    get<{ ok: number }>("SELECT 1 AS ok");
    database = "ok";
  } catch {
    database = "unavailable";
  }

  const checks = {
    database,
    storage: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? "supabase"
      : "local-sqlite",
    mail: process.env.MAIL_PROVIDER ?? "none",
    payments: process.env.PAYMENT_PROVIDER ?? "default",
    licenseGate: isLicenseGateEnabled() ? "on" : "off",
    errorSink: process.env.ERROR_REPORT_URL ? "configured" : "off",
  };
  const ok = database === "ok";
  return NextResponse.json(
    {
      ok,
      status: ok ? "ok" : "degraded",
      service: "marketit",
      version: process.env.npm_package_version ?? "0.0.0",
      region: process.env.VERCEL_REGION ?? process.env.DEPLOYMENT_ID ?? "local",
      checks,
      // Informational only: a readiness probe must not flip to 503 because a
      // non-runtime secret is unset. /api/payments/self-check enforces these.
      configuration: {
        checked: process.env.NODE_ENV === "production",
        missingOperatorVars:
          process.env.NODE_ENV === "production" ? operatorMissingVars() : [],
      },
      time: new Date().toISOString(),
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
