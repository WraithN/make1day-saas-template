import { BlackFridayCountdown } from "@/components/BlackFridayCountdown";
import { BlackFridayPlans, type BfPlan } from "@/components/BlackFridayPlans";
import { HreflangLinks } from "@/components/HreflangLinks";
import { env, priceForPlanBf, primaryPaymentsReady } from "@/lib/env";
import { PRICES } from "@/lib/pricing";
import { Trans } from "@/lib/i18n";
import { getCanonicalLang, getLang } from "@/lib/i18n-server";
import { langAlternatePaths, variantCanonical } from "@/lib/seo-alternates";
import Link from "next/link";

// Two-tier Black Friday pricing. The buy button charges the BF price (lowest);
// the struck price is the list anchor.
// Prices live in lib/pricing.ts (single source of truth shared with /pricing,
// JSON-LD and the machine-readable docs).
const BF_BUYOUT_ORIGINAL = String(PRICES.buyout.regular);
const BF_BUYOUT_PRICE = String(PRICES.buyout.bf);
const BF_CARE_ORIGINAL = String(PRICES.care.regular);
const BF_CARE_PRICE = String(PRICES.care.bf);

export async function generateMetadata() {
  const canonical = variantCanonical("/black-friday", await getCanonicalLang());
  return {
    title: "Black Friday — make1day",
    description:
      "Black Friday: own the make1day source at the year's lowest price. The struck list price is the anchor; the Black Friday deal is what the buy button charges while the timer runs.",
    alternates: {
      canonical,
      languages: langAlternatePaths("/black-friday"),
    },
    openGraph: { url: canonical },
  };
}

export default async function BlackFridayPage() {
  const lang = await getLang();
  const active = env.blackFridayActive();
  const endsAt = env.blackFridayEndsAt();
  const site = env.siteUrl().replace(/\/$/, "");

  // ── Campaign OFF → show the "ended" state, route buyers back to /pricing ──
  if (!active) {
    return (
      <section className="wrap py-16 sm:py-24">
        <HreflangLinks path="/black-friday" />
        <div className="mx-auto max-w-xl text-center">
          <div className="eyebrow mb-3">
            <Trans k="blackfriday.eyebrow" lang={lang} />
          </div>
          <h1 className="text-3xl font-semibold sm:text-4xl">
            <Trans k="blackfriday.ended" lang={lang} />
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-ink-soft">
            <Trans k="blackfriday.endedBody" lang={lang} />
          </p>
          <Link
            href="/pricing"
            data-cta="bf-view-plans"
            className="btn-solid mt-8 inline-block"
          >
            <Trans k="blackfriday.viewPlans" lang={lang} />
          </Link>
        </div>
      </section>
    );
  }

  // ── Campaign ON → hero + countdown + promo cards ──
  const plans: BfPlan[] = [
    {
      id: "free",
      name: "Free",
      originalPrice: "",
      bfPrice: "$0",
      forever: true,
      features: ["pricing.free.f1", "pricing.free.f2", "pricing.free.f3"],
      priceId: null,
      ctaFallbackHref: "/pricing",
    },
    {
      id: "buyout",
      name: "Buyout",
      originalPrice: `$${BF_BUYOUT_ORIGINAL}`,
      bfPrice: `$${BF_BUYOUT_PRICE}`,
      once: true,
      features: [
        "pricing.buyout.f1",
        "pricing.buyout.f2",
        "pricing.buyout.f3",
        "pricing.buyout.f4",
        "pricing.buyout.f5",
      ],
      priceId: priceForPlanBf("buyout") || null,
      ctaFallbackHref: "/pricing",
      note: "blackfriday.saveBuyout",
    },
    {
      id: "care",
      name: "Care",
      originalPrice: `$${BF_CARE_ORIGINAL}`,
      bfPrice: `$${BF_CARE_PRICE}`,
      monthly: true,
      features: [
        "pricing.care.f1",
        "pricing.care.f2",
        "pricing.care.f3",
        "pricing.care.f4",
        "pricing.care.f5",
        "pricing.care.f6",
      ],
      priceId: priceForPlanBf("care") || null,
      ctaFallbackHref: "/pricing",
      note: "blackfriday.saveCare",
    },
  ];

  const offersJsonLd = {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: "make1day Black Friday plans",
    itemListElement: [
      {
        "@type": "Offer",
        name: "Free",
        price: "0",
        priceCurrency: "USD",
        url: `${site}/black-friday`,
      },
      {
        "@type": "Offer",
        name: "Buyout — one-time source license (Black Friday)",
        price: BF_BUYOUT_PRICE,
        priceCurrency: "USD",
        url: `${site}/black-friday`,
        ...(endsAt ? { priceValidUntil: new Date(endsAt).toISOString().slice(0, 10) } : {}),
      },
      {
        "@type": "Offer",
        name: "Care — monthly (Black Friday)",
        price: BF_CARE_PRICE,
        priceCurrency: "USD",
        url: `${site}/black-friday`,
        ...(endsAt ? { priceValidUntil: new Date(endsAt).toISOString().slice(0, 10) } : {}),
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: BF_CARE_PRICE,
          priceCurrency: "USD",
          unitText: "MONTH",
        },
      },
    ],
  };

  return (
    <section className="wrap py-12 sm:py-20">
      <HreflangLinks path="/black-friday" />
      <div className="text-center">
        <div className="eyebrow mb-3">
          <Trans k="blackfriday.eyebrow" lang={lang} />
        </div>
        <h1 className="text-3xl font-semibold sm:text-4xl">
          <Trans k="blackfriday.heading" lang={lang} />
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-ink-soft">
          <Trans k="blackfriday.subtitle" lang={lang} />
        </p>
        <div className="mt-8 flex justify-center">
          <BlackFridayCountdown endsAt={endsAt || undefined} />
        </div>
      </div>

      <div className="mt-10">
        <BlackFridayPlans
          plans={plans}
          paymentsReady={primaryPaymentsReady()}
        />
      </div>

      <div className="card mx-auto mt-10 max-w-3xl sm:p-6">
        <div className="eyebrow mb-3">
          <Trans k="blackfriday.reassureHeading" lang={lang} />
        </div>
        <p className="text-sm leading-relaxed text-ink-soft">
          <Trans k="blackfriday.reassureBody" lang={lang} />
        </p>
      </div>

      <p className="mt-8 text-center font-mono text-xs text-muted">
        <Trans k="blackfriday.badge" lang={lang} />
      </p>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(offersJsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </section>
  );
}
