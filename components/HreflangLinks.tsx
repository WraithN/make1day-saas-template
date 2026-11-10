import { env } from "@/lib/env";

const LANGS = ["en", "zh", "ja", "fr", "de"] as const;

/**
 * Server-rendered hreflang cluster for pages whose metadata alternates cannot
 * carry the `?lang=` query (Next strips it from root-path alternates) or that
 * have no per-language metadata at all. React hoists these <link> elements
 * into <head>. Values match lib/seo-alternates.ts and the sitemap clusters.
 */
export function HreflangLinks({ path }: { path: string }) {
  const site = env.siteUrl().replace(/\/+$/, "");
  const root = path === "/" ? "" : path;
  const href = (l: string) =>
    l === "en" ? `${site}${root || "/"}` : `${site}${root || "/"}?lang=${l}`;
  return (
    <>
      {LANGS.map((l) => (
        <link key={l} rel="alternate" hrefLang={l} href={href(l)} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={href("en")} />
    </>
  );
}
