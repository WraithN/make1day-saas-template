import { CustomService } from "@/components/CustomService";
import { PricingCards, type Plan } from "@/components/PricingCards";
import { env, priceForPlan } from "@/lib/env";
import { paymentProviderLabel } from "@/lib/payments";
import { Trans } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

// Keep the structured-data amounts in sync with the cards below.
const BUYOUT_PRICE = "99";
const CARE_PRICE = "9";

export default async function PricingPage() {
  const lang = await getLang();
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
    },
    {
      id: "buyout",
      name: "Buyout",
      price: `$${BUYOUT_PRICE}`,
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
      price: `$${CARE_PRICE}`,
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
    },
  ];

  const rules = [
    "pricing.rules.r1",
    "pricing.rules.r2",
    "pricing.rules.r3",
    "pricing.rules.r4",
    "pricing.rules.r5",
    "pricing.rules.r6",
    "pricing.rules.r7",
    "pricing.rules.r8",
    "pricing.rules.r9",
  ];

  const site = env.siteUrl().replace(/\/$/, "");
  const offersJsonLd = {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: "ShipKit plans",
    itemListElement: [
      {
        "@type": "Offer",
        name: "Free",
        price: "0",
        priceCurrency: "USD",
        url: `${site}/pricing`,
      },
      {
        "@type": "Offer",
        name: "Buyout — one-time source license",
        price: BUYOUT_PRICE,
        priceCurrency: "USD",
        url: `${site}/pricing`,
      },
      {
        "@type": "Offer",
        name: "Care — monthly",
        price: CARE_PRICE,
        priceCurrency: "USD",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: CARE_PRICE,
          priceCurrency: "USD",
          unitText: "MONTH",
        },
        url: `${site}/pricing`,
      },
    ],
  };

  return (
    <section className="wrap py-12 sm:py-20">
      <div className="text-center">
        <div className="eyebrow mb-3">
          <Trans k="pricing.eyebrow" lang={lang} />
        </div>
        <h1 className="text-3xl font-semibold sm:text-4xl">
          <Trans k="pricing.heading" lang={lang} />
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-ink-soft">
          <Trans k="pricing.subtitle" lang={lang} />
        </p>
      </div>

      <div className="mt-8 text-center">
        <h2 className="text-xl font-semibold">
          <Trans k="pricing.model.heading" lang={lang} />
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-ink-soft">
          <Trans k="pricing.model.body" lang={lang} />
        </p>
      </div>

      <div className="mt-10">
        <PricingCards plans={plans} />
      </div>

      <CustomService
        bookingUrl={env.bookingUrl()}
        contactEmail={env.contactEmail()}
      />

      <div className="card mx-auto mt-6 max-w-3xl sm:mt-8 sm:p-6">
        <div className="eyebrow mb-3">
          <Trans k="pricing.rules.heading" lang={lang} />
        </div>
        <ul className="space-y-2 text-sm text-ink-soft">
          {rules.map((r) => (
            <li key={r} className="flex gap-2">
              <span className="text-accent">·</span>
              <span>
                <Trans k={r} lang={lang} />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-8 text-center font-mono text-xs text-muted">
        <Trans
          k="pricing.poweredBy"
          lang={lang}
          vars={{ provider: paymentProviderLabel() }}
        />
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
