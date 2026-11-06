import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  authBackend,
  createEmailVerification,
  consumeEmailVerification,
  markEmailVerified,
  pruneExpiredAuthTokens,
} from "@/lib/local-auth-tokens";
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

const sendSchema = z.object({
  action: z.literal("send"),
  email: z.string().trim().email().max(320),
  lang: z.string().optional(),
});

const confirmSchema = z.object({
  action: z.literal("confirm"),
  token: z.string().max(512).optional(),
  tokenHash: z.string().max(512).optional(),
  lang: z.string().optional(),
});

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(request: Request): boolean {
  const h = request.headers;
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "local";
  const key = `verify:${ip}`;
  const now = Date.now();
  const e = hits.get(key);
  if (!e || e.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  e.count += 1;
  return e.count > MAX_PER_WINDOW;
}

function siteUrl(): string {
  return env.siteUrl().replace(/\/+$/, "");
}

/**
 * Confirm a verification token for either backend. Returns ok / invalid.
 *   * local    → `token` (raw, one-time, hash-stored)
 *   * supabase → `tokenHash` via auth.verifyOtp({ token_hash, type: "email" })
 */
async function confirm(params: {
  token?: string;
  tokenHash?: string;
}): Promise<boolean> {
  if (authBackend() === "supabase") {
    if (!params.tokenHash) return false;
    try {
      const supabase = await createSupabaseServerClient();
      // verifyOtp with a token_hash requires a Supabase email template that
      // embeds {{ .TokenHash }} — 需按 Supabase 文档核对 the template config.
      const { error } = await supabase.auth.verifyOtp({
        token_hash: params.tokenHash,
        type: "email",
      });
      if (error) {
        logger.warn("email verification failed (supabase)", { err: error.message });
        return false;
      }
      return true;
    } catch (err) {
      logger.error("email verification error (supabase)", {
        err: (err as Error).message,
      });
      return false;
    }
  }
  if (!params.token) return false;
  pruneExpiredAuthTokens();
  const email = consumeEmailVerification(params.token);
  return email ? markEmailVerified(email) : false;
}

/**
 * POST /api/auth/verify-email
 *
 *   { action: "send", email, lang }        → send a verification email
 *   { action: "confirm", token | tokenHash, lang } → confirm a link
 *
 * ANTI-ENUMERATION: "send" ALWAYS returns the same {ok:true} body. Errors are
 * logged server-side only. Tokens are one-time and hard-expiring (local path).
 */
export async function POST(request: Request) {
  if (rateLimited(request)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const action =
    typeof body === "object" && body !== null
      ? (body as { action?: unknown }).action
      : undefined;

  if (action === "send") {
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    const email = parsed.data.email.toLowerCase();
    const lang = pickLang(parsed.data.lang);

    try {
      if (authBackend() === "supabase") {
        const supabase = await createSupabaseServerClient();
        // resend({ type: "signup", email }) re-sends the signup confirmation.
        // 需按 Supabase 文档核对 whether a "email_change" type is required for
        // already-confirmed accounts.
        const { error } = await supabase.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: `${siteUrl()}/verify-email?status=ok` },
        });
        if (error) logger.warn("verification resend failed (supabase)", {
          err: error.message,
        });
      } else {
        pruneExpiredAuthTokens();
        const raw = createEmailVerification(email);
        if (raw) {
          const link = `${siteUrl()}/api/auth/verify-email?token=${encodeURIComponent(raw)}&lang=${lang}`;
          const mail = buildMail("verify", lang, {
            email,
            link,
            hours: env.mailTokenTtlHours(),
          });
          await sendMailSafely({ to: email, ...mail, template: "verify", lang });
        }
      }
    } catch (err) {
      logger.error("verification send error", { err: (err as Error).message });
    }

    return NextResponse.json({ ok: true });
  }

  if (action === "confirm") {
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    const ok = await confirm({
      token: parsed.data.token,
      tokenHash: parsed.data.tokenHash,
    });
    return ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}

/**
 * GET /api/auth/verify-email?token=… | ?token_hash=…&lang=…
 *
 * Email-link friendly confirmation. Consumes the one-time token, then
 * redirects to /verify-email with a status flag (no token in the final URL).
 * Supports both the local raw token and Supabase's token_hash.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? undefined;
  const tokenHash =
    url.searchParams.get("token_hash") ?? url.searchParams.get("tokenHash") ?? undefined;
  const lang = pickLang(url.searchParams.get("lang"));

  let ok = false;
  try {
    ok = await confirm({ token, tokenHash });
  } catch (err) {
    logger.error("verification GET error", { err: (err as Error).message });
  }
  const target = new URL("/verify-email", siteUrl());
  target.searchParams.set("status", ok ? "ok" : "invalid");
  target.searchParams.set("lang", lang);
  return NextResponse.redirect(target);
}
