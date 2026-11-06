import { NextResponse } from "next/server";
import { z } from "zod";
import { buildProjectZip } from "@/lib/generator/pack";
import { slugify, type BuilderConfig } from "@/lib/generator/config";
import { checkEntitlement } from "@/lib/license";
import { builderConfigSchema } from "@/lib/generator/schema";
import { recordTrafficEvent } from "@/lib/traffic";
import { resolveIdentity } from "@/lib/visitor-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shared with the MCP scaffold_project tool so option enums never drift.
const configSchema = builderConfigSchema.extend({
  // Optional offline license key, pasted in the Builder after a purchase.
  licenseKey: z.string().max(4096).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = configSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid configuration", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // ── License gate: without this, anyone could POST and take the full ZIP ──
  // Generated customer projects ship with the gate OFF (no LICENSE_SECRET),
  // so this only protects ShipKit's own deployed site.
  const entitlement = await checkEntitlement(req, parsed.data.licenseKey);
  if (!entitlement.allowed) {
    return NextResponse.json(
      {
        error: "license_required",
        code: "PAYMENT_REQUIRED",
        pricingUrl: "/pricing",
        licenseUrl: "/license",
      },
      { status: 402 },
    );
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
