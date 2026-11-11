import type { Metadata } from "next";
import { getCanonicalLang } from "@/lib/i18n-server";
import { langAlternatePaths, variantCanonical } from "@/lib/seo-alternates";
import { CompareContent } from "@/components/CompareContent";

export async function generateMetadata(): Promise<Metadata> {
  const canonical = variantCanonical("/compare", await getCanonicalLang());
  return {
    alternates: {
      canonical,
      languages: langAlternatePaths("/compare"),
    },
    openGraph: { url: canonical },
    title: "make1day vs ShipFast, Makerkit, Supastarter — comparison",
    description:
      "An honest, source-level comparison of make1day against ShipFast, Makerkit and Supastarter — the best Next.js SaaS boilerplates in 2026.",
    keywords: [
      "ShipFast alternative",
      "Makerkit alternative",
      "Supastarter alternative",
      "Best Next.js SaaS boilerplate 2026",
      "Next.js SaaS starter comparison",
    ],
  };
}

export default function ComparePage() {
  return (
    <section className="wrap py-12 sm:py-20">
      <CompareContent />
    </section>
  );
}
