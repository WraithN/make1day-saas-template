import type { Metadata } from "next";
import { FaqContent } from "@/components/FaqContent";

export const metadata: Metadata = {
  title: "FAQ — ShipKit AI SaaS starter",
  description:
    "How to build a SaaS with Next.js using a starter: auth, Stripe subscriptions, AI features, deployment and licensing — answered for indie founders.",
  keywords: [
    "how to build a SaaS with Next.js",
    "Next.js SaaS boilerplate with Stripe",
    "Next.js SaaS starter with auth",
    "AI SaaS starter template FAQ",
    "Stripe subscriptions Next.js",
    "Next.js boilerplate multi-tenancy",
  ],
};

export default function FaqPage() {
  return (
    <section className="wrap py-12 sm:py-20">
      <FaqContent />
    </section>
  );
}
