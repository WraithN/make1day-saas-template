"use client";

import { useLanguage } from "@/lib/i18n";
import { faqContent } from "@/lib/content/faq";

export function FaqContent() {
  const { lang } = useLanguage();
  const c = faqContent[lang] ?? faqContent.en;

  // FAQPage structured data (English source of truth for the schema).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqContent.en.items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="text-center">
        <div className="eyebrow mb-3">{c.eyebrow}</div>
        <h1 className="text-3xl font-semibold sm:text-4xl">{c.heading}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-ink-soft">{c.subtitle}</p>
      </div>

      <div className="mx-auto mt-8 max-w-3xl space-y-3 sm:mt-12 sm:space-y-4">
        {c.items.map((it, i) => (
          <details
            key={i}
            className="card group cursor-pointer [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex items-center justify-between gap-3 font-medium">
              <span>{it.q}</span>
              <span className="ml-2 shrink-0 text-accent transition-transform group-open:rotate-45 sm:ml-4">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{it.a}</p>
          </details>
        ))}
      </div>
    </>
  );
}
