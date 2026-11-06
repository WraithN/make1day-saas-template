// Support tickets — dual-backend persistence, mirroring lib/orders.ts and
// lib/ai-usage.ts:
//   * SUPABASE_SERVICE_ROLE_KEY configured → Supabase `support_tickets`
//     (supabase/migrations/0010_support_tickets.sql, RLS + service-role writes)
//   * otherwise                            → local SQLite `support_tickets`
//     table in lib/sqlite.ts SCHEMA.
//
// Writes ALWAYS use the service-role client (or SQLite directly); no client-
// side insert / update is possible, so a status change can only come from the
// operator-guarded PATCH route. This module is Node-only (node:crypto +
// node:sqlite) and must never be imported from client code.

import { randomUUID } from "node:crypto";
import { all, get, run } from "@/lib/sqlite";
import { logger } from "@/lib/logger";

export type TicketStatus = "open" | "answered" | "closed";
export const TICKET_STATUSES: TicketStatus[] = ["open", "answered", "closed"];

export type TicketRecord = {
  id: string;
  email: string;
  subject: string;
  message: string;
  status: TicketStatus;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
};

type TicketRow = {
  id: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

function hasServiceRole(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function rowToTicket(r: TicketRow): TicketRecord {
  return {
    id: String(r.id),
    email: r.email,
    subject: r.subject,
    message: r.message,
    status: (TICKET_STATUSES as string[]).includes(r.status)
      ? (r.status as TicketStatus)
      : "open",
    userId: r.user_id ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function adminClient(): Promise<any | null> {
  if (!hasServiceRole()) return null;
  try {
    const mod = await import("@/lib/supabase/admin");
    return mod.createSupabaseAdminClient();
  } catch (err) {
    logger.warn("support tickets: Supabase admin client unavailable", {
      err: (err as Error).message,
    });
    return null;
  }
}

/** Create a ticket. Returns the stored row (id is generated on the server). */
export async function createTicket(params: {
  email: string;
  subject: string;
  message: string;
  userId?: string | null;
}): Promise<TicketRecord> {
  const now = new Date().toISOString();
  const id = randomUUID();

  const db = await adminClient();
  if (db) {
    const { data, error } = await db
      .from("support_tickets")
      .insert({
        id,
        email: params.email,
        subject: params.subject,
        message: params.message,
        status: "open",
        user_id: params.userId ?? null,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();
    if (!error && data) return rowToTicket(data as TicketRow);
    logger.warn("support ticket insert failed on Supabase — using local SQLite", {
      err: error?.message,
    });
  }

  run(
    `INSERT INTO support_tickets
       (id, email, subject, message, status, user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'open', ?, ?, ?)`,
    id,
    params.email,
    params.subject,
    params.message,
    params.userId ?? null,
    now,
    now,
  );
  const row = get<TicketRow>("SELECT * FROM support_tickets WHERE id = ?", id);
  // The INSERT above is the authority; this fallback object keeps the return
  // type total even if a read-back ever fails on a read-only filesystem.
  return row
    ? rowToTicket(row)
    : {
        id,
        email: params.email,
        subject: params.subject,
        message: params.message,
        status: "open",
        userId: params.userId ?? null,
        createdAt: now,
        updatedAt: now,
      };
}

/**
 * List tickets. `operator: true` returns every row (service-role / full table
 * read); otherwise only rows owned by `userId` are returned. An anonymous
 * caller (no userId, not operator) gets an empty list — never someone else's
 * tickets.
 */
export async function listTickets(
  opts: { operator?: boolean; userId?: string | null } = {},
): Promise<TicketRecord[]> {
  const db = await adminClient();
  if (db) {
    let query = db
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!opts.operator) {
      if (!opts.userId) return [];
      query = query.eq("user_id", opts.userId);
    }
    const { data, error } = await query;
    if (!error && data) return (data as TicketRow[]).map(rowToTicket);
    logger.warn("support ticket list failed on Supabase — using local SQLite", {
      err: error?.message,
    });
  }

  if (opts.operator) {
    return all<TicketRow>(
      "SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 200",
    ).map(rowToTicket);
  }
  if (!opts.userId) return [];
  return all<TicketRow>(
    "SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC LIMIT 200",
    opts.userId,
  ).map(rowToTicket);
}

/** Operator-only status change. Returns the updated row, or null if not found. */
export async function updateTicketStatus(
  id: string,
  status: TicketStatus,
): Promise<TicketRecord | null> {
  const now = new Date().toISOString();

  const db = await adminClient();
  if (db) {
    const { data, error } = await db
      .from("support_tickets")
      .update({ status, updated_at: now })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (!error) return data ? rowToTicket(data as TicketRow) : null;
    logger.warn("support ticket status update failed on Supabase — using local SQLite", {
      err: error.message,
    });
  }

  const changes = run(
    "UPDATE support_tickets SET status = ?, updated_at = ? WHERE id = ?",
    status,
    now,
    id,
  );
  if (!changes) return null;
  const row = get<TicketRow>("SELECT * FROM support_tickets WHERE id = ?", id);
  return row ? rowToTicket(row) : null;
}

/** Whether tickets are backed by Supabase (vs the local SQLite file). */
export function ticketsAreDurable(): boolean {
  return hasServiceRole();
}
