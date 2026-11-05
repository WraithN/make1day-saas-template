"use client";

import { useLanguage } from "@/lib/i18n";

/**
 * Custom / 1:1 service block. There is deliberately no checkout here: custom
 * work is scoped in a conversation first. The primary CTA uses a configurable
 * booking link (Cal.com, Calendly, …) and falls back to a prefilled email.
 */
export function CustomService({
  bookingUrl,
  contactEmail,
}: {
  bookingUrl: string;
  contactEmail: string;
}) {
  const { t } = useLanguage();
  const mailto = `mailto:${contactEmail}?subject=${encodeURIComponent(
    t("pricing.custom.emailSubject"),
  )}`;
  const primaryHref = bookingUrl || mailto;

  return (
    <section
      className="card mt-6 sm:mt-8 sm:p-8"
      aria-labelledby="custom-service-title"
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <div>
          <div className="eyebrow mb-3">
            {t("pricing.custom.eyebrow")}
          </div>
          <h2
            id="custom-service-title"
            className="text-2xl font-semibold sm:text-3xl"
          >
            {t("pricing.custom.title")}
          </h2>
          <p className="mt-3 text-sm text-ink-soft">
            {t("pricing.custom.body")}
          </p>
          <ul className="mt-5 grid gap-2 text-sm text-ink-soft sm:grid-cols-2">
            {["f1", "f2", "f3", "f4"].map((n) => (
              <li key={n} className="flex gap-2">
                <span className="text-accent">·</span>
                <span>{t(`pricing.custom.${n}`)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-line bg-surface/60 p-5 text-center sm:p-6">
          <div className="font-mono text-xs uppercase tracking-wide text-muted">
            {t("pricing.custom.eyebrow")}
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {t("pricing.custom.price")}
          </div>
          <a
            href={primaryHref}
            className="btn-solid mt-5 w-full"
            {...(bookingUrl
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {t("pricing.custom.cta")}
          </a>
          <p className="mt-3 text-xs text-muted">
            {t("pricing.custom.note")}
          </p>
          <p className="mt-4 text-xs text-muted">
            {t("pricing.custom.email")}{" "}
            <a
              href={mailto}
              className="break-all underline underline-offset-2 hover:text-ink"
            >
              {contactEmail}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
