import { NextResponse } from "next/server";
import { findLicenseByEmail } from "@/lib/license";
import { deliverLicenseKey } from "@/lib/license-delivery";
import { guardApiWrite, hashIdentity } from "@/lib/http-guard";
import { recordDeliveryEvent } from "@/lib/observability";
import { logger } from "@/lib/logger";
import type { Lang } from "@/lib/i18n-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LANGS = ["en", "zh", "ja", "fr", "de"];

/**
 * Re-send a license key to the CHECKOUT address. This closes the two gaps the
 * account console could not: guest checkout (no account at all) and a login
 * email that differs from the payment email.
 *
 * The response is intentionally identical whether or not a license exists —
 * otherwise this endpoint becomes an account/order enumeration oracle. The
 * key is only ever sent to an address that already holds a license.
 */
export async function POST(req: Request) {
  const guarded = await guardApiWrite(req, {
    bucket: "license-claim",
    limit: 5,
    windowMs: 3600_000,
  });
  if (guarded) return guarded;

  const body = await req.json().catch(() => ({}));
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const lang: Lang = LANGS.includes(body?.lang) ? body.lang : "en";

  if (!EMAIL_RE.test(email) || email.length > 320) {
    return NextResponse.json({ ok: true });
  }

  // A second bucket scoped to the requested address: one IP cannot probe many
  // addresses, and one address cannot be flooded from many IPs.
  const perAddress = await guardApiWrite(req, {
    bucket: "license-claim-address",
    limit: 3,
    windowMs: 3600_000,
    identity: hashIdentity(email),
  });
  if (perAddress) return perAddress;

  try {
    const license = await findLicenseByEmail(email);
    if (license) {
      await deliverLicenseKey(license, lang);
      recordDeliveryEvent("claim_mail", {
        jti: license.jti,
        email: license.email,
      });
    } else {
      logger.info("license claim for unknown address", {
        addressHash: hashIdentity(email),
      });
    }
  } catch (err) {
    // Still 200: a storage hiccup must not tell the caller anything.
    logger.warn("license claim lookup failed", {
      err: (err as Error).message,
    });
  }

  return NextResponse.json({ ok: true });
}
