import { NextResponse } from "next/server";
import {
  env,
  isLicenseGateEnabled,
  licenseGateStatus,
  paymentProviderMissingVars,
  paymentProviderRequiredVars,
  priceForPlan,
} from "@/lib/env";
import { waffoConfigSummary } from "@/lib/payments/waffo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Read-only integration self-check. Returns CONFIGURATION STATE ONLY — never
 * secret values. Open `GET /api/payments/self-check` before going live: every
 * item in `missing` must be empty.
 */
export async function GET() {
  const provider = env.paymentProvider();
  const gate = licenseGateStatus();
  const license = {
    gateEnabled: isLicenseGateEnabled(),
    mode: gate.mode,
    gateReason: gate.reason,
    secretConfigured: !!env.licenseSecret(),
    // A production deployment always gates. Without LICENSE_SECRET no license
    // can be issued, so the paid path stays closed — that is a configuration
    // error, not a reason to open the gate.
    freePreviewsPerVisitorPerDay: env.freeGenerationsPerDay(),
    freePreviewsPerNetworkPerDay: env.freeGenerationsPerNetworkPerDay(),
    webhookUrl: "/api/webhook",
  };

  const missing: string[] = [];
  if (gate.enabled && !license.secretConfigured) {
    missing.push(
      "LICENSE_SECRET — the download gate is ON but no license can be issued",
    );
  }

  if (provider !== "waffo") {
    // Every non-Waffo gateway gets a basic, secret-free configuration status:
    // which env vars it needs, which are missing, and whether price/variant ids
    // are set. Waffo additionally has a detailed protocol/flavor check below.
    const requiredEnvVars = paymentProviderRequiredVars(provider);
    const missingEnvVars = paymentProviderMissingVars(provider);
    const priceBuyout = !!priceForPlan("buyout");
    const priceCare = !!priceForPlan("care");
    return NextResponse.json({
      provider,
      priceIdsConfigured: { buyout: priceBuyout, care: priceCare },
      requiredEnvVars,
      missingEnvVars,
      license,
      missing: [
        ...missing,
        ...missingEnvVars,
        ...(priceBuyout ? [] : ["price id for Buyout"]),
        ...(priceCare ? [] : ["price id for Care"]),
      ],
      hint: "Basic configuration status for every gateway; Waffo additionally has a detailed protocol/flavor self-check.",
      docs: "docs/payments.md",
      ready:
        missing.length === 0 &&
        missingEnvVars.length === 0 &&
        priceBuyout &&
        priceCare,
    });
  }

  const waffo = waffoConfigSummary();
  return NextResponse.json({
    provider,
    waffo,
    license,
    docs: "https://docs.waffo.ai/llms.txt (Pancake) / https://waffo.com/docs/llms.txt (Acquiring)",
    checklist: [
      "Create a one-time product for Buyout and a monthly subscription product for Care",
      "Fill WAFFO_PRICE_ID_BUYOUT / WAFFO_PRICE_ID_CARE with the product IDs",
      "Register ONE webhook endpoint: POST https://<domain>/api/webhook",
      "Copy the Webhook Public Key for BOTH test and prod into env",
      "Acquiring: fill every WAFFO_ACQUIRING_* contract env var (see docs/waffo.md §5) and verify the signing mode / response shape against your contract",
      "Set LICENSE_SECRET (a long random string) — the gate is ON in production either way",
      "Send yourself a test payment, then check /admin/licenses for the issued key",
    ],
    ready: waffo.ready && license.secretConfigured,
  });
}
