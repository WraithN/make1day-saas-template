import type { Metadata } from "next";
import { getLang, tr } from "@/lib/i18n-server";
import { msgCopy } from "@/lib/content/messaging";
import { env } from "@/lib/env";
import { SupportForm } from "@/components/SupportForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact support",
  description:
    "Send the ShipKit team a support message, or reach us by email / a 1:1 call.",
};

export default async function SupportPage() {
  const lang = await getLang();
  const c = msgCopy(lang);
  const contactEmail = env.contactEmail();
  const bookingUrl = env.bookingUrl();
  const mailto = `mailto:${contactEmail}?subject=${encodeURIComponent("ShipKit support")}`;

  return (
    <section className="wrap py-12 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <div className="eyebrow mb-3">{c["support.eyebrow"]}</div>
        <h1 className="text-3xl font-semibold sm:text-4xl">{c["support.title"]}</h1>
        <p className="mt-4 max-w-xl text-ink-soft">{c["support.subtitle"]}</p>

        <div className="mt-8">
          <SupportForm />
        </div>

        {/* Original mailto / booking link stay as a fallback — the form is the
            primary route, not a replacement that removes these channels. */}
        <div className="mt-10 rounded-xl border border-line bg-surface/60 p-5">
          <h2 className="text-sm font-semibold">{c["support.fallbackTitle"]}</h2>
          <p className="mt-2 text-sm text-ink-soft">{c["support.fallbackBody"]}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <a
              href={mailto}
              className="break-all underline underline-offset-2 hover:text-ink"
            >
              {contactEmail}
            </a>
            {bookingUrl && (
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-ink"
              >
                {tr(lang, "pricing.custom.cta")}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
