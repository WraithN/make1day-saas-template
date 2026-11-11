import Link from "next/link";
import type { Metadata } from "next";
import { BoundarySection } from "@/components/home/BoundarySection";
import { PitfallSection } from "@/components/home/PitfallSection";
import { ThemePreviewSection } from "@/components/home/ThemePreviewSection";
import { FeatureMatrix } from "@/components/home/FeatureMatrix";
import { BlogTeaser } from "@/components/home/BlogTeaser";
import { HandDrawnDeco } from "@/components/home/HandDrawnDeco";
import { TemplateGallerySection } from "@/components/home/TemplateGallerySection";
import { FaqSection } from "@/components/home/FaqSection";
import { HreflangLinks } from "@/components/HreflangLinks";
import { PricingCards, type Plan } from "@/components/PricingCards";
import { Trans } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { priceForPlan, primaryPaymentsReady } from "@/lib/env";
import { PRICES, bfActive, effectivePrice } from "@/lib/pricing";

export const metadata: Metadata = {
  // Root-path language cluster lives in the sitemap's xhtml:link cluster:
  // Next drops `?lang=` from metadata alternates when the path is "/", which
  // would emit five identical hreflang tags here.
  alternates: {
    canonical: "/",
  },
};

export default async function HomePage() {
  const lang = await getLang();
  // Same ladder as /pricing: the buy button charges the effective price and
  // the struck anchor is the regular price while the BF window runs.
  const bf = bfActive();
  const buyoutPrice = effectivePrice("buyout");
  const carePrice = effectivePrice("care");

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
      price: `$${buyoutPrice}`,
      originalPrice: bf ? `$${PRICES.buyout.regular}` : `$${PRICES.buyout.list}`,
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
      price: `$${carePrice}`,
      originalPrice: bf ? `$${PRICES.care.regular}` : `$${PRICES.care.list}`,
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
      <HreflangLinks path="/" />
      {/* HERO — opens with the honest promise, not a hype claim.
          Decoration layer is absolutely positioned at z-index 1; the copy sits
          above it at z-index 10 and keeps every click. */}
      <section className="relative overflow-hidden">
        <div className="tech-grid pointer-events-none absolute inset-0" />
        <HandDrawnDeco />
        <div className="wrap relative z-10 py-14 text-center doodle-rise sm:py-20 lg:py-24">
          <div className="eyebrow mb-5">
            <Trans k="hero.eyebrow" lang={lang} />
          </div>
          <h1 className="doodle-headline mx-auto max-w-3xl text-[30px] leading-[1.35] text-ink sm:text-[42px]">
            <Trans k="hero.title" lang={lang} />
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[14px] leading-relaxed text-ink-soft">
            <Trans k="hero.subtitle" lang={lang} />
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href="/builder"
              className="btn-solid btn-hero w-full text-[16px] sm:w-auto"
            >
              <Trans k="hero.getStarted" lang={lang} />
            </Link>
            <Link
              href="/styles"
              className="btn-ghost w-full text-[16px] sm:w-auto"
            >
              <Trans k="hero.browseThemes" lang={lang} />
            </Link>
          </div>
          <div className="mt-6 flex flex-col items-center gap-2 font-mono text-[12px] text-muted">
            <Trans k="hero.meta" lang={lang} />
            <span className="text-ink-soft">
              <Trans k="hero.tryFree" lang={lang} />
            </span>
          </div>
        </div>
      </section>

      {/* 价值简介 / 信任 — what the generator does & the honest boundaries */}
      <BoundarySection lang={lang} />
      <PitfallSection lang={lang} />

      {/* 功能亮点 — generator capability highlights */}
      <FeatureMatrix lang={lang} />

      {/* 模板预览 — curated themes → /styles */}
      <ThemePreviewSection lang={lang} />

      {/* 样板间 — live previews of generated template sites */}
      <TemplateGallerySection lang={lang} />

      {/* 博客精选 / 教程 */}
      <BlogTeaser lang={lang} />

      {/* FAQ */}
      <FaqSection />

      {/* 定价预览 — Buyout highlighted, Free quiet, Care = upkeep */}
      <section className="sk-font wrap py-14 sm:py-20">
        <p className="eyebrow mb-3">
          <Trans k="homePricing.eyebrow" lang={lang} />
        </p>
        <h2 className="text-[18px] font-semibold text-ink">
          <Trans k="homePricing.title" lang={lang} />
        </h2>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted">
          <Trans k="homePricing.note" lang={lang} />
        </p>
        <div className="mt-8">
          <PricingCards plans={plans} paymentsReady={primaryPaymentsReady()} />
        </div>
      </section>

      {/* CTA */}
      <section className="sk-font wrap py-10 text-center sm:py-16">
        <div className="card mx-auto max-w-2xl">
          <h2 className="text-[18px] font-semibold text-ink">
            <Trans k="cta.heading" lang={lang} />
          </h2>
          <p className="mt-3 text-[14px] text-ink-soft">
            <Trans k="cta.paragraph" lang={lang} />
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              data-cta="home-create"
              className="btn-solid w-full text-[16px] sm:w-auto"
            >
              <Trans k="cta.create" lang={lang} />
            </Link>
            <Link
              href="/pricing"
              data-cta="home-pricing"
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
