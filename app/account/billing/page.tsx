import Link from "next/link";
import { getLang } from "@/lib/i18n-server";
import { consoleCopy } from "@/lib/content/console";
import { getAccountSnapshot } from "@/lib/console";
import {
  ConsoleSection,
  KeyValue,
  Notice,
} from "@/components/console/ConsoleUI";

export const dynamic = "force-dynamic";

export default async function AccountBillingPage() {
  const lang = await getLang();
  const c = consoleCopy(lang);
  const { subscription: sub } = await getAccountSnapshot();

  return (
    <div className="max-w-3xl space-y-6">
      <ConsoleSection
        title={c["account.billing.title"]}
        desc={c["account.billing.subtitle"]}
      >
        {sub ? (
          <KeyValue
            rows={[
              { key: c["console.plan"], value: sub.plan ?? c["console.dash"] },
              { key: c["account.billing.provider"], value: sub.provider },
              { key: c["console.status"], value: sub.status },
              {
                key: c["account.billing.renews"],
                value: sub.current_period_end
                  ? new Date(sub.current_period_end).toLocaleDateString()
                  : c["console.dash"],
              },
              {
                key: c["console.created"],
                value: sub.created_at
                  ? new Date(sub.created_at).toLocaleDateString()
                  : c["console.dash"],
              },
              {
                key: "Customer ID",
                value: sub.provider_customer_id ?? c["console.dash"],
              },
            ]}
          />
        ) : (
          <Notice tone="warning">
            <strong>{c["account.billing.none"]}</strong>
            <span className="mt-1 block">{c["account.billing.noneDesc"]}</span>
            <Link href="/account/licenses" className="btn-ghost mt-4 inline-block text-sm">
              {c["account.nav.licenses"]}
            </Link>
          </Notice>
        )}
      </ConsoleSection>

      <ConsoleSection title={c["console.viewDocs"]}>
        <Notice>{c["account.billing.manageNote"]}</Notice>
        <Link href="/pricing" className="btn-solid mt-5 inline-block text-sm">
          {c["account.quickPricing"]}
        </Link>
      </ConsoleSection>
    </div>
  );
}
