import { guardApiWrite } from "@/lib/http-guard";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildPreviewZip } from "@/lib/generator/preview";
import { slugify, type BuilderConfig } from "@/lib/generator/config";
import {
  checkPreviewEntitlement,
  ensureTrialToken,
  TRIAL_COOKIE,
} from "@/lib/license";
import { builderConfigSchema } from "@/lib/generator/schema";
import { recordTrafficEvent } from "@/lib/traffic";
import { resolveIdentity } from "@/lib/visitor-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Free PREVIEW download.
//
// The generator is the product, so an anonymous visitor never receives the
// application source. This endpoint hands out a preview package instead:
// the file inventory of the paid build, the design tokens of the selected
// style and the configuration — no source code, no AGENTS.md, no skills.
//
// The quota is counted twice (a signed visitor token AND the trusted
// network the request came from), so neither clearing cookies nor rotating
// a header keeps the previews coming.

const configSchema = builderConfigSchema.extend({
  licenseKey: z.string().max(4096).optional(),
});

export async function POST(req: Request) {
  const blocked = await guardApiWrite(req, {
    bucket: "generate-preview",
    limit: 20,
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

  const { licenseKey: _licenseKey, ...config } = parsed.data;
  const typedConfig: BuilderConfig = config;
  const slug = slugify(typedConfig.appName);

  // A stable, signed identity for this visitor. Issued on first contact so
  // the quota can be counted per visitor and not per request.
  const trial = ensureTrialToken(req);
  const entitlement = await checkPreviewEntitlement(req, trial.id);

  if (!entitlement.allowed) {
    return NextResponse.json(
      {
        error: "preview_limit_reached",
        code: "PREVIEW_LIMIT",
        pricingUrl: "/pricing",
        licenseUrl: "/license",
        message:
          "The free preview limit for today is used up. A license removes the limit entirely.",
      },
      { status: 402 },
    );
  }

  try {
    const zip = await buildPreviewZip(typedConfig);

    const identity = resolveIdentity(req.headers.get("cookie"));
    await recordTrafficEvent({
      visitorId: identity.visitorId,
      sessionId: identity.sessionId,
      kind: "conversion",
      path: "/builder",
      label: "preview",
      createdAt: new Date().toISOString(),
    }).catch(() => {});

    const res = new NextResponse(new Blob([zip as BlobPart]), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${slug}-shipkit-preview.zip"`,
        "Cache-Control": "no-store",
        "X-ShipKit-Entitlement": entitlement.reason,
      },
    });
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
  } catch (err) {
    console.error("preview failed", err);
    return NextResponse.json(
      { error: "Failed to build preview" },
      { status: 500 },
    );
  }
}
