import type { Metadata } from "next";
import { FaqContent } from "@/components/FaqContent";

export const metadata: Metadata = {
  title: "FAQ — make1day AI SaaS starter, licensing, payments and limits",
  description:
    "21 verified answers about building an AI SaaS with a configurable Next.js 15 starter: auth and Supabase vs SQLite, six payment gateways, white-label source delivery and licence keys, AI streaming quotas, hybrid RAG, five-language i18n, deployment, refunds, SMTP support and the limitations we do not hide.",
  keywords: [
    "how to build a SaaS with Next.js",
    "Next.js SaaS boilerplate with Stripe and auth",
    "AI SaaS boilerplate FAQ",
    "white label SaaS boilerplate source code",
    "Next.js subscription billing webhook",
    "Waffo Pancake vs Stripe vs Lemon Squeezy",
    "AI SaaS starter license key",
    "Next.js boilerplate multi-tenancy",
    "AGENTS.md boilerplate",
  ],
  alternates: { canonical: "/faq" },
  openGraph: {
    type: "website",
    title: "FAQ — make1day AI SaaS starter",
    description:
      "Licensing, gateways, white-labelling, AI quotas, refunds and honest limitations — answered under the company name make1day.",
    url: "/faq",
  },
};

export default function FaqPage() {
  return (
    <section className="wrap py-12 sm:py-20">
      <FaqContent />
    </section>
  );
}
