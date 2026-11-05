import { NextResponse } from "next/server";
import { env, isLicenseGateEnabled, priceForPlan } from "@/lib/env";
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
  const license = {
    gateEnabled: isLicenseGateEnabled(),
    mode: env.licenseGateMode(),
    secretConfigured: !!env.licenseSecret(),
    freeGenerationsPerDay: env.freeGenerationsPerDay(),
    webhookUrl: "/api/webhook",
  };

  if (provider !== "waffo") {
    return NextResponse.json({
      provider,
      priceIdsConfigured: {
        buyout: !!priceForPlan("buyout"),
        care: !!priceForPlan("care"),
      },
      license,
      missing: [
        ...(priceForPlan("buyout") ? [] : ["price id for Buyout"]),
        ...(priceForPlan("care") ? [] : ["price id for Care"]),
      ],
      hint: "Only Waffo has a detailed protocol self-check in this build.",
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
      "Set LICENSE_SECRET (a long random string) before enabling the gate",
      "Send yourself a test payment, then check /admin/licenses for the issued key",
    ],
    ready: waffo.ready && license.secretConfigured,
  });
}
