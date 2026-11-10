import type { Metadata } from "next";
import { Builder } from "@/components/Builder";
import { Trans } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { STYLE_OPTIONS, type StyleId } from "@/lib/generator/config";
import { HreflangLinks } from "@/components/HreflangLinks";

export const metadata: Metadata = {
  title: "SaaS Template Generator",
  description:
    "Pick your stack, auth, payments and AI providers, then download a production-ready AI SaaS starter.",
  // Indexable on purpose: /builder is the main conversion page. robots.ts
  // explicitly allows it and sitemap.ts ranks it 0.9 — a page-level noindex
  // here would silently override both.
  robots: { index: true, follow: true },
};

export default async function BuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ style?: string }>;
}) {
  const lang = await getLang();
  const params = await searchParams;
  const requested = params?.style;
  const validIds: string[] = STYLE_OPTIONS.map((o) => o.id);
  const initialStyle =
    requested && validIds.includes(requested) ? (requested as StyleId) : undefined;

  return (
    <section className="wrap py-10 sm:py-16">
      <HreflangLinks path="/builder" />
      <div className="max-w-2xl">
        <div className="eyebrow mb-3">
          <Trans k="builderPage.eyebrow" lang={lang} />
        </div>
        <h1 className="text-4xl font-semibold">
          <Trans k="builderPage.title" lang={lang} />
        </h1>
        <p className="mt-4 text-ink-soft">
          <Trans k="builderPage.body" lang={lang} />
        </p>
      </div>
      <div className="mt-12">
        <Builder initialStyle={initialStyle} />
      </div>
    </section>
  );
}
