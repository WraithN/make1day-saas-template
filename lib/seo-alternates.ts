// hreflang cluster helper for `metadata.alternates.languages`. Values are
// paths; Next resolves them against metadataBase. Keeping the cluster
// definition next to the sitemap's langSet() equivalent keeps HTML-head and
// sitemap hreflang in agreement.
export function langAlternatePaths(path: string): Record<string, string> {
  const base = path.endsWith("/") ? path.slice(0, -1) : path;
  const root = base === "" ? "/" : base;
  return {
    en: root,
    zh: `${root}?lang=zh`,
    ja: `${root}?lang=ja`,
    fr: `${root}?lang=fr`,
    de: `${root}?lang=de`,
  };
}

const LANGS = new Set(["zh", "ja", "fr", "de"]);

/**
 * Self-referencing canonical for the `?lang=` i18n variants: the English page
 * canonicals to the bare path, every localized variant canonicals to its OWN
 * URL (path + ?lang=xx). Without this all ~100 variant URLs declared the base
 * page as canonical and Google consolidated them into the English original —
 * the localized pages could never rank on their own. AGENTS rule: "?lang= must
 * stay in canonical and hreflang URLs."
 */
export function variantCanonical(
  path: string,
  lang?: string | string[],
): string {
  const raw = Array.isArray(lang) ? lang[0] : lang;
  const iso = (raw ?? "").toLowerCase().trim();
  const root = path === "" ? "/" : path;
  return LANGS.has(iso) ? `${root}?lang=${iso}` : root;
}
