// Mail configuration resolution + the secret-free status object used by
// GET /api/mail/self-check. Never returns a key, token or full webhook URL.

import {
  env,
  mailMissingVars,
  mailRequiredVars,
} from "@/lib/env";
import { logger } from "@/lib/logger";
import type { MailProvider } from "./types";

const IMPLEMENTED: MailProvider[] = ["resend", "webhook", "none"];

/** Resolve MAIL_PROVIDER; an unknown value degrades to the safe "none" mode. */
export function currentMailProvider(): MailProvider {
  const raw = env.mailProvider();
  if (raw === "resend" || raw === "webhook" || raw === "smtp" || raw === "none") {
    return raw;
  }
  if (raw) {
    logger.warn("unknown MAIL_PROVIDER — degrading to none", { value: raw });
  }
  return "none";
}

/** Outbound From header, e.g. `ShipKit <no-reply@example.com>`. */
export function mailFromHeader(): string {
  const address = env.mailFrom().trim();
  const name = env.mailFromName().trim();
  if (!address) return "";
  return name ? `${name} <${address}>` : address;
}

/** Timeout for a single outbound HTTP call (Resend / webhook). */
export const MAIL_HTTP_TIMEOUT_MS = 10_000;

export type MailConfigStatus = {
  provider: MailProvider;
  /** resend / webhook / none are implemented; smtp is a reserved value. */
  implemented: boolean;
  /** All required vars present AND the provider is really implemented. */
  ready: boolean;
  /** Red-flag reasons for the operator console / self-check. */
  warnings: string[];
  requiredEnvVars: string[];
  missingEnvVars: string[];
  flags: {
    fromConfigured: boolean;
    replyToConfigured: boolean;
    operatorEmailConfigured: boolean;
    webhookUrlConfigured: boolean;
    tokenTtlHours: number;
  };
  /** Set when the provider is "none": every send is a logged no-op. */
  degraded: boolean;
};

/**
 * Configuration state ONLY. No secret values, no API keys, no webhook URLs —
 * just booleans and the NAMES of missing env vars.
 */
export function mailConfigStatus(): MailConfigStatus {
  const provider = currentMailProvider();
  const implemented = IMPLEMENTED.includes(provider);
  const requiredEnvVars = mailRequiredVars(provider);
  const missingEnvVars = mailMissingVars(provider);
  const warnings: string[] = [];

  if (provider === "none") {
    warnings.push(
      "MAIL_PROVIDER=none — no email is delivered; every send is logged only. Verification, password reset and ticket notifications will NOT reach anyone.",
    );
  }
  if (provider === "smtp") {
    warnings.push(
      "MAIL_PROVIDER=smtp is reserved but NOT IMPLEMENTED: this repo has no nodemailer dependency. Install nodemailer + @types/nodemailer and add a dynamic-import adapter yourself (docs/email.md).",
    );
  }
  for (const name of missingEnvVars) {
    warnings.push(`Missing ${name}`);
  }

  return {
    provider,
    implemented,
    ready: implemented && provider !== "none" && missingEnvVars.length === 0,
    warnings,
    requiredEnvVars,
    missingEnvVars,
    flags: {
      fromConfigured: !!env.mailFrom().trim(),
      replyToConfigured: !!env.mailReplyTo().trim(),
      operatorEmailConfigured: !!env.mailOperatorEmail().trim(),
      webhookUrlConfigured: !!env.mailWebhookUrl().trim(),
      tokenTtlHours: env.mailTokenTtlHours(),
    },
    degraded: provider === "none" || !implemented,
  };
}
