// Unified transactional mail dispatcher.
//
// Three working transports, all over fetch (zero runtime dependencies):
//   * resend  — POST https://api.resend.com/emails (REST).
//   * webhook — POST to a configurable MAIL_WEBHOOK_URL (custom HTTP mailer).
//   * none    — logs the message and returns delivered:false (never throws).
// "smtp" is a RESERVED, UNIMPLEMENTED value: it throws a clear MailError
// instead of claiming support. See docs/email.md.
//
// Design rules:
//   * No secret is ever logged or returned.
//   * A mail outage must never turn a primary action (creating a ticket,
//     requesting a reset) into a 500 — use sendMailSafely() for those.
//   * sendMail() is the strict variant: it throws a typed MailError on a
//     configuration / transport failure so a self-check or test can surface it.

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  currentMailProvider,
  mailFromHeader,
  MAIL_HTTP_TIMEOUT_MS,
} from "./config";
import {
  MailError,
  type SendMailInput,
  type SendMailResult,
  type MailProvider,
} from "./types";

// A deliberately small recipient check — the mail service is the authority on
// deliverability. This only stops obviously malformed input at the boundary.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function assertRecipient(to: string): void {
  if (!EMAIL_RE.test(to) || to.length > 320) {
    throw new MailError("invalid_recipient", "Invalid recipient address");
  }
}

/** Build the webhook JSON payload (no secrets inside). */
function webhookPayload(input: SendMailInput, from: string) {
  return {
    to: input.to,
    from,
    subject: input.subject,
    html: input.html,
    text: input.text,
    ...(env.mailReplyTo().trim() ? { replyTo: env.mailReplyTo().trim() } : {}),
    ...(input.template ? { template: input.template } : {}),
    ...(input.lang ? { lang: input.lang } : {}),
  };
}

async function sendResend(input: SendMailInput, from: string): Promise<string | undefined> {
  const apiKey = env.resendApiKey().trim();
  if (!apiKey) {
    throw new MailError("invalid_config", "RESEND_API_KEY is not configured");
  }

  const body: Record<string, unknown> = {
    from,
    to: [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text,
  };
  const replyTo = env.mailReplyTo().trim();
  if (replyTo) body.reply_to = replyTo;

  // Endpoint / field names follow Resend's public REST docs; verify against
  // the current Resend documentation before a production launch.
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(MAIL_HTTP_TIMEOUT_MS),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const parsed = (await res.json()) as { message?: string; name?: string };
      detail = parsed?.message ? `: ${parsed.message}` : "";
    } catch {
      /* non-JSON error body — keep the status only */
    }
    // Never log the Authorization header or the raw response body.
    throw new MailError(
      "transport_error",
      `Resend returned HTTP ${res.status}${detail}`,
    );
  }

  try {
    const parsed = (await res.json()) as { id?: string };
    return parsed?.id;
  } catch {
    return undefined;
  }
}

async function sendWebhook(input: SendMailInput, from: string): Promise<string | undefined> {
  const url = env.mailWebhookUrl().trim();
  if (!url) {
    throw new MailError("invalid_config", "MAIL_WEBHOOK_URL is not configured");
  }
  const token = env.mailWebhookToken().trim();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(webhookPayload(input, from)),
    signal: AbortSignal.timeout(MAIL_HTTP_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new MailError(
      "transport_error",
      `Mail webhook returned HTTP ${res.status}`,
    );
  }
  try {
    const parsed = (await res.json()) as { id?: string };
    return parsed?.id;
  } catch {
    return undefined;
  }
}

/**
 * Send one email. Throws a typed MailError for configuration / transport
 * problems (except in "none" mode, which is always a safe no-op).
 */
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const provider: MailProvider = currentMailProvider();
  assertRecipient(input.to);

  if (provider === "none") {
    logger.info("mail suppressed (MAIL_PROVIDER=none)", {
      to: input.to,
      subject: input.subject,
      template: input.template ?? "custom",
    });
    return {
      delivered: false,
      provider,
      reason: "MAIL_PROVIDER=none — logged, not sent",
    };
  }

  if (provider === "smtp") {
    throw new MailError(
      "smtp_not_implemented",
      "MAIL_PROVIDER=smtp is reserved but not implemented. Install nodemailer + @types/nodemailer and add a dynamic-import adapter (docs/email.md), or use MAIL_PROVIDER=resend|webhook.",
    );
  }

  const from = mailFromHeader();
  if (!from) {
    throw new MailError("invalid_config", "MAIL_FROM is not configured");
  }

  try {
    const id =
      provider === "resend"
        ? await sendResend(input, from)
        : await sendWebhook(input, from);
    logger.info("transactional mail delivered", {
      to: input.to,
      subject: input.subject,
      template: input.template ?? "custom",
      provider,
    });
    return { delivered: true, provider, ...(id ? { id } : {}) };
  } catch (err) {
    if (err instanceof MailError) throw err;
    throw new MailError(
      "transport_error",
      `Mail transport failed: ${(err as Error).message}`,
    );
  }
}

/**
 * Best-effort variant for primary flows (ticket creation, password-reset
 * request). It NEVER throws: a misconfigured or unreachable provider is logged
 * and the caller's own work still succeeds. The returned result records
 * whether the email was actually delivered.
 */
export async function sendMailSafely(
  input: SendMailInput,
): Promise<SendMailResult> {
  try {
    return await sendMail(input);
  } catch (err) {
    const code = err instanceof MailError ? err.code : "transport_error";
    logger.warn("transactional mail not delivered", {
      to: input.to,
      subject: input.subject,
      template: input.template ?? "custom",
      code,
      err: (err as Error).message,
    });
    return {
      delivered: false,
      provider: currentMailProvider(),
      reason: `${code}: ${(err as Error).message}`,
    };
  }
}

export { MailError } from "./types";
export type {
  MailProvider,
  MailTemplate,
  SendMailInput,
  SendMailResult,
  RenderedMail,
} from "./types";
