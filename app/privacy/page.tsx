import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How ShipKit (by Uncorne) handles your data, cookies and privacy choices.",
};

export default function PrivacyPage() {
  return (
    <section className="wrap max-w-3xl py-20">
      <div className="eyebrow mb-3">LEGAL</div>
      <h1 className="text-4xl font-semibold">Privacy Policy</h1>
      <p className="mt-4 text-ink-soft">Last updated: 2026-11-05</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-ink-soft">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            1. Overview
          </h2>
          <p>
            ShipKit is an open AI SaaS starter template published by Uncorne.
            This policy explains what data this website collects, how it is used,
            and the choices you have. If you deploy a project generated from
            ShipKit, you — not Uncorne — are the data controller for that
            deployment and are responsible for its own privacy notice.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            2. Data we collect
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-ink">Cookies &amp; local storage:</strong>{" "}
              we store your language and theme preferences, and a cookie-consent
              choice, entirely in your browser. None of this is sent to Uncorne
              servers.
            </li>
            <li>
              <strong className="text-ink">Analytics:</strong> if analytics are
              enabled, we process aggregate, non-identifying traffic data to
              understand usage. No advertising or cross-site tracking pixels are
              loaded until you accept.
            </li>
            <li>
              <strong className="text-ink">Account data:</strong> if you configure
              Supabase and create an account, your email and subscription state
              are stored in your own Supabase project, not by Uncorne.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            3. Cookies
          </h2>
          <p>
            We use strictly necessary cookies for language/theme memory and
            optional analytics cookies only after you consent via the banner.
            You can clear these at any time in your browser settings.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            4. Your rights
          </h2>
          <p>
            Depending on your jurisdiction (GDPR, CCPA, etc.), you may have
            rights to access, correct or delete personal data. Because this site
            stores preference data only in your browser, you can exercise most
            rights by clearing local storage. For anything else, contact{" "}
            <span className="font-mono">privacy@uncorne.com</span>.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            5. Changes
          </h2>
          <p>
            We may update this policy as the product evolves. Material changes
            will be reflected by the “Last updated” date above.
          </p>
        </section>

        <p className="pt-4">
          <Link href="/" className="text-accent hover:underline">
            ← Back home
          </Link>
        </p>
      </div>
    </section>
  );
}
