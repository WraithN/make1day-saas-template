// Data-subject access / erasure for the operator site (GDPR-style rights).
//
// Works on both storage backends. Orders and issued license KEYS are kept for
// accounting and for the customer's existing access, but the email attached
// to them is replaced with an irreversible hash on erasure. The consent audit
// trail is append-only by design (it proves the erasure happened).
//
// Site-only: pruned from customer ZIPs. A customer must implement their own
// version against their own controller identity.

import { all, run } from "@/lib/sqlite";
import {
  hashSubject,
  recordConsentEvent,
  runDataRetention,
  type RetentionReport,
} from "@/lib/observability";

const POLICY = "privacy-v1";

async function hosted(): Promise<any | null> {
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

export type DataExport = {
  exportedAt: string;
  subject: string;
  backend: "supabase" | "sqlite";
  profile: unknown;
  licenses: unknown[];
  orders: unknown[];
  tickets: unknown[];
  consentEvents: unknown[];
  deliveryEvents: unknown[];
  queuedMail: unknown[];
  trafficEvents: unknown[];
};

export async function exportUserData(email: string): Promise<DataExport> {
  const subject = email.trim().toLowerCase();
  const digest = hashSubject(subject) ?? "";
  const db = await hosted();
  if (db) {
    const pick = async (table: string, column: string, value: string) => {
      const { data } = await db.from(table).select("*").eq(column, value);
      return data ?? [];
    };
    const [
      { data: profile },
      licenses,
      orders,
      tickets,
      consentEvents,
      deliveryEvents,
      queuedMail,
      trafficEvents,
    ] = await Promise.all([
      db.from("profiles").select("*").eq("email", subject).maybeSingle(),
      pick("licenses", "email", subject),
      pick("orders", "email", subject),
      pick("support_tickets", "email", subject),
      pick("consent_events", "subject", digest),
      pick("delivery_events", "email_hash", digest),
      pick("mail_outbox", "recipient", subject),
      pick("traffic_events", "email", subject),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      subject,
      backend: "supabase",
      profile: profile ?? null,
      licenses,
      orders,
      tickets,
      consentEvents,
      deliveryEvents,
      queuedMail,
      trafficEvents,
    };
  }
  return {
    exportedAt: new Date().toISOString(),
    subject,
    backend: "sqlite",
    profile:
      all("SELECT * FROM profiles WHERE email = ?", subject)[0] ?? null,
    licenses: all("SELECT * FROM licenses WHERE email = ?", subject),
    orders: all("SELECT * FROM orders WHERE email = ?", subject),
    tickets: all("SELECT * FROM support_tickets WHERE email = ?", subject),
    consentEvents: all(
      "SELECT * FROM consent_events WHERE subject = ?",
      digest,
    ),
    deliveryEvents: all(
      "SELECT * FROM delivery_events WHERE email_hash = ?",
      digest,
    ),
    queuedMail: all(
      "SELECT * FROM mail_outbox WHERE lower(recipient) = ?",
      subject,
    ),
    trafficEvents: all(
      "SELECT * FROM traffic_events WHERE lower(email) = ?",
      subject,
    ),
  };
}

/** Irreversibly anonymise an address while keeping financial records. */
export async function eraseUserData(
  email: string,
): Promise<{ erased: boolean; backend: "supabase" | "sqlite" }> {
  const subject = email.trim().toLowerCase();
  const tombstone = `erased+${hashSubject(subject)?.slice(0, 24)}@invalid.example`;
  const db = await hosted();
  if (db) {
    await db.from("profiles").delete().eq("email", subject);
    await db.from("support_tickets").delete().eq("email", subject);
    // Queued mail contains the plaintext address AND the message body. An
    // erasure request must cancel it, including still-pending license mail.
    await db.from("mail_outbox").delete().eq("recipient", subject);
    await db.from("password_resets").delete().eq("email", subject);
    await db.from("email_verifications").delete().eq("email", subject);
    // Keep the anonymous funnel counts but drop the identifying address.
    await db.from("traffic_events").update({ email: null }).eq("email", subject);
    await db.from("licenses").update({ email: tombstone }).eq("email", subject);
    await db.from("orders").update({ email: tombstone }).eq("email", subject);
    recordConsentEvent(subject, "erase", POLICY, "supabase");
    return { erased: true, backend: "supabase" };
  }
  run("DELETE FROM profiles WHERE email = ?", subject);
  run("DELETE FROM support_tickets WHERE email = ?", subject);
  run("DELETE FROM password_resets WHERE email = ?", subject);
  run("DELETE FROM email_verifications WHERE email = ?", subject);
  run("DELETE FROM local_sessions WHERE email = ?", subject);
  run("DELETE FROM mail_outbox WHERE lower(recipient) = ?", subject);
  run("UPDATE traffic_events SET email = NULL WHERE lower(email) = ?", subject);
  run("UPDATE licenses SET email = ? WHERE email = ?", tombstone, subject);
  run("UPDATE orders SET email = ? WHERE email = ?", tombstone, subject);
  recordConsentEvent(subject, "erase", POLICY, "sqlite");
  return { erased: true, backend: "sqlite" };
}

export function runRetention(days = 90): RetentionReport {
  return runDataRetention(days);
}
