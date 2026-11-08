import { NextResponse } from "next/server";
import { DEMO_COOKIE, isDemoMode } from "@/lib/demo";

// One-click mock login: drop a demo session cookie and send the visitor to
// the user console. Only available while demo mode is explicitly enabled —
// a deployed site must never hand out a session for free.
export async function GET(request: Request) {
  if (!isDemoMode()) {
    return NextResponse.json({ error: "demo_mode_disabled" }, { status: 403 });
  }
  const res = NextResponse.redirect(new URL("/account", request.url));
  res.cookies.set(DEMO_COOKIE, "1", {
    path: "/",
    httpOnly: false, // readable by the client Nav to show "Dashboard"
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
