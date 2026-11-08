import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApiWrite } from "@/lib/http-guard";
import { recordConsentEvent } from "@/lib/observability";
import { requestIdentity } from "@/lib/rate-limit";
import { hashIdentity } from "@/lib/http-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  kind: z.enum(["accept", "withdraw", "policy_view"]),
  policy: z.string().min(1).max(60).default("privacy-v1"),
  detail: z.string().max(200).optional(),
  email: z.string().email().max(320).optional(),
});

/** Append-only consent audit log. Anonymous visitors are keyed by a hash of
 *  their trusted network, never by a raw IP or cookie value. */
export async function POST(req: Request) {
  const blocked = await guardApiWrite(req, {
    bucket: "privacy-consent",
    limit: 30,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const { kind, policy, detail, email } = parsed.data;
  const subject = email ?? `anon:${hashIdentity(requestIdentity(req))}`;
  recordConsentEvent(subject, kind, policy, detail);
  return NextResponse.json({ ok: true });
}
