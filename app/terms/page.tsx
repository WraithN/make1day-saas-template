import type { Metadata } from "next";
import { getCanonicalLang } from "@/lib/i18n-server";
import { langAlternatePaths, variantCanonical } from "@/lib/seo-alternates";
import Link from "next/link";
import { env } from "@/lib/env";
import { paymentProviderLabel } from "@/lib/payments";

const PRODUCT = env.productName();
const ENTITY = env.legalEntity();
const CONTACT_EMAIL = env.contactEmail();
const LEGAL_EMAIL = env.legalEmail();
const SITE_URL = env.siteUrl();
const UPDATED = env.legalUpdatedAt();
const JURISDICTION = env.legalJurisdiction() || "the operator's registered jurisdiction";
const ADDRESS = env.legalAddress();
const MOR = paymentProviderLabel(); // the configured Merchant of Record, e.g. "Waffo Pancake"

export async function generateMetadata(): Promise<Metadata> {
  const canonical = variantCanonical("/terms", await getCanonicalLang());
  return {
    alternates: {
      canonical,
      languages: langAlternatePaths("/terms"),
    },
    openGraph: { url: canonical },
    title: "Terms of Service",
    description: `The terms governing use of the ${PRODUCT} website and the generated project.`,
  };
}

export default function TermsPage() {
  return (
    <section className="wrap max-w-3xl py-20">
      <div className="eyebrow mb-3">LEGAL</div>
      <h1 className="text-4xl font-semibold">Terms of Service — {ENTITY}</h1>
      <p className="mt-4 text-ink-soft">
        Version 2.0 · Last updated: {UPDATED} · Effective on posting; continued
        use constitutes acceptance.
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-ink-soft">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            1. Introduction &amp; acceptance of terms
          </h2>
          <p>
            Welcome to {ENTITY} (&ldquo;we&rdquo; / &ldquo;us&rdquo;),
            {JURISDICTION ? ` operating under the laws of ${JURISDICTION},` : ""}{" "}
            the operator of {SITE_URL}. These Terms of Service (&ldquo;Terms&rdquo;)
            govern your access to and use of our service: a generator that
            produces a configurable Next.js SaaS starter project delivered as a
            source ZIP, together with the AI features of this website (an
            assistant chat and document Q&amp;A), and any subscription plan you
            purchase (the &ldquo;Service&rdquo;).
          </p>
          <p className="mt-2">
            By creating an account, purchasing a license, subscribing to a plan
            or otherwise using the Service you confirm that you: (a) are at
            least 18 years of age; (b) have read, understood and agree to be
            bound by these Terms; (c) agree to our{" "}
            <Link className="text-accent hover:underline" href="/privacy">
              Privacy Policy
            </Link>
            ; and (d) are authorised to enter into this agreement on behalf of
            yourself or any organisation you represent. If you do not agree, do
            not use the Service. Continued use after an update constitutes
            acceptance of the revised Terms.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            2. What the Service is
          </h2>
          <p>
            {PRODUCT} is a digital software-as-a-service product. You select the
            modules, payment gateway, AI providers, features and visual style
            you want; the generator returns a compilable Next.js project as a
            ZIP archive together with a signed license key, delivered
            immediately on confirmed payment. Because delivery is instant and
            the product is an intangible digital good, refunds are subject to
            the specific limits in section 7.
          </p>
          <p className="mt-2">
            The Service relies on third-party AI model providers wherever its
            assistant or RAG features are enabled. On this store those hosted
            surfaces are currently switched off — the AI capability is part of
            the source you receive and runs on providers you configure
            (OpenAI, Anthropic, Google Gemini, OpenRouter, DeepSeek or Groq,
            as configured). Capability and availability may be affected by
            those providers&apos; operational status; we notify users of major
            disruptions.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            3. Accounts
          </h2>
          <p>
            Purchasing works with or without an account (the license key can be
            claimed with the email used at checkout). Where you create an
            account you must provide accurate, complete information, keep your
            credentials confidential and are responsible for all activity under
            your account. Report unauthorised use immediately to{" "}
            <span className="font-mono">{CONTACT_EMAIL}</span>. Do not share
            credentials, and keep your billing email address valid — purchase
            receipts, license keys and renewal notices go there. If you register
            on behalf of an organisation you represent that you are authorised
            to bind it.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            4. Plans: one-time license and Care subscription
          </h2>
          <p>
            The Buyout plan is a one-time payment delivering the full configured
            source ZIP plus a perpetual single-project license and 12 months of
            free updates. The Care plan is a monthly subscription delivering
            ongoing template and module drops, monthly-regenerated agent
            documentation, upstream merge patches and priority support for as
            long as it stays active. Current plans and prices are listed at{" "}
            <Link className="text-accent hover:underline" href="/pricing">
              /pricing
            </Link>
            . We may modify plan features or introduce new plans; price changes
            follow section 5.1.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            5. Billing &amp; payment
          </h2>
          <p>
            <strong className="text-ink">5.1 Auto-renewal authorisation.</strong>{" "}
            By providing your payment method and subscribing to Care, you
            expressly authorise {ENTITY} to charge the displayed subscription
            fee to that payment method at the start of each billing period
            (monthly), until you cancel under section 6. Your subscription
            renews automatically at the end of each period unless cancelled;
            price changes to a plan are announced at least 14 days before they
            apply to your renewals.
          </p>
          <p className="mt-2">
            <strong className="text-ink">5.2 Payment processing &amp; taxes.</strong>{" "}
            Checkout is hosted by our Merchant of Record, {MOR}, which is the
            seller of record and processes all card data under PCI-DSS — we
            never receive or store your card number. {MOR} calculates, collects
            and remits applicable VAT/GST/sales tax for your jurisdiction at
            checkout; displayed prices are exclusive of any such tax unless the
            checkout shows otherwise.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            6. Cancelling your subscription
          </h2>
          <p>
            <strong className="text-ink">6.1 How to cancel.</strong> Online
            (recommended): sign in, open <em>Account → Billing</em> and click
            <em> Manage subscription</em> — you are sent into {MOR}&apos;s
            customer self-service portal where you can cancel instantly without
            email or waiting. Alternatively, write to{" "}
            <span className="font-mono">{CONTACT_EMAIL}</span> from your
            billing email and we will process the cancellation and send a
            confirmation the same business day.
          </p>
          <p className="mt-2">
            <strong className="text-ink">6.2 Effect of cancelling.</strong>{" "}
            Cancellation stops all future renewals immediately. The current
            paid period stays available until its end. Your account and records
            are then retained for 90 days before deletion under the Privacy
            Policy, except the order and license rows required for accounting
            and for the perpetual Buyout license you already own.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            7. Refund policy
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-ink">14-day money-back guarantee</strong>{" "}
              on the one-time Buyout purchase: request a refund within 14 days
              of payment for any reason.
            </li>
            <li>
              <strong className="text-ink">First Care charge:</strong> if you
              cancel within 14 days of your first subscription payment and have
              used no more than a minor share of the period&apos;s deliveries,
              we refund it in full. Later periods are not refundable, but you
              can cancel at any time under section 6 to stop future charges.
            </li>
            <li>
              <strong className="text-ink">Duplicate charges:</strong> any
              double-billed amount is refunded in full.
            </li>
            <li>
              <strong className="text-ink">Verified outages:</strong> a
              merchant-caused disruption of the paid generation service
              exceeding 72 continuous hours entitles you to a proportional
              refund or a period extension.
            </li>
            <li>
              <strong className="text-ink">Statutory rights preserved:</strong>{" "}
              where applicable law gives you a withdrawal or refund right (e.g.
              the EU/UK 14-day cooling-off period), that right is not limited by
              this section; note that the early delivery of digital content
              waives the withdrawal right once you have downloaded the ZIP.
            </li>
            <li>
              <strong className="text-ink">Not refundable:</strong> accounts
              closed for violating these Terms or the Acceptable Use Policy.
            </li>
          </ul>
          <p className="mt-2">
            To request a refund, email{" "}
            <span className="font-mono">{LEGAL_EMAIL}</span> with your checkout
            email, the transaction ID and the reason. We acknowledge within 2
            business days and process approved refunds to the original payment
            method within 5–10 business days (refund timing after that depends
            on your bank).
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            8. Billing disputes
          </h2>
          <p>
            If you believe a charge is wrong, contact{" "}
            <span className="font-mono">{LEGAL_EMAIL}</span> before opening a
            dispute with your bank. We answer within 2 business days and resolve
            confirmed billing errors within 5 business days.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            9. Generated code, AI content &amp; intellectual property
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              The project ZIP you receive ships under the MIT{" "}
              <span className="font-mono">LICENSE</span> file included in it:
              you may use, copy, modify and deploy the code you receive,
              including commercially in products you own and operate.
            </li>
            <li>
              The generator, the builder UI and this website are not part of the
              delivered ZIP, and you may not resell, sublicense or
              redistribute the source — modified or unmodified — as a competing
              boilerplate, starter kit or template for sale.
            </li>
            <li>
              Outputs of the site&apos;s AI assistant (text answers) belong to
              you for lawful uses permitted by section 10. By submitting input
              you grant us a limited, non-exclusive licence to process it
              solely to provide the feature. <strong className="text-ink">
              We do not use your inputs to train AI models</strong> without
              your explicit consent.
            </li>
            <li>
              AI output may contain errors; review before relying on it. Third
              party services connected to your generated project (payment
              providers, databases, AI APIs, email, hosting) are governed by
              their own terms; we grant no rights in them. The {PRODUCT} name
              and marks are not licensed to you.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            10. Acceptable use
          </h2>
          <p>
            Our full Acceptable Use Policy is published at{" "}
            <Link className="text-accent hover:underline" href="/acceptable-use">
              /acceptable-use
            </Link>
            ; in summary, you agree you will NOT use the Service to: generate,
            transmit or store pornography/NSFW material; violence or gore
            content; hate speech; any content involving the sexual exploitation
            or abuse of minors (CSAM — reported to the authorities without
            exception); deepfakes or impersonation of real people (including
            face-swaps of real persons, &ldquo;nudify&rdquo; outputs, fabricated
            intimate scenes and putting real people in invented scenes or
            statements); or content infringing third-party copyrights,
            trademarks or privacy rights. You will not use the Service to create
            malware, phishing or attack tooling; to circumvent the download
            gate, preview or AI quotas; to resell or sublease access without
            written approval; to train AI or ML models that compete with our
            products using the assistant&apos;s outputs; to mass-scrape model
            outputs beyond your licensed use; to present AI output as the work
            of a licensed professional where harm could result; or to violate
            applicable law or card-network rules.
          </p>
          <p className="mt-2">
            <strong className="text-ink">Enforcement:</strong> violations lead
            to prompt blocking (automated screening of every prompt before any
            model call — see the integration map in the AUP), suspension or
            termination of access, forfeiture of unpaid plan periods and, for
            child-safety matters, mandatory reporting. Enforcement is carried
            out by the operator and recorded.
            <br />
            <strong className="text-ink">Reporting:</strong> if you encounter
            violating content or misuse, email{" "}
            <span className="font-mono">{CONTACT_EMAIL}</span> (subject line
            &ldquo;report&rdquo;). Reports receive a first response within 2
            business days; content violations we confirm are acted on within 5.
            Users can appeal an enforcement decision to the same address and a
            human reviews the case.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            11. Data, privacy &amp; security
          </h2>
          <p>
            Your use of the Service is governed by our Privacy Policy at{" "}
            <Link className="text-accent hover:underline" href="/privacy">
              {SITE_URL.replace(/^https?:\/\//, "")}/privacy
            </Link>
            . Payment card data is handled exclusively by our PCI-DSS Merchant
            of Record ({MOR}) and is never stored on our servers. Account data
            is deleted or anonymised 90 days after cancellation, subject to the
            accounting records described there.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            12. Disclaimers &amp; liability limits
          </h2>
          <p>
            12.1 The Service and all generated projects are provided{" "}
            <em>&ldquo;as is&rdquo;</em> and <em>&ldquo;as available&rdquo;</em>{" "}
            without warranties of any kind, express or implied, including
            merchantability, fitness for a particular purpose and accuracy of
            AI output. You are responsible for reviewing, testing, securing and
            legally complying any deployment you operate — including publishing
            your own privacy notice, terms and tax filings.
          </p>
          <p className="mt-2">
            12.2 <strong className="text-ink">AI-generated content is not
            professional advice.</strong> Never rely on assistant output for
            legal, medical, financial or other regulated decisions; verify with
            a qualified professional before acting.
          </p>
          <p className="mt-2">
            12.3 To the maximum extent permitted by law, {ENTITY} is not liable
            for indirect, incidental, consequential, punitive or special
            damages. Our total aggregate liability for any claim is limited to
            the amount you paid us in the 12 months preceding the event giving
            rise to the claim. Nothing in these Terms excludes liability that
            cannot be excluded by law (e.g. fraud or wilful misconduct).
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            13. Term &amp; termination
          </h2>
          <p>
            These Terms apply while you use the Service. We may suspend or
            terminate access for material breach, fraud or where legally
            required, with notice by email where practicable. Perpetual Buyout
            licenses already delivered survive termination of these Terms unless
            revoked for AUP violation. If we terminate the Service for reasons
            not caused by you, unused prepaid periods are refunded
            proportionally. You may end your account at any time by requesting
            deletion via <span className="font-mono">{CONTACT_EMAIL}</span> (see
            Privacy Policy §9).
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            14. Governing law &amp; disputes
          </h2>
          <p>
            These Terms are governed by the laws of {JURISDICTION}. Before
            formal proceedings,
            please try to resolve the matter informally by writing to{" "}
            <span className="font-mono">{LEGAL_EMAIL}</span>. Nothing in this
            section limits mandatory consumer rights of your country of
            residence.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            15. Changes to these Terms
          </h2>
          <p>
            We may update these Terms as the product evolves. Material changes
            are announced at least 14 days before taking effect — by email to
            active customers and by a notice on this page; the version and
            &ldquo;Last updated&rdquo; line at the top change whenever we do.
            Continued use after the effective date is acceptance. If a provision
            is held invalid, the rest remains in force. These Terms and the
            Privacy Policy together are the complete agreement between you and{" "}
            {ENTITY} regarding the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            16. Contact
          </h2>
          <p>
            One monitored mailbox handles every request below; the support form
            at{" "}
            <Link className="text-accent hover:underline" href="/support">
              /support
            </Link>{" "}
            reaches the same team.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>General support: <span className="font-mono">{CONTACT_EMAIL}</span></li>
            <li>Billing questions: <span className="font-mono">{LEGAL_EMAIL}</span></li>
            <li>Refund requests: <span className="font-mono">{LEGAL_EMAIL}</span></li>
            <li>Subscription cancellation: online via Account → Billing (see §6), or <span className="font-mono">{CONTACT_EMAIL}</span></li>
            <li>Privacy &amp; data requests: <span className="font-mono">{env.privacyEmail()}</span></li>
            <li>Security &amp; abuse reports: <span className="font-mono">{CONTACT_EMAIL}</span></li>
            <li>Content misuse reports (AUP): <span className="font-mono">{CONTACT_EMAIL}</span>, subject &ldquo;report&rdquo;</li>
            {ADDRESS ? <li>Mailing address: {ENTITY}, {ADDRESS}</li> : null}
          </ul>
          <p className="mt-2">
            By using the Service or ticking &ldquo;I agree&rdquo; at checkout
            you acknowledge that you have read and agree to these Terms.
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
