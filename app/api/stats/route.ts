import { NextResponse, type NextRequest } from "next/server";
import { getStats } from "@/lib/stats";
import { adminClosedResponse } from "@/lib/admin-guard";
import { isOperatorAuthorized } from "@/lib/admin-session";

// Returns aggregate stats. The admin area must never be public: when neither
// an operator account nor Supabase is configured we close it in production
// (503); otherwise the operator session (or an admin/staff Supabase role) is
// required.
export async function GET(req: NextRequest) {
  const closed = adminClosedResponse();
  if (closed) return closed;
  if (!(await isOperatorAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const stats = await getStats();
  return NextResponse.json(stats);
}
