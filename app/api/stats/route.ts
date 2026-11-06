import { NextResponse, type NextRequest } from "next/server";
import { getStats } from "@/lib/stats";
import {
  isAdminConfigured,
  adminClosedResponse,
  adminUnauthorizedResponse,
  adminAuthorized,
} from "@/lib/admin-guard";

// Returns aggregate stats. The admin area must never be public: when creds are
// missing we close it in production (503); otherwise we require Basic Auth.
export async function GET(req: NextRequest) {
  const closed = adminClosedResponse();
  if (closed) return closed;
  if (!adminAuthorized(req.headers.get("authorization"))) {
    return adminUnauthorizedResponse();
  }
  const stats = await getStats();
  return NextResponse.json(stats);
}
