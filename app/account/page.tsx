import Link from "next/link";
import { getLang } from "@/lib/i18n-server";
import { consoleCopy } from "@/lib/content/console";
import { getAccountSnapshot } from "@/lib/console";
import { roleKey } from "@/lib/rbac";
import { ConsoleSection, KeyValue, Notice } from "@/components/console/ConsoleUI";

export const dynamic = "force-dynamic";

export default async function AccountOverviewPage() {
  const lang = await getLang();
  const c = consoleCopy(lang);
  const snap = await getAccountSnapshot();

  const plan = snap.license?.plan ?? snap.subscription?.plan ?? null;
  const planLabel =
    plan === "buyout"
      ? c["console.buyout"]
      : plan === "care"
        ? c["console.care"]
        : c["console.free"];

  const roleLabel =
    snap.role === "admin" || snap.role === "staff" || snap.role === "member"
      ? c[roleKey(snap.role)]
      : c["role.member"];

  return (
    <div className="space-y-6">
      {!snap.email && (
        <Notice tone="warning">
          <strong>{c["account.noSession"]}</strong>
          <span className="mt-1 block">{c["account.noSessionDesc"]}</span>
          <Link href="/login" className="btn-solid mt-4 inline-block text-sm">
            {c["console.signIn"]}
          </Link>
        </Notice>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <ConsoleSection title={c["account.profile"]}>
          <KeyValue
            rows={[
              { key: c["console.email"], value: snap.email ?? c["console.dash"] },
              { key: "User ID", value: snap.userId ?? c["console.dash"] },
              {
                key: c["account.role"],
                value: snap.userId ? roleLabel : c["console.dash"],
              },
              {
                key: c["console.status"],
                value: snap.email ? c["console.active"] : c["console.inactive"],
              },
            ]}
          />
        </ConsoleSection>

        <ConsoleSection title={c["account.planCard"]}>
          <KeyValue
            rows={[
              { key: c["console.plan"], value: planLabel },
              {
                key: c["account.billing.provider"],
                value: snap.subscription?.provider ?? c["console.dash"],
              },
              {
                key: c["console.status"],
                value: snap.subscription?.status ?? c["console.dash"],
              },
              {
                key: c["account.billing.renews"],
                value: snap.subscription?.current_period_end
                  ? new Date(
                      snap.subscription.current_period_end,
                    ).toLocaleDateString()
                  : c["console.dash"],
              },
            ]}
          />
        </ConsoleSection>

        <ConsoleSection title={c["account.licenseCard"]}>
          <KeyValue
            rows={[
              { key: c["console.plan"], value: snap.license?.plan ?? c["console.dash"] },
              {
                key: c["console.created"],
                value: snap.license
                  ? new Date(snap.license.createdAt).toLocaleDateString()
                  : c["console.dash"],
              },
              {
                key: c["console.expires"],
                value: snap.license?.expiresAt
                  ? new Date(snap.license.expiresAt).toLocaleDateString()
                  : snap.license
                    ? c["console.never"]
                    : c["console.dash"],
              },
              {
                key: c["account.entitlement"],
                value: snap.license || snap.active ? c["console.active"] : c["console.previewOnly"],
              },
            ]}
          />
        </ConsoleSection>
      </div>

      <ConsoleSection
        title={c["account.entitlement"]}
        desc={c["account.entitlementDesc"]}
      >
        <Notice>{snap.active || snap.license ? c["account.activeDesc"] : c["account.freeDesc"]}</Notice>
      </ConsoleSection>

      <ConsoleSection title={c["account.quick"]}>
        <div className="flex flex-wrap gap-3">
          <Link href="/builder" className="btn-solid text-sm">
            {c["account.quickBuilder"]}
          </Link>
          <Link href="/pricing" className="btn-ghost text-sm">
            {c["account.quickPricing"]}
          </Link>
          <Link href="/account/licenses" className="btn-ghost text-sm">
            {c["account.quickLicenses"]}
          </Link>
        </div>
      </ConsoleSection>
    </div>
  );
}
