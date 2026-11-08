// Unified transactional mail dispatcher.
//
// Six working transports, all over fetch (zero runtime dependencies):
//   * resend   — POST https://api.resend.com/emails (REST).
//   * sendgrid — POST https://api.sendgrid.com/v3/mail/send (REST).
//   * postmark — POST https://api.postmarkapp.com/email (Server API).
//   * mailgun  — POST https://api.mailgun.net/v3/{domain}/messages (REST + form).
//   * webhook  — POST to a configurable MAIL_WEBHOOK_URL (custom HTTP mailer).
//   * none     — logs the message and returns delivered:false (never throws).
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

async function sendSendGrid(input: SendMailInput, from: string): Promise<string | undefined> {
  const apiKey = env.sendgridApiKey().trim();
  if (!apiKey) {
    throw new MailError("invalid_config", "SENDGRID_API_KEY is not configured");
  }
  const fromName = env.mailFromName().trim();
  const replyTo = env.mailReplyTo().trim();
  const body = {
    personalizations: [{ to: [{ email: input.to }] }],
    from: fromName ? { email: from, name: fromName } : { email: from },
    ...(replyTo ? { reply_to: { email: replyTo } } : {}),
    subject: input.subject,
    content: [
      { type: "text/plain", value: input.text },
      { type: "text/html", value: input.html },
    ],
  };
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
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
      const parsed = (await res.json()) as { errors?: { message?: string }[] };
      detail = parsed?.errors?.[0]?.message ? `: ${parsed.errors[0].message}` : "";
    } catch {
      /* non-JSON error body — keep the status only */
    }
    throw new MailError(
      "transport_error",
      `SendGrid returned HTTP ${res.status}${detail}`,
    );
  }
  // SendGrid returns the message id in the X-Message-Id response header.
  return res.headers.get("X-Message-Id") ?? undefined;
}

async function sendPostmark(input: SendMailInput, from: string): Promise<string | undefined> {
  const token = env.postmarkServerToken().trim();
  if (!token) {
    throw new MailError("invalid_config", "POSTMARK_SERVER_TOKEN is not configured");
  }
  const replyTo = env.mailReplyTo().trim();
  const body = {
    From: from,
    To: input.to,
    Subject: input.subject,
    HtmlBody: input.html,
    TextBody: input.text,
    ...(replyTo ? { ReplyTo: replyTo } : {}),
    MessageStream: "outbound",
  };
  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(MAIL_HTTP_TIMEOUT_MS),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const parsed = (await res.json()) as { Message?: string };
      detail = parsed?.Message ? `: ${parsed.Message}` : "";
    } catch {
      /* non-JSON error body — keep the status only */
    }
    throw new MailError(
      "transport_error",
      `Postmark returned HTTP ${res.status}${detail}`,
    );
  }
  try {
    const parsed = (await res.json()) as { MessageID?: string };
    return parsed?.MessageID;
  } catch {
    return undefined;
  }
}

async function sendMailgun(input: SendMailInput, from: string): Promise<string | undefined> {
  const apiKey = env.mailgunApiKey().trim();
  const domain = env.mailgunDomain().trim();
  if (!apiKey || !domain) {
    throw new MailError(
      "invalid_config",
      "MAILGUN_API_KEY and MAILGUN_DOMAIN must both be configured",
    );
  }
  const replyTo = env.mailReplyTo().trim();
  const form = new URLSearchParams();
  form.set("from", from);
  form.set("to", input.to);
  form.set("subject", input.subject);
  form.set("html", input.html);
  form.set("text", input.text);
  if (replyTo) form.set("h:Reply-To", replyTo);
  const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      // Mailgun uses HTTP Basic auth with username "api" and the API key.
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
    signal: AbortSignal.timeout(MAIL_HTTP_TIMEOUT_MS),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const parsed = (await res.json()) as { message?: string };
      detail = parsed?.message ? `: ${parsed.message}` : "";
    } catch {
      /* non-JSON error body — keep the status only */
    }
    throw new MailError(
      "transport_error",
      `Mailgun returned HTTP ${res.status}${detail}`,
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
      "MAIL_PROVIDER=smtp is reserved but not implemented. Install nodemailer + @types/nodemailer and add a dynamic-import adapter (docs/email.md), or use MAIL_PROVIDER=resend|sendgrid|postmark|mailgun|webhook.",
    );
  }

  const from = mailFromHeader();
  if (!from) {
    throw new MailError("invalid_config", "MAIL_FROM is not configured");
  }

  try {
    let id: string | undefined;
    switch (provider) {
      case "resend":
        id = await sendResend(input, from);
        break;
      case "sendgrid":
        id = await sendSendGrid(input, from);
        break;
      case "postmark":
        id = await sendPostmark(input, from);
        break;
      case "mailgun":
        id = await sendMailgun(input, from);
        break;
      case "webhook":
        id = await sendWebhook(input, from);
        break;
      default:
        throw new MailError("invalid_config", `Unknown mail provider: ${provider}`);
    }
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
  opts: { dedupeKey?: string } = {},
): Promise<SendMailResult> {
  try {
    const sent = await sendMail(input);
    if (sent.delivered) return sent;
    // `MAIL_PROVIDER=none` is an explicit safe no-op, not an outage: it should
    // not fill the retry queue. Everything else is persisted for a retry.
    if (sent.reason?.startsWith("MAIL_PROVIDER=none")) return sent;
    throw new MailError("transport_error", sent.reason ?? "not delivered");
  } catch (err) {
    const code = err instanceof MailError ? err.code : "transport_error";
    logger.warn("transactional mail not delivered", {
      to: input.to,
      subject: input.subject,
      template: input.template ?? "custom",
      code,
      err: (err as Error).message,
    });
    let queued = false;
    try {
      // Dynamic import keeps this dispatcher free of a static Node-only
      // dependency (it is also read by generated customer builds' tooling).
      const { enqueueMail } = await import("./outbox");
      queued = await enqueueMail(input, { dedupeKey: opts.dedupeKey });
    } catch {
      /* storage unavailable — the log line above is the last resort */
    }
    return {
      delivered: false,
      provider: currentMailProvider(),
      reason: `${code}: ${(err as Error).message}`,
      queued,
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
