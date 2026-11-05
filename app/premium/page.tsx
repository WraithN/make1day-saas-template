import type { Metadata } from "next";
import { headers } from "next/headers";
import { getLang, tr } from "@/lib/i18n-server";
import { isLicenseGateEnabled } from "@/lib/env";
import { checkEntitlement } from "@/lib/license";
import { Nav } from "@/components/Nav";

// Inlined instead of components/console/ConsoleUI's <Notice> so this generic
// site page stays independent of the console-shared layer (which is pruned
// from generated projects when both dashboards are deselected).
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-line bg-surface p-3 text-sm text-ink-soft">
      {children}
    </p>
  );
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Premium — paid content demo",
  description:
    "A runnable content paywall sample. ShipKit's entitlement gate works with any payment provider.",
  robots: { index: false, follow: false },
};

export default async function PremiumPage() {
  const lang = await getLang();
  const t = (k: string) => tr(lang, k);

  const h = await headers();
  const req = new Request("https://local/", {
    headers: Object.fromEntries(h.entries()),
  });
  const ent = await checkEntitlement(req);
  const gateEnabled = isLicenseGateEnabled();

  return (
    <>
      <Nav />
      <section className="wrap py-10 sm:py-16">
        <div className="max-w-2xl">
          <div className="eyebrow mb-3">{t("premium.eyebrow")}</div>
          <h1 className="text-4xl font-semibold">
            {ent.allowed ? t("premium.title") : t("premium.lockedTitle")}
          </h1>
          <p className="mt-4 text-ink-soft">
            {ent.allowed ? t("premium.gateOnNote") : t("premium.lockedDesc")}
          </p>
        </div>

        {!gateEnabled && (
          <div className="mt-8">
            <Notice>{t("premium.gateOffNote")}</Notice>
          </div>
        )}

        {ent.allowed ? (
          <article className="card mt-10 max-w-2xl p-6">
            <h2 className="text-xl font-semibold">{t("premium.contentHeading")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              {t("premium.contentBody")}
            </p>
          </article>
        ) : (
          <div className="card mt-10 max-w-2xl p-6">
            <a href="/pricing" className="btn-solid">
              {t("premium.unlock")}
            </a>
            <p className="mt-4 text-xs text-ink-soft">{t("premium.gateOnNote")}</p>
          </div>
        )}
      </section>
    </>
  );
}
