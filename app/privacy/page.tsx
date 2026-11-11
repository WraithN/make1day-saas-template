import type { Metadata } from "next";
import { getCanonicalLang } from "@/lib/i18n-server";
import { langAlternatePaths, variantCanonical } from "@/lib/seo-alternates";
import Link from "next/link";
import { env } from "@/lib/env";

// Every identity string on this page resolves from lib/env.ts. Hard-coding a
// company name, mailbox or jurisdiction here is how the old policy ended up
// naming a different entity than the rest of the site.
const PRODUCT = env.productName();
const ENTITY = env.legalEntity();
const PRIVACY_EMAIL = env.privacyEmail();
const SITE_URL = env.siteUrl();
const UPDATED = env.legalUpdatedAt();
const ADDRESS = env.legalAddress();
const JURISDICTION = env.legalJurisdiction();
const DPA_URL = env.dpaUrl();

export async function generateMetadata(): Promise<Metadata> {
  const canonical = variantCanonical("/privacy", await getCanonicalLang());
  return {
    alternates: {
      canonical,
      languages: langAlternatePaths("/privacy"),
    },
    openGraph: { url: canonical },
    title: "Privacy Policy",
    description: `What personal data ${PRODUCT} collects, where it is stored, who receives it and how to exercise your rights.`,
  };
}

