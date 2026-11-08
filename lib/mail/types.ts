// Shared types for the transactional mail layer. No runtime dependencies so
// this file is safe to import from any server module.

import type { Lang } from "@/lib/i18n-core";

/**
 * The configured mail provider.
 *   resend  — Resend REST API (implemented, zero dependencies).
 *   webhook — custom HTTP mailer (implemented, configurable URL + bearer token).
 *   none    — safe no-op (implemented).
 *   smtp    — RESERVED, NOT IMPLEMENTED. Kept as a recognised value so a
 *             deployment can declare its intent without us pretending it
 *             works; sendMail throws MailError("smtp_not_implemented").
 *             See docs/email.md.
 */
export type MailProvider = "resend" | "webhook" | "smtp" | "none";

/** Template identifiers handled by lib/mail/templates.ts. */
export type MailTemplate =
  | "verify"
  | "reset"
  | "ticketUser"
  | "ticketOperator"
  | "licenseKey";

export type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Optional explicit from / reply-to overrides. */
  from?: string;
  replyTo?: string;
  /** Template name, carried into logs only (never into an outbound header). */
  template?: MailTemplate;
  /** Language used to render the template, for log correlation. */
  lang?: Lang;
};

export type SendMailResult = {
  /** Whether an email was actually handed to a transport. */
  delivered: boolean;
  provider: MailProvider;
  /** Provider-side message id when the transport returned one. */
  id?: string;
  /** Human-readable reason when delivered=false (never a secret). */
  reason?: string;
  /** True when the message was persisted to the retry outbox instead. */
  queued?: boolean;
};

export type MailErrorCode =
  | "invalid_config"
  | "invalid_recipient"
  | "transport_error"
  | "smtp_not_implemented";

/** A typed error so callers can degrade gracefully and log a stable code. */
export class MailError extends Error {
  readonly code: MailErrorCode;
  constructor(code: MailErrorCode, message: string) {
    super(message);
    this.name = "MailError";
    this.code = code;
  }
}

export type RenderedMail = {
  subject: string;
  html: string;
  text: string;
};
