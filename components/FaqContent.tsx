"use client";

import { useLanguage } from "@/lib/i18n";
import { faqContent } from "@/lib/content/faq";
import { Markdown } from "@/lib/markdown";

export function FaqContent() {
  const { lang, t } = useLanguage();
  const c = faqContent[lang] ?? faqContent.en;
  // The graph must declare the language of the TEXT it contains, not the UI
  // language. When a locale has no translation yet we fall back to English
  // Q&A, so claiming `ja` / `fr` / `de` here would be a factual error that
  // answer engines can quote.
  const contentLang = faqContent[lang] ? lang : "en";

  // FAQPage structured data uses the SAME localised Q&A the visitor sees —
  // an English-only graph on a Chinese page is easy for answer engines to
  // mis-quote. The publisher matches the Organization name in layout.tsx.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: contentLang,
    publisher: { "@type": "Organization", name: "make1day.dev" },
    mainEntity: c.items.map((it) => ({
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
        <p className="mt-2 text-xs text-muted">
          {c.items.length} Q&amp;A · {t("footer.blog")}:{" "}
          <span className="font-semibold text-ink">make1day.dev</span>
        </p>
        {c.reviewed && (
          <p className="mt-1 text-xs text-muted">{c.reviewed}</p>
        )}
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
            <div className="mt-3 text-sm leading-relaxed text-ink-soft">
              <Markdown source={it.a} />
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
