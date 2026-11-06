import Link from "next/link";
import { BoundarySection } from "@/components/home/BoundarySection";
import { PitfallSection } from "@/components/home/PitfallSection";
import { ThemePreviewSection } from "@/components/home/ThemePreviewSection";
import { FeatureMatrix } from "@/components/home/FeatureMatrix";
import { BlogTeaser } from "@/components/home/BlogTeaser";
import { PricingCards, type Plan } from "@/components/PricingCards";
import { Trans } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { priceForPlan } from "@/lib/env";

export default async function HomePage() {
  const lang = await getLang();

  // Pricing on the home page reuses the same plan data as /pricing, but with
  // deliberate weight: Free is muted (quiet entry point), Buyout is highlighted
  // (restrained, no neon), Care carries a note about what it actually sells.
  const plans: Plan[] = [
    {
      id: "free",
      name: "Free",
      price: "$0",
      period: "",
      forever: true,
      features: ["pricing.free.f1", "pricing.free.f2", "pricing.free.f3"],
      ctaKey: "pricing.getStarted",
      priceId: null,
      muted: true,
    },
    {
      id: "buyout",
      name: "Buyout",
      price: "$99",
      originalPrice: "$199",
      launch: true,
      period: "",
      once: true,
      features: [
        "pricing.buyout.f1",
        "pricing.buyout.f2",
        "pricing.buyout.f3",
        "pricing.buyout.f4",
      ],
      ctaKey: "pricing.buyLicense",
      priceId: priceForPlan("buyout") || null,
      highlight: true,
    },
    {
      id: "care",
      name: "Care",
      price: "$9",
      originalPrice: "$19",
      period: "",
      monthly: true,
      features: [
        "pricing.care.f1",
        "pricing.care.f2",
        "pricing.care.f3",
        "pricing.care.f4",
        "pricing.care.f5",
        "pricing.care.f6",
      ],
      ctaKey: "pricing.subscribe",
      priceId: priceForPlan("care") || null,
      note: "pricing.care.note",
    },
  ];

  return (
    <>
      {/* HERO — opens with the honest promise, not a hype claim */}
      <section className="relative overflow-hidden">
        <div className="tech-grid pointer-events-none absolute inset-0" />
        <div className="wrap relative py-14 text-center sm:py-20 lg:py-24">
          <div className="eyebrow mb-4">
            <Trans k="hero.eyebrow" lang={lang} />
          </div>
          <h1 className="mx-auto max-w-3xl text-[30px] font-semibold leading-[1.35] text-[#f0f0f0]">
            <Trans k="hero.title" lang={lang} />
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[14px] leading-relaxed text-[#c4c4c4]">
            <Trans k="hero.subtitle" lang={lang} />
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href="/builder"
              className="btn-solid w-full text-[16px] sm:w-auto"
            >
              <Trans k="hero.getStarted" lang={lang} />
            </Link>
            <Link
              href="/#boundaries"
              className="btn-ghost w-full text-[16px] sm:w-auto"
            >
              <Trans k="hero.boundaries" lang={lang} />
            </Link>
          </div>
          <div className="mt-6 font-mono text-[12px] text-[#666666]">
            <Trans k="hero.meta" lang={lang} />
          </div>
        </div>
      </section>

      {/* T1 — HONEST BOUNDARY: the differentiator, visually dominant */}
      <BoundarySection lang={lang} />

      {/* T2 — REAL LAUNCH PITFALLS: evidence that the boundaries are real */}
      <PitfallSection lang={lang} />

      {/* T2 — THEME SYSTEM: the exportable design-asset value */}
      <ThemePreviewSection lang={lang} />

      {/* T3 — CAPABILITY MATRIX: differentiators enlarged, commodity shrunk */}
      <FeatureMatrix lang={lang} />

      {/* T4 — PRICING: weighted — Buyout highlighted, Free quiet, Care = upkeep */}
      <section className="sk-font wrap py-14 sm:py-20">
        <p className="eyebrow mb-3">
          <Trans k="homePricing.eyebrow" lang={lang} />
        </p>
        <h2 className="text-[18px] font-medium text-[#f0f0f0]">
          <Trans k="homePricing.title" lang={lang} />
        </h2>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-[#949494]">
          <Trans k="homePricing.note" lang={lang} />
        </p>
        <div className="mt-8">
          <PricingCards plans={plans} />
        </div>
      </section>

      {/* T4 — BLOG: tutorial vs comparison tags, unequal cards */}
      <BlogTeaser lang={lang} />

      {/* CTA */}
      <section className="sk-font wrap py-10 text-center sm:py-16">
        <div className="card mx-auto max-w-2xl">
          <h2 className="text-[18px] font-medium text-[#f0f0f0]">
            <Trans k="cta.heading" lang={lang} />
          </h2>
          <p className="mt-3 text-[14px] text-[#c4c4c4]">
            <Trans k="cta.paragraph" lang={lang} />
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="btn-solid w-full text-[16px] sm:w-auto"
            >
              <Trans k="cta.create" lang={lang} />
            </Link>
            <Link
              href="/pricing"
              className="btn-ghost w-full text-[16px] sm:w-auto"
            >
              <Trans k="cta.compare" lang={lang} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
