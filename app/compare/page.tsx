import type { Metadata } from "next";
import { CompareContent } from "@/components/CompareContent";

export const metadata: Metadata = {
  title: "marketit vs ShipFast, Makerkit, Supastarter — comparison",
  description:
    "An honest, source-level comparison of marketit against ShipFast, Makerkit and Supastarter — the best Next.js SaaS boilerplates in 2026.",
  keywords: [
    "ShipFast alternative",
    "Makerkit alternative",
    "Supastarter alternative",
    "Best Next.js SaaS boilerplate 2026",
    "Next.js SaaS starter comparison",
  ],
};

export default function ComparePage() {
  return (
    <section className="wrap py-12 sm:py-20">
      <CompareContent />
    </section>
  );
}
