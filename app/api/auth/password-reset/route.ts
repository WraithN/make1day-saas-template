import { guardApiWrite } from "@/lib/http-guard";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  authBackend,
  createPasswordReset,
  consumePasswordReset,
  setLocalPassword,
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

const requestSchema = z.object({
  action: z.literal("request"),
  email: z.string().trim().email().max(320),
  lang: z.string().optional(),
});

const confirmSchema = z.object({
  action: z.literal("confirm"),
  token: z.string().max(512).optional(),
  password: z.string().min(8).max(200),
  lang: z.string().optional(),
});

// Throttling now uses the persistent, cross-instance guard in
// lib/http-guard.ts (SQLite or the consume_rate_limit() Supabase RPC).

function siteUrl(): string {
  return env.siteUrl().replace(/\/+$/, "");
}

/**
 * POST /api/auth/password-reset
 *
 *   { action: "request", email, lang }  → send a reset link (or Supabase mail)
 *   { action: "confirm", token, password, lang } → set the new password
 *
 * ANTI-ENUMERATION: the "request" action ALWAYS returns the same {ok:true}
 * body with the same copy whether or not the address exists. Errors are only
 * logged server-side. Tokens are one-time and hard-expiring (local path).
 * Supabase path: resetPasswordForEmail + updateUser (session from the recovery
 * link via /auth/callback) — 需按 Supabase 文档核对 the exact redirect flow.
 */
export async function POST(request: Request) {
  const blocked = await guardApiWrite(request, {
    bucket: "password-reset",
    limit: 8,
    windowMs: 60000,
  });
  if (blocked) return blocked;


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

  // ── request ────────────────────────────────────────────────────────────
  if (action === "request") {
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    const email = parsed.data.email.toLowerCase();
    const lang = pickLang(parsed.data.lang);

    try {
      if (authBackend() === "supabase") {
        const supabase = await createSupabaseServerClient();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${siteUrl()}/auth/callback?redirect=/reset-password`,
        });
        if (error) logger.warn("password reset request failed (supabase)", {
          err: error.message,
        });
      } else {
        pruneExpiredAuthTokens();
        const raw = createPasswordReset(email);
        if (raw) {
          const link = `${siteUrl()}/reset-password?token=${encodeURIComponent(raw)}&lang=${lang}`;
          const mail = buildMail("reset", lang, {
            email,
            link,
            hours: env.mailTokenTtlHours(),
          });
          await sendMailSafely({ to: email, ...mail, template: "reset", lang });
        }
        // No else: an unknown address is deliberately indistinguishable.
      }
    } catch (err) {
      // Never surface which backend failed or whether the address exists.
      logger.error("password reset request error", { err: (err as Error).message });
    }

    // Identical response for existing / missing / errored addresses.
    return NextResponse.json({ ok: true });
  }

  // ── confirm ────────────────────────────────────────────────────────────
  if (action === "confirm") {
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    const { token, password } = parsed.data;

    try {
      if (authBackend() === "supabase") {
        // PKCE recovery link: /auth/callback exchanged the code for a session
        // cookie before the user reached /reset-password. updateUser() then
        // sets the new password on that session. 需按 Supabase 文档核对.
        const supabase = await createSupabaseServerClient();
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError || !data?.user) {
          return NextResponse.json({ error: "invalid_token" }, { status: 400 });
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          logger.warn("password update failed (supabase)", { err: error.message });
          return NextResponse.json({ error: "invalid_token" }, { status: 400 });
        }
        return NextResponse.json({ ok: true });
      }

      const email = token ? consumePasswordReset(token) : null;
      if (!email || !setLocalPassword(email, password)) {
        return NextResponse.json({ error: "invalid_token" }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    } catch (err) {
      logger.error("password reset confirm error", { err: (err as Error).message });
      return NextResponse.json({ error: "invalid_token" }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
