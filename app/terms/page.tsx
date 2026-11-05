import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing use of the ShipKit website and template.",
};

export default function TermsPage() {
  return (
    <section className="wrap max-w-3xl py-20">
      <div className="eyebrow mb-3">LEGAL</div>
      <h1 className="text-4xl font-semibold">Terms of Service</h1>
      <p className="mt-4 text-ink-soft">Last updated: 2026-11-05</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-ink-soft">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">1. Acceptance</h2>
          <p>
            By accessing this website you agree to these terms. ShipKit is
            provided “as is” as a starter template; your use of any project you
            generate is governed by the license bundled with that project.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            2. License &amp; ownership
          </h2>
          <p>
            The ShipKit source is released under its repository license. Uncorne
            retains rights to the ShipKit brand, name and marks. Third-party
            services you connect (Stripe, Supabase, OpenAI, etc.) are governed by
            their own terms.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            3. Acceptable use
          </h2>
          <p>
            You may not use ShipKit to build unlawful products, infringe
            intellectual property, or abuse connected third-party services.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            4. Disclaimers &amp; liability
          </h2>
          <p>
            The software is provided without warranty of any kind. In no event
            shall Uncorne be liable for indirect or consequential damages arising
            from its use. You are responsible for testing, securing and
            complying with law in any deployment you operate.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            5. Contact
          </h2>
          <p>
            Questions about these terms:{" "}
            <span className="font-mono">legal@uncorne.com</span>.
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
