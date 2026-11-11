// hreflang cluster helper for `metadata.alternates.languages`. Values are
// paths; Next resolves them against metadataBase. Localized pages live under
// a URL path prefix (`/zh/pricing`); EN is the bare path. Keeping the cluster
// definition next to the sitemap's langSet() equivalent keeps HTML-head and
// sitemap hreflang in agreement.
export function langAlternatePaths(path: string): Record<string, string> {
  const base = path.endsWith("/") ? path.slice(0, -1) : path;
  const root = base === "" ? "/" : base;
  return {
    en: root,
    zh: localeHref(root, "zh"),
    ja: localeHref(root, "ja"),
    fr: localeHref(root, "fr"),
    de: localeHref(root, "de"),
  };
}

const LANGS = new Set(["zh", "ja", "fr", "de"]);

/** `/pricing` + zh → `/zh/pricing`; root `/` + zh → `/zh`. */
export function localeHref(path: string, lang: string): string {
  const base = path === "" || path === "/" ? "" : path;
  return `/${lang}${base}` || "/";
}

/**
 * Self-referencing canonical for the localized variants. The English page
 * canonicals to the bare path; a variant served AT its prefixed URL
 * canonicals to that URL (`/zh/pricing`). Callers must pass the locale of
 * the URL — `getCanonicalLang()` (never `getLang()`): a visitor whose cookie
 * switches the language on the bare path must still canonical to the EN URL,
 * or every cookie holder would declare a localized canonical for the same
 * URL and Google would consolidate the cluster into the wrong variant.
 */
export function variantCanonical(
  path: string,
  lang?: string | string[] | null,
): string {
  const raw = Array.isArray(lang) ? lang[0] : lang;
  const iso = (raw ?? "").toLowerCase().trim();
  const root = path === "" ? "/" : path;
  return LANGS.has(iso) ? localeHref(root, iso) : root;
}
