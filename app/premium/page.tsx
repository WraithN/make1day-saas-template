import type { Metadata } from "next";
import { getLang, tr } from "@/lib/i18n-server";
import { isLicenseGateEnabled } from "@/lib/env";
import { Nav } from "@/components/Nav";
import { Paywall } from "@/components/Paywall";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Premium — paid content demo",
  description:
    "A runnable content paywall sample. ShipKit's entitlement gate works with any payment provider.",
  robots: { index: false, follow: false },
};

// This page is the runnable sample shipped with the "premium" Builder feature.
// The actual lock is enforced two ways: (1) edge interception in middleware.ts
// hard-redirects /premium to /pricing for unentitled visitors while the license
// gate is ON, and (2) the <Paywall> component below, which never renders the
// locked body to the client. Either mechanism works on its own — together they
// cover both the route and the content.
export default async function PremiumPage() {
  const lang = await getLang();
  const t = (k: string) => tr(lang, k);
  const gateEnabled = isLicenseGateEnabled();

  return (
    <>
      <Nav />
      <section className="wrap py-10 sm:py-16">
        <div className="max-w-2xl">
          <div className="eyebrow mb-3">{t("premium.eyebrow")}</div>
          <h1 className="text-4xl font-semibold">{t("premium.title")}</h1>
          <p className="mt-4 text-ink-soft">{t("premium.gateOnNote")}</p>
        </div>

        {!gateEnabled && (
          <div className="mt-8 rounded-lg border border-line bg-surface p-3 text-sm text-ink-soft">
            {t("premium.gateOffNote")}
          </div>
        )}

        <div className="mt-10 max-w-2xl">
          <Paywall>
            <article className="card p-6">
              <h2 className="text-xl font-semibold">
                {t("premium.contentHeading")}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                {t("premium.contentBody")}
              </p>
            </article>
          </Paywall>
        </div>
      </section>
    </>
  );
}
