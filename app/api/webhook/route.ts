import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { deliverLicenseKey } from "@/lib/license-delivery";
import { getPaymentProviders } from "@/lib/payments";
import { env } from "@/lib/env";
import {
  issueLicense,
  recordWebhookEvent,
  type LicenseRecord,
} from "@/lib/license";
import { recordOrder } from "@/lib/orders";
import { recordConversion } from "@/lib/traffic";
import { logger } from "@/lib/logger";
import type { NormalizedSubEvent, PaymentProvider } from "@/lib/payments/types";

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
/** Some adapters only carry a user id. Resolve the checkout email so the
 *  license can still be delivered instead of waiting for operator support. */
async function resolveBuyerEmail(
  e: NormalizedSubEvent,
): Promise<string | undefined> {
  if (e.email) return e.email;
  if (!e.userId) return undefined;
  try {
    const admin = createSupabaseAdminClient() as unknown as {
      auth: { admin: { getUserById: (id: string) => Promise<{ data?: { user?: { email?: string } } }> } };
    };
    const { data } = await admin.auth.admin.getUserById(e.userId);
    return data?.user?.email ?? undefined;
  } catch {
    return undefined;
  }
}

async function grantLicense(
  e: NormalizedSubEvent,
): Promise<LicenseRecord | null> {
  if (!e.grantsAccess || !e.plan) return null;
  const email = await resolveBuyerEmail(e);
  if (!email && !e.userId) {
    throw new Error("Paid event has neither buyerEmail nor userId");
  }
  const plan = e.plan === "care" || e.plan === "scale" ? "care" : "buyout";
  return issueLicense({
    email,
    plan,
    orderId: e.orderId ?? e.subscriptionId,
    periodEnd: e.periodEnd,
  });
}

export async function POST(req: Request) {
  const providers = getPaymentProviders();
  const rawBody = await req.text();

  const headers: Record<string, string | undefined> = {};
  req.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  // Signature verification happens BEFORE any business logic (Waffo docs).
  // A gateway only verifies its own signatures, so try each enabled provider
  // until one accepts the payload; the rest throw and we move on.
  let provider: PaymentProvider | undefined;
  let events: NormalizedSubEvent[] | undefined;
  for (const candidate of providers) {
    if (candidate.name === "none") continue;
    try {
      events = await candidate.verifyWebhook(rawBody, headers);
      provider = candidate;
      break;
    } catch {
      // not this provider's payload — try the next enabled gateway
    }
  }
  if (!provider || !events) {
    return NextResponse.json(
      { error: "Webhook verification failed" },
      { status: 400 },
    );
  }

  const okBody = () =>
    env.waffoFlavor() === "acquiring" && provider!.name === "waffo"
      ? { message: "success" }
      : { received: true };

  if (events.length === 0) {
    return NextResponse.json({ ...okBody(), ignored: true });
  }

  // Providers that omit event ids still retry. Hash the verified raw body so
  // the replay of such an event is deduped instead of issuing a second key.
  const rawDigest = createHash("sha256").update(rawBody).digest("hex");

  try {
    for (const e of events) {
      // Waffo retries up to 4 times; dedupe on (eventType, eventId) so a
      // retry never issues a second license, sends a second key email or
      // double-provisions access. Missing ids fall back to the body digest —
      // the old `fresh = true` fallback let a replay mint unlimited keys.
      const fresh = await recordWebhookEvent(
        e.eventType ?? "event",
        e.eventId ?? `body:${rawDigest}`,
      );
      if (!fresh) continue;

      if (e.userId || e.email) {
        // Guest checkouts carry no metadata.userId; resolve the account by
        // the buyer email Creem collected on the hosted page so a Care
        // purchase still lands in the buyer's Billing. Unknown email (no
        // account yet) keeps the old skip-and-warn behaviour.
        let userId = e.userId;
        if (!userId && e.email) {
          try {
            const admin = createSupabaseAdminClient();
            const { data: byEmail } = await admin.auth.admin.getUserByEmail(
              e.email,
            );
            userId = byEmail?.user?.id ?? undefined;
          } catch {
            // auth admin API unavailable — fall through to the warn below.
          }
        }
        try {
          await upsertSubscription({
            provider: provider.name,
            userId: userId ?? "",
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

      // A paid order must reach the buyer without operator intervention.
      // Delivery failures are queued for retry, never swallowed here.
      const license = await grantLicense(e);
      if (license) {
        await deliverLicenseKey(license).catch((err) =>
          logger.warn("license delivery skipped", {
            jti: license.jti,
            err: (err as Error).message,
          }),
        );
      }

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
