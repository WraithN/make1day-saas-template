import { NextResponse } from "next/server";
import { DEMO_COOKIE } from "@/lib/demo";

// One-click mock login: drop a demo session cookie and send the visitor to
// the user console. Only meaningful while demo mode is on (Supabase unconfigured).
export async function GET(request: Request) {
  const res = NextResponse.redirect(new URL("/account", request.url));
  res.cookies.set(DEMO_COOKIE, "1", {
    path: "/",
    httpOnly: false, // readable by the client Nav to show "Dashboard"
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
