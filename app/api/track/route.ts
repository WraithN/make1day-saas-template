import { NextResponse, type NextRequest } from "next/server";
import { recordPageview } from "@/lib/stats";
import { recordTrafficEvent, type TrafficEventKind } from "@/lib/traffic";
import {
  resolveIdentity,
  VISITOR_COOKIE,
  SESSION_COOKIE,
  VISITOR_COOKIE_MAX_AGE,
  SESSION_COOKIE_MAX_AGE,
} from "@/lib/visitor-id";

// First-party traffic collector. Called by the client tracker only after the
// visitor has accepted cookies, so it stays privacy-consistent with the
// consent banner.
//
// Events:
//   view       — a page view (path)
//   cta        — a click on an element marked data-cta (path + label)
//   checkout   — the visitor started a checkout
//   conversion — the visitor completed a purchase
//
// No personal data is stored: the visitor/session ids are random opaque
// tokens, and the referrer is reduced to its host.
export const runtime = "nodejs";

const KINDS: TrafficEventKind[] = ["view", "cta", "checkout", "conversion"];

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed.length ? trimmed : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      kind?: string;
      path?: string;
      label?: string;
      referrer?: string;
      email?: string;
    };

    const kind = KINDS.includes(body.kind as TrafficEventKind)
      ? (body.kind as TrafficEventKind)
      : "view";

    const path = (body.path || "/").toString().split("?")[0].slice(0, 200);
    const label = clean(body.label, 64);
    const email = clean(body.email, 200)?.toLowerCase() ?? null;

    // Only the host of the referrer is kept — enough to know where traffic
    // came from, not enough to reconstruct a browsing history.
    let referrer: string | null = null;
    const rawReferrer = clean(body.referrer, 500);
    if (rawReferrer) {
      try {
        referrer = new URL(rawReferrer).host.replace(/^www\./, "");
      } catch {
        referrer = null;
      }
    }

    const identity = resolveIdentity(req.headers.get("cookie"));

    await recordTrafficEvent({
      visitorId: identity.visitorId,
      sessionId: identity.sessionId,
      kind,
      path,
      label,
      referrer,
      email,
      createdAt: new Date().toISOString(),
    });

    // Keep the legacy per-path counter in sync so the older stats views and
    // the Supabase `pageviews` table keep working unchanged.
    if (kind === "view") {
      await recordPageview(path);
    }

    const res = NextResponse.json({ ok: true });
    if (identity.isNewVisitor) {
      res.cookies.set(VISITOR_COOKIE, identity.visitorId, {
        maxAge: VISITOR_COOKIE_MAX_AGE,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
    }
    if (identity.isNewSession) {
      res.cookies.set(SESSION_COOKIE, identity.sessionId, {
        maxAge: SESSION_COOKIE_MAX_AGE,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
    }
    return res;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
