// Durable transactional-mail outbox.
//
// A mail outage must never lose a paid customer's license key. Every failed
// send is stored and retried with exponential backoff by
// /api/cron/mail-outbox. `dedupeKey` is a UNIQUE column on both backends, so
// replaying the same webhook cannot enqueue a second copy of a key email.
//
// Storage follows the project's dual-backend rule: Supabase when a service
// role key is configured, local SQLite otherwise (migration 0011 defines the
// hosted tables). Node-only and site-only: pruned from every customer ZIP.

import { randomUUID } from "node:crypto";
import { all, get, run } from "@/lib/sqlite";
import { logger } from "@/lib/logger";
import type { SendMailInput } from "./types";

export const MAIL_MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 60_000;

type OutboxRow = {
  id: string;
  dedupe_key: string | null;
  recipient: string;
  subject: string;
  html: string;
  text_body: string;
  template: string | null;
  lang: string | null;
  status: string;
  attempts: number;
  next_attempt_at: string;
  last_error: string | null;
};

export type EnqueueOptions = {
  /** Stable id (e.g. `license:<jti>`). Re-enqueuing the same id is a no-op. */
  dedupeKey?: string;
  /** Start with no delay for interactive flows (claim emails). */
  immediate?: boolean;
};

function hasServiceRole(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function hostedDb(): Promise<any | null> {
  if (!hasServiceRole()) return null;
  try {
    const mod = await import("@/lib/supabase/admin");
    return mod.createSupabaseAdminClient();
  } catch {
    return null;
  }
}

/** Queue one message. Returns false when already queued or storage failed. */
export async function enqueueMail(
  input: SendMailInput,
  opts: EnqueueOptions = {},
): Promise<boolean> {
  const now = new Date().toISOString();
  const row = {
    id: randomUUID(),
    dedupe_key: opts.dedupeKey ?? null,
    recipient: input.to,
    subject: input.subject,
    html: input.html,
    text_body: input.text,
    template: input.template ?? null,
    lang: input.lang ?? null,
    status: "pending",
    attempts: 0,
    next_attempt_at: opts.immediate
      ? now
      : new Date(Date.now() + BASE_DELAY_MS).toISOString(),
    last_error: null,
    created_at: now,
    updated_at: now,
  };

  const hosted = await hostedDb();
  if (hosted) {
    try {
      const { error } = await hosted.from("mail_outbox").insert(row);
      if (!error) return true;
      if (String(error.code) === "23505") return false; // duplicate dedupe key
      logger.warn("hosted mail outbox insert fell back to local", {
        err: error.message,
      });
    } catch (err) {
      logger.warn("hosted mail outbox unavailable", {
        err: (err as Error).message,
      });
    }
  }

  try {
    const changes = run(
      `INSERT OR IGNORE INTO mail_outbox
       (id, dedupe_key, recipient, subject, html, text_body, template, lang,
        status, attempts, next_attempt_at, last_error, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      row.id,
      row.dedupe_key,
      row.recipient,
      row.subject,
      row.html,
      row.text_body,
      row.template,
      row.lang,
      row.status,
      row.attempts,
      row.next_attempt_at,
      row.last_error,
      row.created_at,
      row.updated_at,
    );
    return changes > 0;
  } catch (err) {
    logger.warn("mail outbox enqueue failed", {
      to: input.to,
      template: input.template ?? "custom",
      err: (err as Error).message,
    });
    return false;
  }
}

export type FlushResult = {
  due: number;
  sent: number;
  retried: number;
  dead: number;
};

function toInput(row: OutboxRow): SendMailInput {
  return {
    to: row.recipient,
    subject: row.subject,
    html: row.html,
    text: row.text_body,
    template: (row.template ?? undefined) as SendMailInput["template"],
    lang: (row.lang ?? undefined) as SendMailInput["lang"],
  };
}

/** Attempt every due message. Transport is imported lazily to avoid a cycle. */
export async function flushMailOutbox(limit = 20): Promise<FlushResult> {
  const result: FlushResult = { due: 0, sent: 0, retried: 0, dead: 0 };
  const nowIso = new Date().toISOString();
  const hosted = await hostedDb();
  let rows: OutboxRow[] = [];

  if (hosted) {
    try {
      const { data, error } = await hosted
        .from("mail_outbox")
        .select("*")
        .eq("status", "pending")
        .lte("next_attempt_at", nowIso)
        .order("created_at", { ascending: true })
        .limit(limit);
      if (!error && data) rows = data as OutboxRow[];
    } catch (err) {
      logger.warn("hosted mail outbox read failed", {
        err: (err as Error).message,
      });
    }
  }
  if (!hosted) {
    try {
      rows = all<OutboxRow>(
        `SELECT * FROM mail_outbox
         WHERE status = 'pending' AND next_attempt_at <= ?
         ORDER BY created_at ASC LIMIT ?`,
        nowIso,
        limit,
      );
    } catch (err) {
      logger.warn("mail outbox read failed", { err: (err as Error).message });
      return result;
    }
  }
  result.due = rows.length;
  if (!rows.length) return result;

  const { sendMail } = await import("./index");
  for (const row of rows) {
    const now = new Date().toISOString();
    let failure: string | null = null;
    try {
      const sent = await sendMail(toInput(row));
      if (!sent.delivered) {
        throw new Error(sent.reason ?? "transport reported delivered:false");
      }
    } catch (err) {
      failure = (err as Error).message.slice(0, 500);
    }

    const attempts = Number(row.attempts) + 1;
    if (!failure) {
      await updateOutbox(hosted, row.id, {
        status: "delivered",
        attempts,
        next_attempt_at: now,
        last_error: null,
        updated_at: now,
      });
      result.sent += 1;
      continue;
    }

    const exhausted = attempts >= MAIL_MAX_ATTEMPTS;
    const delay = Math.min(BASE_DELAY_MS * 2 ** (attempts - 1), 6 * 3600_000);
    await updateOutbox(hosted, row.id, {
      status: exhausted ? "dead" : "pending",
      attempts,
      next_attempt_at: new Date(Date.now() + delay).toISOString(),
      last_error: failure,
      updated_at: now,
    });
    if (exhausted) result.dead += 1;
    else result.retried += 1;
    logger.warn("mail outbox delivery attempt failed", {
      id: row.id,
      attempts,
      dead: exhausted,
      err: failure,
    });
  }
  return result;
}

async function updateOutbox(
  hosted: any | null,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  if (hosted) {
    try {
      const { error } = await hosted.from("mail_outbox").update(patch).eq("id", id);
      if (!error) return;
    } catch {
      /* fall through to local */
    }
  }
  try {
    run(
      `UPDATE mail_outbox SET status = ?, attempts = ?, next_attempt_at = ?,
       last_error = ?, updated_at = ? WHERE id = ?`,
      patch.status,
      patch.attempts,
      patch.next_attempt_at,
      patch.last_error,
      patch.updated_at,
      id,
    );
  } catch {
    /* storage unavailable — the log line is the last resort */
  }
}

/** Operator/debug view of the queue (never exposes the stored HTML body). */
export async function outboxStats(): Promise<{
  pending: number;
  dead: number;
  delivered: number;
  nextAttemptAt: string | null;
}> {
  const hosted = await hostedDb();
  if (hosted) {
    try {
      const counts: Record<string, number> = {};
      for (const status of ["pending", "dead", "delivered"]) {
        const { count } = await hosted
          .from("mail_outbox")
          .select("id", { count: "exact", head: true })
          .eq("status", status);
        counts[status] = Number(count ?? 0);
      }
      const { data } = await hosted
        .from("mail_outbox")
        .select("next_attempt_at")
        .eq("status", "pending")
        .order("next_attempt_at", { ascending: true })
        .limit(1);
      return {
        pending: counts.pending,
        dead: counts.dead,
        delivered: counts.delivered,
        nextAttemptAt: data?.[0]?.next_attempt_at ?? null,
      };
    } catch {
      /* fall through to local */
    }
  }
  const count = (status: string): number =>
    Number(
      get<{ n: number }>(
        "SELECT COUNT(*) AS n FROM mail_outbox WHERE status = ?",
        status,
      )?.n ?? 0,
    );
  const next = get<{ next_attempt_at: string }>(
    `SELECT MIN(next_attempt_at) AS next_attempt_at FROM mail_outbox
     WHERE status = 'pending'`,
  );
  return {
    pending: count("pending"),
    dead: count("dead"),
    delivered: count("delivered"),
    nextAttemptAt: next?.next_attempt_at ?? null,
  };
}
