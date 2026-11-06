import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getCurrentUser } from "@/lib/subscriptions";
import { isOperatorAuthorized } from "@/lib/admin-session";
import { createTicket, listTickets } from "@/lib/tickets";
import { sendMailSafely } from "@/lib/mail";
import { buildMail } from "@/lib/mail/templates";
import type { Lang } from "@/lib/i18n-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LANGS = ["en", "zh", "ja", "fr", "de"] as const;
function pickLang(v: unknown): Lang {
  return typeof v === "string" && (LANGS as readonly string[]).includes(v)
    ? (v as Lang)
    : "en";
}

const createSchema = z.object({
  email: z.string().trim().email().max(320),
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(10).max(5000),
  // Honeypot: a hidden field real users never fill. A bot that fills it gets
  // a generic success but NOTHING is stored and NO email is sent.
  company: z.string().max(200).optional(),
  lang: z.string().optional(),
});

// ── Simple per-visitor / per-IP throttle ──────────────────────────────────
// In-memory and per-instance (same pattern as /api/admin/login). A multi-
// instance deployment should move this to the shared SQLite/Supabase store.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request): string {
  const h = request.headers;
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "local";
  const cookie = h.get("cookie") ?? "";
  const vid = /(?:^|;\s*)sk_vid=([a-f0-9]{32})/.exec(cookie)?.[1] ?? "anon";
  return `${ip}:${vid}`;
}

function tooMany(key: string): boolean {
  const now = Date.now();
  const e = hits.get(key);
  if (!e || e.resetAt <= now) return false;
  return e.count >= MAX_PER_WINDOW;
}

function recordHit(key: string): void {
  const now = Date.now();
  const e = hits.get(key);
  if (!e || e.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  e.count += 1;
}

/** Best-effort session lookup: local SQLite mode has no Supabase env at all. */
async function optionalUserId(): Promise<string | null> {
  try {
    const user = await getCurrentUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * POST /api/support/tickets — public contact form.
 * Zod-validated, honeypot-gated, rate-limited. Associates the ticket with a
 * signed-in user when one exists. Creates the row FIRST, then sends two mails
 * (requester confirmation + operator notification) best-effort, so a mail
 * outage never loses the ticket.
 */
export async function POST(request: Request) {
  const key = clientKey(request);
  if (tooMany(key)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  recordHit(key);
  const { email, subject, message, company } = parsed.data;
  const lang = pickLang(parsed.data.lang);

  // Honeypot hit: mirror a success without persisting or sending anything.
  if (company && company.trim()) {
    logger.info("support ticket honeypot hit — discarded", { key });
    return NextResponse.json({ ok: true, ticketId: null });
  }

  const userId = await optionalUserId();
  let ticket;
  try {
    ticket = await createTicket({ email, subject, message, userId });
  } catch (err) {
    logger.error("support ticket create failed", { err: (err as Error).message });
    return NextResponse.json({ error: "storage_error" }, { status: 500 });
  }

  const data = { email, subject, message, id: ticket.id };
  const userMail = buildMail("ticketUser", lang, data);
  const operatorMail = buildMail("ticketOperator", lang, data);
  const [toUser, toOperator] = await Promise.all([
    sendMailSafely({ to: email, ...userMail, template: "ticketUser", lang }),
    sendMailSafely({
      to: env.mailOperatorEmail(),
      ...operatorMail,
      template: "ticketOperator",
      lang,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    ticketId: ticket.id,
    mailDelivered: { user: toUser.delivered, operator: toOperator.delivered },
  });
}

/**
 * GET /api/support/tickets — list.
 * Operator → all tickets; signed-in user → only their own; anonymous → 401
 * (never another visitor's messages).
 */
export async function GET() {
  const operator = await isOperatorAuthorized();
  let userId: string | null = null;
  if (!operator) {
    userId = await optionalUserId();
    if (!userId) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }
  }
  try {
    const tickets = await listTickets({ operator, userId });
    return NextResponse.json({ tickets, operator });
  } catch (err) {
    logger.error("support ticket list failed", { err: (err as Error).message });
    return NextResponse.json({ error: "storage_error" }, { status: 500 });
  }
}
