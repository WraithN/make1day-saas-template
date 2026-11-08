// Paid-order delivery: hand the license key to the buyer automatically.
//
// The key IS the product. A paid webhook issues it and this module emails it to
// the checkout address; a failed transport is persisted in the mail outbox and
// retried, so a mail outage never silently loses a customer's purchase.
//
// Node-only and site-only (pruned from every customer ZIP).

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { sendMailSafely } from "@/lib/mail";
import { buildMail } from "@/lib/mail/templates";
import { recordDeliveryEvent } from "@/lib/observability";
import type { LicenseRecord } from "@/lib/license";
import type { Lang } from "@/lib/i18n-core";

export function licenseRedeemUrl(): string {
  return `${env.siteUrl().replace(/\/+$/, "")}/license`;
}

/** Send (or durably queue) the license-key email for one issued license. */
export async function deliverLicenseKey(
  license: LicenseRecord,
  lang: Lang = "en",
): Promise<{ delivered: boolean; queued: boolean; reason?: string }> {
  if (!license.email) {
    logger.warn("license issued without a buyer email; automatic delivery skipped", {
      jti: license.jti,
      orderId: license.orderId ?? null,
    });
    return { delivered: false, queued: false, reason: "no_buyer_email" };
  }

  const mail = buildMail("licenseKey", lang, {
    email: license.email,
    licenseKey: license.key,
    plan: license.plan,
    link: licenseRedeemUrl(),
  });
  const result = await sendMailSafely(
    {
      to: license.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      template: "licenseKey",
      lang,
    },
    { dedupeKey: `license:${license.jti}` },
  );
  recordDeliveryEvent("key_email", {
    jti: license.jti,
    email: license.email,
  });
  return {
    delivered: result.delivered,
    queued: !!result.queued,
    ...(result.delivered ? {} : { reason: result.reason }),
  };
}
