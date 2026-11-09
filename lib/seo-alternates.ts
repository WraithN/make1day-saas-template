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
