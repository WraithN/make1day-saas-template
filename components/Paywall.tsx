import type { ReactNode } from "react";
import { headers } from "next/headers";
import { getLang, tr } from "@/lib/i18n-server";
import { checkEntitlement } from "@/lib/license";

// Reusable content paywall. Wrap any premium content or section: entitled
// visitors (valid license key, active subscription, matched license email, or
// gate-off demo mode) see `children`; everyone else sees a locked CTA to
// /pricing. The decision is made server-side, so the locked body is never
// shipped to the client. The anonymous trial quota is deliberately excluded
// (allowTrial:false) so premium content never opens to unpaid visitors.
// This is the component-level counterpart to the edge interception in
// middleware.ts (guardPremium) — use either, or both.
export async function Paywall({
  children,
  lockedTitle,
  lockedDesc,
}: {
  children: ReactNode;
  lockedTitle?: string;
  lockedDesc?: string;
}) {
  const lang = await getLang();
  const t = (k: string) => tr(lang, k);

  const h = await headers();
  const req = new Request("https://local/", {
    headers: Object.fromEntries(h.entries()),
  });
  const ent = await checkEntitlement(req, undefined, { allowTrial: false });

  if (ent.allowed) return <>{children}</>;

  return (
    <div className="card max-w-2xl p-6">
      <h2 className="text-xl font-semibold">
        {lockedTitle ?? t("premium.lockedTitle")}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        {lockedDesc ?? t("premium.lockedDesc")}
      </p>
      <a href="/pricing" className="btn-solid mt-5 inline-block" data-cta="paywall-unlock">
        {t("premium.unlock")}
      </a>
      <p className="mt-4 text-xs text-ink-soft">{t("premium.gateOnNote")}</p>
    </div>
  );
}
