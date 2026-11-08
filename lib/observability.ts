// Local, structured audit trail + retention job.
//
// Complements lib/logger.ts (stdout) with queryable records:
//   error_events     — server/client errors, even without an external sink
//   consent_events   — privacy-policy acceptance / withdrawal / export / erase
//   delivery_events  — license download / activation / re-send (email hashed)
//   runDataRetention — the scheduled deletion job behind /api/cron/retention
//
// Tables are defined in lib/sqlite.ts and migration 0011 (both backends use
// the same column names). Node-only; ships in customer projects so they can
// offer the same data-rights endpoints.

import { createHash, randomUUID } from "node:crypto";
import { run } from "@/lib/sqlite";
import { forwardToSink } from "@/lib/error-sink";

export function hashSubject(value: string | undefined): string | null {
  if (!value) return null;
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function insert(table: string, columns: string[], values: unknown[]): void {
  try {
    run(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns
        .map(() => "?")
        .join(", ")})`,
      ...values,
    );
  } catch {
    /* audit logging must never break a primary action */
  }
}

/** Persist a server-side error and forward it to the optional external sink. */
export function recordErrorEvent(
  level: string,
  message: string,
  context?: Record<string, unknown>,
): void {
  const now = new Date().toISOString();
  insert(
    "error_events",
    ["id", "level", "message", "context", "created_at"],
    [
      randomUUID(),
      level,
      message.slice(0, 500),
      context ? JSON.stringify(context).slice(0, 2000) : null,
      now,
    ],
  );
  forwardToSink({ ts: now, level, msg: message, ...(context ?? {}) });
}

/** Append-only consent audit trail. `subject` is a hashed id, never raw PII. */
export function recordConsentEvent(
  subject: string,
  kind: "accept" | "withdraw" | "export" | "erase" | "policy_view",
  policy: string,
  detail?: string,
): void {
  insert(
    "consent_events",
    ["id", "subject", "kind", "policy", "detail", "created_at"],
    [
      randomUUID(),
      hashSubject(subject) ?? subject,
      kind,
      policy,
      detail?.slice(0, 500) ?? null,
      new Date().toISOString(),
    ],
  );
}

/** Log a license download / activation without storing an IP or email. */
export function recordDeliveryEvent(
  kind: "download" | "activate" | "claim_mail" | "key_email",
  opts: { jti?: string; email?: string } = {},
): void {
  insert(
    "delivery_events",
    ["id", "jti", "email_hash", "kind", "created_at"],
    [
      randomUUID(),
      opts.jti ?? null,
      hashSubject(opts.email),
      kind,
      new Date().toISOString(),
    ],
  );
}

export type RetentionReport = {
  cutoff: string;
  deleted: Record<string, number>;
};

/**
 * Delete records older than `days`. Financial order rows and issued license
 * keys are intentionally KEPT (tax/accounting and existing customer access);
 * everything else has a bounded lifetime. Returns per-table counts so an
 * operator can prove the job ran.
 */
export function runDataRetention(days = 90): RetentionReport {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const dayCutoff = cutoff.slice(0, 10);
  const deleted: Record<string, number> = {};
  const purge = (table: string, column: string, value: string) => {
    try {
      deleted[table] = (deleted[table] ?? 0) + run(
        `DELETE FROM ${table} WHERE ${column} < ?`,
        value,
      );
    } catch {
      deleted[table] = deleted[table] ?? 0;
    }
  };

  purge("traffic_events", "created_at", cutoff);
  purge("error_events", "created_at", cutoff);
  purge("consent_events", "created_at", cutoff);
  purge("delivery_events", "created_at", cutoff);
  purge("password_resets", "created_at", cutoff);
  purge("email_verifications", "created_at", cutoff);
  purge("local_sessions", "expires_at", new Date().toISOString());
  purge("admin_sessions", "expires_at", new Date().toISOString());
  purge("quota", "day", dayCutoff);
  purge("rate_limits", "updated_at", cutoff);
  // Delivered/dead mail is retained only for the audit window; pending mail
  // must never be deleted (a customer could still be waiting for their key).
  try {
    deleted.mail_outbox = run(
      "DELETE FROM mail_outbox WHERE status != 'pending' AND created_at < ?",
      cutoff,
    );
  } catch {
    deleted.mail_outbox = 0;
  }
  return { cutoff, deleted };
}
