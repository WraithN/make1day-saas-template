// ───────────────────────────────────────────────────────────────
// Order records — provider-agnostic purchase ledger.
//
// Written by the webhook route (service-role) when a paid event lands, and read
// by the admin console. Mirrors the license store: Supabase when configured,
// otherwise a local JSON file under .data/ so a template with no DB still
// renders an orders view. The order id never depends on either store, so a
// read-only filesystem cannot lock out the admin.
//
// Deliberately depends ONLY on modules that exist in every generated build
// (lib/env, lib/supabase/admin). It must never import a payment adapter.
// ───────────────────────────────────────────────────────────────

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

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

type StoreData = {
  orders: OrderRecord[];
};

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "orders.json");

async function readStore(): Promise<StoreData> {
  try {
    const parsed = JSON.parse(await fs.readFile(FILE, "utf8")) as StoreData;
    return { orders: parsed.orders ?? [] };
  } catch {
    return { orders: [] };
  }
}

async function writeStore(data: StoreData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(data), "utf8");
}

// Serialise read-modify-write so concurrent webhooks cannot lose an order.
const globals = globalThis as unknown as { __skOrderQueue?: Promise<unknown> };
async function withStore<T>(fn: (data: StoreData) => T | Promise<T>): Promise<T> {
  const prev = globals.__skOrderQueue ?? Promise.resolve();
  const run = prev.then(async () => {
    const data = await readStore();
    const result = await fn(data);
    await writeStore(data);
    return result;
  });
  globals.__skOrderQueue = run.catch(() => undefined);
  return run;
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
  await withStore((data) => {
    const idx = data.orders.findIndex(
      (o) =>
        o.provider === params.provider &&
        o.providerOrderId === params.providerOrderId,
    );
    const rec: OrderRecord = {
      id: idx >= 0 ? data.orders[idx].id : randomUUID(),
      provider: params.provider,
      providerOrderId: params.providerOrderId,
      email: params.email,
      plan: params.plan ?? null,
      amount: params.amount ?? null,
      currency: params.currency ?? null,
      status: params.status,
      createdAt: new Date().toISOString(),
    };
    if (idx >= 0) data.orders[idx] = rec;
    else data.orders.push(rec);
  });
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
  return withStore((data) => [...data.orders].reverse().slice(0, 100));
}

/** Whether the store is backed by Supabase (vs local .data file). */
export function ordersAreDurable(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
