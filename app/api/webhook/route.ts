import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments";
import { env } from "@/lib/env";
import {
  issueLicense,
  recordWebhookEvent,
  type LicenseRecord,
} from "@/lib/license";
import { recordOrder } from "@/lib/orders";
import { recordConversion } from "@/lib/traffic";
import { logger } from "@/lib/logger";
import type { NormalizedSubEvent } from "@/lib/payments/types";

export const runtime = "nodejs";

/** Upsert a subscription row when the event can be attributed to a user. */
async function upsertSubscription(params: {
  provider: string;
  userId: string;
  customerId: string;
  subscriptionId: string;
  status: string;
  plan?: string;
  periodEnd?: string | null;
}) {
  const admin = createSupabaseAdminClient();
  const { data: existing, error: lookupError } = await admin
    .from("subscriptions")
    .select("id, user_id")
    .eq("provider", params.provider)
    .eq("provider_subscription_id", params.subscriptionId)
    .maybeSingle();
  if (lookupError) throw new Error(`Subscription lookup failed: ${lookupError.message}`);

  const userId = params.userId || existing?.user_id;
  if (!userId) throw new Error("Webhook event cannot be attributed to a user");

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      provider: params.provider,
      provider_customer_id: params.customerId,
      provider_subscription_id: params.subscriptionId,
      status: params.status,
      plan: params.plan,
      current_period_end: params.periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider,provider_subscription_id" },
  );
  if (error) throw new Error(`Subscription upsert failed: ${error.message}`);
}

/**
 * A paid order grants a download license. The key is self-verifying, so it
 * works even when the buyer checked out without an account (Waffo Pancake
 * supports public checkout). The buyer can later auto-claim it by signing in
 * with the same email.
 */
async function grantLicense(
  e: NormalizedSubEvent,
): Promise<LicenseRecord | null> {
  if (!e.grantsAccess || !e.plan) return null;
  if (!e.email && !e.userId) {
    throw new Error("Paid event has neither buyerEmail nor userId");
  }
  const plan = e.plan === "care" || e.plan === "scale" ? "care" : "buyout";
  return issueLicense({
    email: e.email,
    plan,
    orderId: e.orderId ?? e.subscriptionId,
    periodEnd: e.periodEnd,
  });
}

export async function POST(req: Request) {
  const provider = getPaymentProvider();
  const rawBody = await req.text();

  const headers: Record<string, string | undefined> = {};
  req.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  // Signature verification happens BEFORE any business logic (Waffo docs).
  let events: NormalizedSubEvent[];
  try {
    events = await provider.verifyWebhook(rawBody, headers);
  } catch (err) {
    logger.error("webhook verification failed", {
      provider: provider.name,
      err: (err as Error).message,
    });
    return NextResponse.json({ error: "Webhook verification failed" }, { status: 400 });
  }

  const okBody = () =>
    env.waffoFlavor() === "acquiring" && provider.name === "waffo"
      ? { message: "success" }
      : { received: true };

  if (!events || events.length === 0) {
    return NextResponse.json({ ...okBody(), ignored: true });
  }

  try {
    for (const e of events) {
      // Waffo retries up to 4 times; dedupe on (eventType, eventId) so a
      // retry never issues a second license or double-provisions access.
      const fresh =
        !e.eventType || !e.eventId
          ? true
          : await recordWebhookEvent(e.eventType, e.eventId);
      if (!fresh) continue;

      if (e.userId) {
        try {
          await upsertSubscription({
            provider: provider.name,
            userId: e.userId,
            customerId: e.customerId,
            subscriptionId: e.subscriptionId,
            status: e.status,
            plan: e.plan,
            periodEnd: e.periodEnd,
          });
        } catch (err) {
          // A missing Supabase config must not swallow a paid order: the
          // license below is still issued and can be claimed later.
          logger.warn("subscription upsert skipped", {
            provider: provider.name,
            userId: e.userId,
            err: (err as Error).message,
          });
        }
      }

      await grantLicense(e);

      // Record a provider-agnostic order row for every event that carries a
      // plan. Idempotent on (provider, providerOrderId) so retries never
      // duplicate; status updates keep the order current.
      if (e.plan) {
        await recordOrder({
          provider: provider.name,
          providerOrderId: e.orderId ?? e.subscriptionId,
          email: e.email,
          plan: e.plan,
          amount: e.amount ?? null,
          currency: e.currency ?? null,
          status: e.status === "active" ? "active" : e.status,
        }).catch((err) =>
          logger.warn("order record skipped", { err: (err as Error).message }),
        );
      }

      // Funnel step "conversion". The webhook has no visitor cookie, so the
      // session is recovered from the checkout we recorded for this email.
      // Only a real paid event counts — a trial or a failed charge does not.
      if (e.grantsAccess && e.email) {
        await recordConversion(e.email, e.plan ?? "purchase").catch((err) =>
          logger.warn("conversion record skipped", {
            err: (err as Error).message,
          }),
        );
      }
    }
  } catch (err) {
    // 5xx → gateway retries; a paid order is never silently dropped.
    logger.error("webhook entitlement persistence failed", {
      provider: provider.name,
      err: (err as Error).message,
    });
    return NextResponse.json(
      { error: "Webhook persistence failed" },
      { status: 500 },
    );
  }

  return NextResponse.json(okBody());
}
