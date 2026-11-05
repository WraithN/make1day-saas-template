import { NextResponse, type NextRequest } from "next/server";
import { recordPageview } from "@/lib/stats";

// First-party pageview collector. Called by the client PageviewTracker only
// after the visitor has accepted cookies, so it stays privacy-consistent with
// the consent banner. No personal data is stored — just an aggregate count.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { path?: string };
    const p = (body.path || "/").toString().slice(0, 200);
    await recordPageview(p);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
