// ───────────────────────────────────────────────────────────────
// Order records — provider-agnostic purchase ledger.
//
// Written by the webhook route (service-role) when a paid event lands, and read
// by the admin console. Mirrors the license store: Supabase when configured,
// otherwise the local SQLite database under .data/ so a template with no DB
// still renders an orders view. The order id never depends on either store, so
// a read-only filesystem cannot lock out the admin.
//
// Deliberately depends ONLY on modules that exist in every generated build
// (lib/env, lib/supabase/admin, lib/sqlite). It must never import a payment
// adapter.
// ───────────────────────────────────────────────────────────────

import { randomUUID } from "node:crypto";
import { all, run } from "@/lib/sqlite";

export type OrderRecord = {
  id: string;
  provider: string; // stripe | creem | paypal | waffo
  providerOrderId: string;
  email?: string;
  plan?: string | null;
  amount?: number | null; // major units
  currency?: string | null;
  status: string; // active | canceled | past_due | refunded
  createdAt: string;
};

type OrderRow = {
  id: string;
  provider: string;
  provider_order_id: string;
  email: string | null;
  plan: string | null;
  amount: number | null;
  currency: string | null;
  status: string;
  created_at: string;
};

function rowToOrder(r: OrderRow): OrderRecord {
  return {
    id: r.id,
    provider: r.provider,
    providerOrderId: r.provider_order_id,
    email: r.email ?? undefined,
    plan: r.plan ?? undefined,
    amount: r.amount ?? null,
    currency: r.currency ?? null,
    status: r.status,
    createdAt: r.created_at,
  };
}

async function adminClient(): Promise<any | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null;
  }
  try {
    const mod = await import("@/lib/supabase/admin");
    return mod.createSupabaseAdminClient();
  } catch {
    return null;
  }
}

/** Upsert a purchase record. Idempotent on (provider, providerOrderId). */
export async function recordOrder(params: {
  provider: string;
  providerOrderId: string;
  email?: string;
  plan?: string | null;
  amount?: number | null;
  currency?: string | null;
  status: string;
}): Promise<void> {
  const db = await adminClient();
  if (db) {
    const { error } = await db.from("orders").upsert(
      {
        provider: params.provider,
        provider_order_id: params.providerOrderId,
        customer_email: params.email ?? null,
        plan: params.plan ?? null,
        amount: params.amount ?? null,
        currency: params.currency ?? null,
        status: params.status,
      },
      { onConflict: "provider,provider_order_id" },
    );
    if (!error) return;
    console.warn("order upsert fell back to local store:", error.message);
  }
  // Local SQLite fallback. The upsert is idempotent on
  // (provider, provider_order_id) exactly like the Supabase path above, so a
  // retried webhook can never create a duplicate row.
  run(
    `INSERT INTO orders
      (id, provider, provider_order_id, email, plan, amount, currency, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(provider, provider_order_id) DO UPDATE SET
       email = excluded.email,
       plan = excluded.plan,
       amount = excluded.amount,
       currency = excluded.currency,
       status = excluded.status,
       created_at = excluded.created_at`,
    randomUUID(),
    params.provider,
    params.providerOrderId,
    params.email ?? null,
    params.plan ?? null,
    params.amount ?? null,
    params.currency ?? null,
    params.status,
    new Date().toISOString(),
  );
}

/** Admin view: recent orders (newest first). */
export async function listOrders(): Promise<OrderRecord[]> {
  const db = await adminClient();
  if (db) {
    const { data } = await db
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) {
      return data.map((r: any) => ({
        id: r.id,
        provider: r.provider,
        providerOrderId: r.provider_order_id,
        email: r.customer_email ?? undefined,
        plan: r.plan ?? undefined,
        amount: r.amount ?? null,
        currency: r.currency ?? null,
        status: r.status,
        createdAt: r.created_at,
      }));
    }
  }
  return all<OrderRow>(
    "SELECT * FROM orders ORDER BY created_at DESC LIMIT 100",
  ).map(rowToOrder);
}

/** Whether the store is backed by Supabase (vs the local SQLite database). */
export function ordersAreDurable(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
