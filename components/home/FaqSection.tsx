"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { faqContent } from "@/lib/content/faq";
import { Markdown } from "@/lib/markdown";

const VIEW_ALL: Record<string, string> = {
  en: "View all FAQ",
  zh: "查看全部常见问题",
  ja: "すべてのFAQを見る",
  fr: "Voir toute la FAQ",
  de: "Alle FAQs ansehen",
};

export function FaqSection() {
  const { lang } = useLanguage();
  const c = faqContent[lang] ?? faqContent.en;
  // Surface the five highest-intent questions on the home page; the full set
  // lives on /faq.
  const items = c.items.slice(0, 5);

  return (
    <section className="sk-font wrap py-14 sm:py-20">
      <div className="text-center">
        <div className="eyebrow mb-3">{c.eyebrow}</div>
        <h2 className="text-[20px] font-semibold text-ink sm:text-[24px]">
          {c.heading}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-[14px] leading-relaxed text-muted">
          {c.subtitle}
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-3xl space-y-3 sm:space-y-4">
        {items.map((it, i) => (
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

      <div className="mt-8 text-center">
        <Link href="/faq" className="btn-ghost text-[15px]">
          {VIEW_ALL[lang] ?? VIEW_ALL.en} →
        </Link>
      </div>
    </section>
  );
}