export default function PrivacyPage() {
  return (
    <section className="wrap max-w-3xl py-20">
      <div className="eyebrow mb-3">LEGAL</div>
      <h1 className="text-4xl font-semibold">Privacy Policy</h1>
      <p className="mt-4 text-ink-soft">Last updated: {UPDATED}</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-ink-soft">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            1. Who is responsible for your data
          </h2>
          <p>
            This website ({SITE_URL}) is operated by <strong className="text-ink">{ENTITY}</strong>
            {JURISDICTION ? ` (${JURISDICTION})` : ""}, the data controller for
            the processing described below. Questions and requests can be sent
            to <span className="font-mono">{PRIVACY_EMAIL}</span>
            {ADDRESS ? `, or by post to ${ADDRESS}` : ""}.
          </p>
          <p className="mt-2">
            <strong className="text-ink">Scope matters here.</strong> This policy
            covers only this website and the service that generates a project
            ZIP for you. Once you download a generated project and deploy it,
            you become the data controller for that deployment and must publish
            your own privacy notice — we have no access to the data your
            deployment collects. The generated project deliberately ships a
            placeholder privacy page instead of this policy for that reason.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            2. What we collect, and where it actually goes
          </h2>
          <p>
            The original version of this page claimed that preferences never
            leave your browser and that account data lives only in your own
            Supabase project. Both statements were wrong. This is the real data
            map, derived from the code and database schema:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              <strong className="text-ink">Browser-only (never sent to our servers):</strong>{" "}
              language, theme (<span className="font-mono">sk_theme</span>) and
              your cookie-consent choice (<span className="font-mono">sk_cookie_consent</span>),
              all in <span className="font-mono">localStorage</span>.
            </li>
            <li>
              <strong className="text-ink">First-party cookies:</strong>{" "}
              <span className="font-mono">sk_vid</span> (random visitor id, up
              to 365 days) and <span className="font-mono">sk_sid</span> (session
              id, 30 minutes), both httpOnly and SameSite=Lax. They are set only
              after you accept analytics cookies.
            </li>
            <li>
              <strong className="text-ink">First-party analytics:</strong> after
              consent, <span className="font-mono">/api/track</span> records
              page views, CTA clicks, checkout starts and conversions with the
              visitor/session ids, path, CTA label, the <em>host</em> of the
              referrer and a timestamp. These go into the{" "}
              <span className="font-mono">pageviews</span> and{" "}
              <span className="font-mono">traffic_events</span> tables. A
              checkout or conversion event also stores your email so a paid
              order can be attributed to the session.
            </li>
            <li>
              <strong className="text-ink">Account &amp; profile:</strong> email,
              role, display/full name, company, an scrypt password hash and
              salt (local-auth mode only), email-verification state and
              timestamps (<span className="font-mono">profiles</span>). Operator
              accounts are stored in <span className="font-mono">admin_users</span>{" "}
              and their signed sessions in <span className="font-mono">admin_sessions</span>.
              When Supabase Auth is configured, authentication data is held by
              Supabase instead.
            </li>
            <li>
              <strong className="text-ink">Purchases &amp; licensing:</strong>{" "}
              buyer email, plan, gateway order id, amount, currency and status
              (<span className="font-mono">orders</span>); the issued key, its
              id, plan and validity (<span className="font-mono">licenses</span>);
              and gateway event ids used for webhook deduplication (
              <span className="font-mono">webhook_events</span>). We never
              receive or store card numbers — payment details are entered on the
              payment provider&apos;s hosted checkout.
            </li>
            <li>
              <strong className="text-ink">Support requests:</strong> email,
              subject, message, status and optional account id (
              <span className="font-mono">support_tickets</span>).
            </li>
            <li>
              <strong className="text-ink">Abuse prevention &amp; quotas:</strong>{" "}
              a <em>hashed</em> network key plus a daily counter (
              <span className="font-mono">quota</span>, for anonymous preview
              limits) and a per-user daily AI message counter (
              <span className="font-mono">ai_usage</span>). We do not store raw
              IP addresses in our application tables, though our hosting
              provider may log them under its own policy.
            </li>
            <li>
              <strong className="text-ink">Password reset / email verification:</strong>{" "}
              only a SHA-256 hash of the one-time token, the email and an
              expiry (<span className="font-mono">password_resets</span>,{" "}
              <span className="font-mono">email_verifications</span>). The raw
              token exists only inside the email link.
            </li>
            <li>
              <strong className="text-ink">Delivery, consent &amp; error audit:</strong>{" "}
              a <strong className="text-ink">hashed</strong> buyer email and
              license id with an event kind — ZIP download, key redemption, key
              email or key re-send — and a timestamp (
              <span className="font-mono">delivery_events</span>); consent
              accept / withdraw / policy-view / export / erase events with a
              hashed subject (<span className="font-mono">consent_events</span>);
              and server error level, message and structured context (
              <span className="font-mono">error_events</span>). None of these
              store an IP address or user agent.
            </li>
            <li>
              <strong className="text-ink">Transactional email retry:</strong>{" "}
              if a key or account email fails to send, the recipient, subject
              and message body are held in{" "}
              <span className="font-mono">mail_outbox</span> until a scheduled
              retry succeeds. Delivered or dead rows are deleted by the
              retention job; pending mail is never purged automatically.
            </li>
            <li>
              <strong className="text-ink">Sign-in sessions &amp; rate limits:</strong>{" "}
              local password sign-in stores only a hash of the session token,
              your email and an expiry (<span className="font-mono">local_sessions</span>).
              API abuse limits keep a hashed bucket key, a counter and a window
              (<span className="font-mono">rate_limits</span>).
            </li>
            <li>
              <strong className="text-ink">AI &amp; RAG content:</strong> chat
              messages are sent to the AI provider you configure and are not
              written to our application database. Documents you ingest for RAG
              are stored in the configured vector store. Do not submit personal
              data you do not want those providers to process.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            3. Where data is stored
          </h2>
          <p>
            With no database credentials configured, all of the tables above
            live in a local SQLite file (<span className="font-mono">.data/shipkit.db</span>)
            on the server running this site — not in your own Supabase project.
            When <span className="font-mono">SUPABASE_SERVICE_ROLE_KEY</span> is
            set, the same records are written to the operator&apos;s Supabase
            project instead. The two backends are selected by configuration;
            the data categories do not change.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            4. Cookies, consent and third-party analytics
          </h2>
          <p>
            Strictly necessary storage is limited to the preference keys above.
            Analytics cookies, the first-party tracker and Google Analytics 4
            are loaded <strong className="text-ink">only after you accept</strong>{" "}
            the consent banner. GA4 is inactive unless{" "}
            <span className="font-mono">NEXT_PUBLIC_GA_ID</span> is configured,
            and is loaded with IP anonymisation enabled. Withdrawing consent
            stops future tracking; you can also clear the two analytics cookies
            in your browser. Consent decisions, policy views and data-rights
            requests are additionally recorded server-side in an append-only
            log keyed by a <em>hashed</em> subject, so we can evidence them
            without storing another copy of your address. No advertising or
            cross-site tracking pixels are used.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            5. Why we process it
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-ink">Contract:</strong> creating accounts,
              taking payment, issuing a license key, generating and delivering
              your project, and replying to support tickets.
            </li>
            <li>
              <strong className="text-ink">Consent:</strong> first-party funnel
              analytics and Google Analytics.
            </li>
            <li>
              <strong className="text-ink">Legitimate interests:</strong> abuse
              prevention, rate/preview quotas, webhook deduplication, security
              logging and understanding which pages convert.
            </li>
            <li>
              <strong className="text-ink">Legal obligations:</strong> retaining
              order records for accounting and tax purposes. Where a payment
              provider acts as Merchant of Record, it holds the tax records
              under its own policy.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            6. Who else receives data
          </h2>
          <p>
            Only the services the operator actually configures are involved.
            Depending on that configuration, personal data may be processed by:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong className="text-ink">Payments:</strong> one of Stripe,
              Creem, PayPal, Waffo (Pancake or Acquiring) or Lemon Squeezy —
              buyer email, order metadata and webhook payloads.
            </li>
            <li>
              <strong className="text-ink">Database / auth:</strong> Supabase,
              when a service-role key is configured; otherwise data stays on
              the site&apos;s own server.
            </li>
            <li>
              <strong className="text-ink">AI:</strong> OpenAI, Anthropic,
              Google Gemini, OpenRouter, DeepSeek or Groq — chat prompts and
              RAG content only for the provider in use.
            </li>
            <li>
              <strong className="text-ink">Email:</strong> Resend or a custom
              HTTP mailer — recipient address and transactional message
              content. With <span className="font-mono">MAIL_PROVIDER=none</span>{" "}
              no mail is sent at all.
            </li>
            <li>
              <strong className="text-ink">Analytics:</strong> Google Analytics
              4, only if configured and only after consent.
            </li>
            <li>
              <strong className="text-ink">Error reporting:</strong> an optional
              external sink (<span className="font-mono">ERROR_REPORT_URL</span>)
              receives error messages and structured context only — never
              analytics identities. If unset, errors stay on our own server.
            </li>
            <li>
              <strong className="text-ink">Hosting:</strong> whichever platform
              runs this site; it may keep access logs under its own policy.
            </li>
          </ul>
          <p className="mt-2">
            We do not sell personal data and do not use it for advertising
            profiles.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            7. International transfers &amp; data processing agreements
          </h2>
          <p>
            The providers above may process data in the United States, the EU
            or other jurisdictions, so transfers outside your country of
            residence can occur. It is the operator&apos;s responsibility to
            put the appropriate data processing agreements and transfer
            safeguards in place with those providers before launch. The
            repository contains a fill-in DPA template for that purpose; it is
            not a signed agreement and not legal advice.
            {DPA_URL ? (
              <>
                {" "}Our DPA is available at{" "}
                <a className="text-accent hover:underline" href={DPA_URL}>
                  {DPA_URL}
                </a>
                .
              </>
            ) : null}
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            8. Retention and deletion
          </h2>
          <p>
            Order and license records are kept while the license is valid and
            for as long as accounting or tax rules require. An automated
            retention job (<span className="font-mono">/api/cron/retention</span>,
            protected by a secret and invoked by our hosting scheduler) deletes
            analytics, consent, delivery and error events, expired one-time
            tokens and sessions, old quota / rate-limit buckets and delivered
            outbox mail after a default of 90 days.{" "}
            <strong className="text-ink">
              It is a job endpoint, not a built-in timer
            </strong>
            : if the scheduler is not configured for a deployment, those rows
            are retained until it is. Pending mail is never deleted by the job,
            because a customer may still be waiting for their license key.
            Account and support rows are kept until you ask us to remove them
            or until your data-rights request is processed. One-time reset and
            verification tokens are deleted on first use or at expiry.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            9. Your rights
          </h2>
          <p>
            Depending on your jurisdiction (GDPR, CCPA/CPRA and similar), you
            may request access to, correction of, export of or deletion of your
            personal data, object to processing based on legitimate interests,
            and withdraw analytics consent at any time. Signed-in users can
            export their data directly from{" "}
            <span className="font-mono">/api/privacy/export</span> (a JSON file)
            and request erasure from{" "}
            <span className="font-mono">/api/privacy/erase</span>, which requires
            an exact confirmation of the account email. Erasure keeps the order
            and license rows required for accounting and for a key you already
            own, replacing the address with an irreversible tombstone.
            Otherwise write to{" "}
            <span className="font-mono">{PRIVACY_EMAIL}</span> and we will
            verify the request before acting on it. Clearing browser storage
            removes only your local preferences and consent choice —{" "}
            <strong className="text-ink">
              it does not delete server-side records
            </strong>
            , which must be requested through the address above.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            10. Security
          </h2>
          <p>
            Passwords are stored as scrypt hashes with a per-account salt,
            license keys are HMAC-signed, webhook signatures are verified with
            constant-time comparisons, one-time tokens are stored only as
            hashes, and analytics cookies are httpOnly. No method of
            transmission or storage is perfectly secure, so we cannot
            guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            11. Children
          </h2>
          <p>
            This site is aimed at software developers and is not intended for
            anyone under 16. We do not knowingly collect personal data from
            children.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            12. Changes
          </h2>
          <p>
            We may update this policy as the product changes. Material changes
            are reflected by the &ldquo;Last updated&rdquo; date above and, where
            appropriate, by a notice on the site.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">
            13. Contact
          </h2>
          <p>
            Data controller: <strong className="text-ink">{ENTITY}</strong>.
            <br />
            Privacy requests: <span className="font-mono">{PRIVACY_EMAIL}</span>.
            <br />
            Site: <span className="font-mono">{SITE_URL}</span>.
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
