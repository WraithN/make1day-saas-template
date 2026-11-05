import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { getStats } from "@/lib/stats";

// Returns aggregate stats. Protected by HTTP Basic Auth (ADMIN_USER /
// ADMIN_PASSWORD) so the numbers aren't publicly scrapable. The /admin page
// itself is also guarded by middleware.
function unauthorized() {
  return NextResponse.json(
    { error: "unauthorized" },
    {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="ShipKit Admin"' },
    },
  );
}

export async function GET(req: NextRequest) {
  const user = env.adminUser();
  const pass = env.adminPassword();
  if (user && pass) {
    const auth = req.headers.get("authorization");
    const expected = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
    if (auth !== expected) return unauthorized();
  }
  const stats = await getStats();
  return NextResponse.json(stats);
}
