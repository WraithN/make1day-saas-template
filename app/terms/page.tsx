import type { Metadata } from "next";
import Link from "next/link";
import { env } from "@/lib/env";

const PRODUCT = env.productName();
const ENTITY = env.legalEntity();
const LEGAL_EMAIL = env.legalEmail();
const SITE_URL = env.siteUrl();
const UPDATED = env.legalUpdatedAt();
const JURISDICTION = env.legalJurisdiction();

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms governing use of the ${PRODUCT} website and the generated project.`,
};

export default function TermsPage() {
  return (
    <section className="wrap max-w-3xl py-20">
      <div className="eyebrow mb-3">LEGAL</div>
      <h1 className="text-4xl font-semibold">Terms of Service</h1>
      <p className="mt-4 text-ink-soft">Last updated: {UPDATED}</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-ink-soft">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            1. Acceptance and parties
          </h2>
          <p>
            These terms govern your use of {SITE_URL} and the project-generation
            service operated by <strong className="text-ink">{ENTITY}</strong>
            {JURISDICTION ? ` (${JURISDICTION})` : ""}. By using the site or
            purchasing a generated project you agree to them. If you do not
            agree, do not use the service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            2. What you are buying
          </h2>
          <p>
            {PRODUCT} produces a Next.js project tailored to the options you
            select, and delivers it as a ZIP archive together with a signed
            license key. The charge is for that configured build and delivery
            service. A free preview contains a file inventory and design tokens
            only — no application source code. Full source downloads require a
            valid license, an active subscription, or an email that can be
            matched to a paid order.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            3. License to the generated code
          </h2>
          <p>
            The generated project ships with the repository&apos;s MIT{" "}
            <span className="font-mono">LICENSE</span> file. Under that license
            you may use, copy, modify and redistribute the code you receive,
            including commercially. Two limits are worth stating plainly: the
            generator, the builder UI and this product site are{" "}
            <strong className="text-ink">not part of the delivered ZIP</strong>
            , so one purchase does not include the ability to generate further
            copies for others; and the MIT license does not transfer ownership
            of the {PRODUCT} name, marks, or the content of this website.
          </p>
          <p className="mt-2">
            Third-party services you connect (payment providers, Supabase, AI
            providers, email delivery, hosting) are governed by their own terms
            and their own licences; we do not grant rights to them.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            4. Refunds
          </h2>
          <p>
            A one-time Buyout purchase may be refunded if you request it within
            14 days of purchase. Recurring Care payments are not refundable for
            the current period, but you can cancel future periods. To request a
            refund, contact <span className="font-mono">{LEGAL_EMAIL}</span>{" "}
            with the email address used at checkout.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            5. Acceptable use
          </h2>
          <p>
            You may not use the service to build unlawful products, infringe
            intellectual property, circumvent the download gate, abuse the
            preview or AI quotas, or misuse connected third-party services. We
            may rate-limit or suspend access to protect the service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            6. Availability and support
          </h2>
          <p>
            Generated projects are delivered as source code that you deploy and
            operate yourself. Support requests are handled through the support
            form or the contact address below; we do not guarantee a response
            time unless a separate Care agreement says otherwise.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            7. Disclaimers and liability
          </h2>
          <p>
            The software and generated projects are provided &ldquo;as is&rdquo;
            without warranty of any kind. You are responsible for reviewing,
            testing, securing and legally complying in any deployment you
            operate — including your own privacy notice, terms and tax
            obligations. To the maximum extent permitted by law, {ENTITY} is
            not liable for indirect, incidental or consequential damages arising
            from use of the site or generated code.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            8. Privacy and changes
          </h2>
          <p>
            How the site handles personal data is described in our{" "}
            <Link className="text-accent hover:underline" href="/privacy">
              Privacy Policy
            </Link>
            . We may update these terms as the product evolves; the
            &ldquo;Last updated&rdquo; date changes when we do.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            9. Contact
          </h2>
          <p>
            Questions about these terms or a refund request:{" "}
            <span className="font-mono">{LEGAL_EMAIL}</span>.
            <br />
            Operator: <strong className="text-ink">{ENTITY}</strong>.
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
