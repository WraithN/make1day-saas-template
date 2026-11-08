import { BlackFridayCountdown } from "@/components/BlackFridayCountdown";
import { PricingCards, type Plan } from "@/components/PricingCards";
import { env, priceForPlanBf } from "@/lib/env";
import { Trans } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import Link from "next/link";

// Keep the structured-data amounts in sync with the cards below. The Black
// Friday page shows the PROMO prices (strong anchor against the struck list
// price); /pricing is untouched and uses its own constants.
const BF_BUYOUT_PRICE = "149";
const BF_BUYOUT_ORIGINAL = "299";
const BF_CARE_PRICE = "15";
const BF_CARE_ORIGINAL = "29";

export const metadata = {
  title: "Black Friday — make1day",
  description:
    "Black Friday: own the make1day source at the year's lowest price. One buyout, optional care. Offer ends when the countdown hits zero.",
};

export default async function BlackFridayPage() {
  const lang = await getLang();
  const active = env.blackFridayActive();
  const endsAt = env.blackFridayEndsAt();
  const site = env.siteUrl().replace(/\/$/, "");

  // ── Campaign OFF → show the "ended" state, route buyers back to /pricing ──
  if (!active) {
    return (
      <section className="wrap py-16 sm:py-24">
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
      ctaFallbackHref: "/pricing",
    },
    {
      id: "buyout",
      name: "Buyout",
      price: `$${BF_BUYOUT_PRICE}`,
      originalPrice: `$${BF_BUYOUT_ORIGINAL}`,
      period: "",
      once: true,
      bf: true,
      features: [
        "pricing.buyout.f1",
        "pricing.buyout.f2",
        "pricing.buyout.f3",
        "pricing.buyout.f4",
        "pricing.buyout.f5",
      ],
      ctaKey: "blackfriday.cta",
      // Resolves to the BF price id only when the operator has configured one
      // AND the campaign is active; otherwise null → CTA falls back to /pricing.
      priceId: priceForPlanBf("buyout") || null,
      ctaFallbackHref: "/pricing",
      highlight: true,
      note: "blackfriday.saveBuyout",
    },
    {
      id: "care",
      name: "Care",
      price: `$${BF_CARE_PRICE}`,
      originalPrice: `$${BF_CARE_ORIGINAL}`,
      period: "",
      monthly: true,
      bf: true,
      features: [
        "pricing.care.f1",
        "pricing.care.f2",
        "pricing.care.f3",
        "pricing.care.f4",
        "pricing.care.f5",
        "pricing.care.f6",
      ],
      ctaKey: "blackfriday.cta",
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
      },
      {
        "@type": "Offer",
        name: "Care — monthly (Black Friday)",
        price: BF_CARE_PRICE,
        priceCurrency: "USD",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: BF_CARE_PRICE,
          priceCurrency: "USD",
          unitText: "MONTH",
        },
        url: `${site}/black-friday`,
      },
    ],
  };

  return (
    <section className="wrap py-12 sm:py-20">
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
        <PricingCards plans={plans} />
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
