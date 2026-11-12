import { guardApiWrite } from "@/lib/http-guard";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildProjectZip } from "@/lib/generator/pack";
import { slugify, type BuilderConfig } from "@/lib/generator/config";
import { checkEntitlement, ensureTrialToken, TRIAL_COOKIE } from "@/lib/license";
import { builderConfigSchema } from "@/lib/generator/schema";
import { recordTrafficEvent } from "@/lib/traffic";
import { recordDeliveryEvent } from "@/lib/observability";
import { resolveIdentity } from "@/lib/visitor-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shared with the MCP scaffold_project tool so option enums never drift.
const configSchema = builderConfigSchema.extend({
  // Optional offline license key, pasted in the Builder after a purchase.
  licenseKey: z.string().max(4096).optional(),
});

export async function POST(req: Request) {
  const blocked = await guardApiWrite(req, {
    bucket: "generate",
    limit: 30,
    windowMs: 3600000,
  });
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const parsed = configSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid configuration", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // ── License gate ────────────────────────────────────────────────────────
  // The generator IS the product: downloading the source tree means owning
  // it. Only a paid entitlement (offline license key, active subscription
  // or a license claimed by email) unlocks the full ZIP. An anonymous
  // visitor gets 402 and may take a free PREVIEW instead — the inventory
  // of the build plus the design tokens, never application source.
  //
  // Generated customer projects ship with the gate OFF (their lib/env.ts
  // defaults to LICENSE_GATE=off), so this only protects make1day.dev's own
  // deployed site.
  const entitlement = await checkEntitlement(req, parsed.data.licenseKey);
  if (!entitlement.allowed) {
    const trial = ensureTrialToken(req);
    const updatesExpired = entitlement.reason === "update-window-expired";
    const res = NextResponse.json(
      {
        error: "license_required",
        code: updatesExpired ? "UPDATES_EXPIRED" : "PAYMENT_REQUIRED",
        pricingUrl: "/pricing",
        licenseUrl: "/license",
        // A Care subscription re-opens the update window for an expired Buyout.
        careUrl: updatesExpired ? "/pricing#care" : undefined,
        // A free, source-free preview is always offered next to the paywall.
        previewAvailable: true,
        previewUrl: "/api/generate/preview",
        previewRemaining:
          typeof entitlement.remaining === "number"
            ? entitlement.remaining
            : undefined,
      },
      { status: 402 },
    );
    if (trial.isNew) {
      res.cookies.set(TRIAL_COOKIE, trial.cookie, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
    }
    return res;
  }

  const { licenseKey: _licenseKey, ...config } = parsed.data;
  const typedConfig: BuilderConfig = config;
  const slug = slugify(typedConfig.appName);

  try {
    const zip = await buildProjectZip(typedConfig);

    // Funnel step "conversion": a successfully downloaded template is the
    // strongest conversion signal on the site. Recorded server-side so it
    // cannot be blocked or spoofed by the client.
    const identity = resolveIdentity(req.headers.get("cookie"));
    await recordTrafficEvent({
      visitorId: identity.visitorId,
      sessionId: identity.sessionId,
      kind: "conversion",
      path: "/builder",
      label: "download",
      createdAt: new Date().toISOString(),
    }).catch(() => {});

    // Auditable delivery evidence for the 14-day refund window. The email is
    // written as a one-way hash; no IP, user agent or raw address is stored.
    recordDeliveryEvent("download", {
      jti: entitlement.jti,
      email: entitlement.email,
    });

    return new NextResponse(new Blob([zip as BlobPart]), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${slug}-shipkit.zip"`,
        "Cache-Control": "no-store",
        // Never leak the key; this header is only for debugging/telemetry.
        "X-ShipKit-Entitlement": entitlement.reason,
      },
    });
  } catch (err) {
    console.error("generate failed", err);
    return NextResponse.json(
      { error: "Failed to generate template" },
      { status: 500 },
    );
  }
}
