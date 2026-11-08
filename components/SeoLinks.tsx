"use client";

import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://marketit.dev";
const LANGS = ["en", "zh", "ja", "fr", "de"];

// Renders the correct canonical + hreflang for the *current* page (not just
// home), so every indexable route is self-canonical in each language. Crawlers
// that render JS (Googlebot) pick this up; the server still emits a sensible
// default via the initial lang from the cookie/header.
export function SeoLinks() {
  const pathname = usePathname() || "/";
  const { lang } = useLanguage();
  const canonical = `${SITE}${pathname}${lang === "en" ? "" : `?lang=${lang}`}`;

  return (
    <>
      <link rel="canonical" href={canonical} />
      {LANGS.map((l) => (
        <link
          key={l}
          rel="alternate"
          hrefLang={l}
          href={`${SITE}${pathname}${l === "en" ? "" : `?lang=${l}`}`}
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href={`${SITE}${pathname}`} />
    </>
  );
}
