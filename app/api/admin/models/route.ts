import { NextResponse } from "next/server";
import { guardApiWrite } from "@/lib/http-guard";
import { getCurrentUser } from "@/lib/subscriptions";
import { resolveAdminRole, canManageRoles } from "@/lib/rbac";
import { currentOperator } from "@/lib/admin-session";
import { z } from "zod";
import {
  LANES,
  allPrices,
  allRouting,
  ledger,
  setPrice,
  setRouting,
  type Lane,
} from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  /api/admin/models            -> routing + price sheet + 30-day ledger
 * GET  /api/admin/models?format=csv -> ledger export
 * POST /api/admin/models            { lane, routing?, price? } -> save
 *
 * Admin-role only (same guard as /api/admin/users): the operator account or a
 * signed-in user whose role resolves to admin/staff-management. Keys are NOT
 * readable or writable here - they stay in the environment by design; this
 * endpoint only edits WHICH provider/model each lane routes to and at what
 * unit price the ledger values it.
 */
async function requireAdmin(): Promise<boolean> {
  if (await currentOperator()) return true;
  try {
    const user = await getCurrentUser();
    if (!user?.email) return false;
    const role = await resolveAdminRole(user.email, user.id);
    return canManageRoles(role);
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const rows = await ledger(30);
  const url = new URL(req.url);
  if (url.searchParams.get("format") === "csv") {
    const head = "day,lane,provider,model,input_units,output_units,cost_usd,source";
    const body = rows
      .map((r) =>
        [r.day, r.lane, r.provider, r.model, r.inputUnits, r.outputUnits, r.costUsd, r.source].join(","),
      )
      .join("\n");
    return new Response(head + "\n" + body, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="model-usage-30d.csv"',
        "cache-control": "no-store",
      },
    });
  }
  return NextResponse.json({
    routing: await allRouting(),
    prices: await allPrices(),
    ledger: rows,
    totalUsd: Math.round(rows.reduce((s, r) => s + r.costUsd, 0) * 1e4) / 1e4,
  });
}

const patchSchema = z.object({
  lane: z.enum([...LANES] as [Lane, ...Lane[]]),
  routing: z
    .object({
      provider: z.string().max(40),
      model: z.string().max(80),
      fallbackProvider: z.string().max(40),
      fallbackModel: z.string().max(80),
      budgetUsdPerUserMonth: z.number().min(0).max(100000),
    })
    .optional(),
  price: z
    .object({
      mode: z.enum(["tokens", "unit"]),
      inputUsdPer1k: z.number().min(0).max(1000),
      outputUsdPer1k: z.number().min(0).max(1000),
      unitUsd: z.number().min(0).max(1000),
      unit: z.string().max(24),
    })
    .optional(),
});

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const blocked = await guardApiWrite(req, { bucket: "admin-models", limit: 120, windowMs: 3600000 });
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid model patch", details: parsed.error.flatten() }, { status: 400 });
  }
  const { lane, routing, price } = parsed.data;
  try {
    if (routing) {
      await setRouting({ lane, ...routing });
    }
    if (price) {
      await setPrice({ lane, ...price });
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: "Could not save - apply the billing migration first",
        detail: String(err),
      },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, routing: await allRouting(), prices: await allPrices() });
}
