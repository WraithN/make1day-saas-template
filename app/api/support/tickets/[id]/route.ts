import { guardApiWrite } from "@/lib/http-guard";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { isOperatorAuthorized } from "@/lib/admin-session";
import { updateTicketStatus, TICKET_STATUSES } from "@/lib/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["open", "answered", "closed"]),
});

/**
 * PATCH /api/support/tickets/:id  { status }
 *
 * Operator-only status change. The operator guard is the SAME one the /admin
 * console uses (local operator session OR a Supabase admin/staff role). A
 * non-operator gets 403 regardless of whether the ticket id exists.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = await guardApiWrite(request, {
    bucket: "tickets-write",
    limit: 30,
    windowMs: 3600000,
  });
  if (blocked) return blocked;

  if (!(await isOperatorAuthorized())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!id || id.length > 100) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success || !TICKET_STATUSES.includes(parsed.data.status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  try {
    const ticket = await updateTicketStatus(id, parsed.data.status);
    if (!ticket) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ticket });
  } catch (err) {
    logger.error("support ticket status update failed", {
      err: (err as Error).message,
      id,
    });
    return NextResponse.json({ error: "storage_error" }, { status: 500 });
  }
}
