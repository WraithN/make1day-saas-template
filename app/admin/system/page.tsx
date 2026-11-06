import { getLang } from "@/lib/i18n-server";
import { consoleCopy } from "@/lib/content/console";
import { getAdminSnapshot } from "@/lib/console";
import { roleKey } from "@/lib/rbac";
import { env } from "@/lib/env";
import {
  ConsoleSection,
  KeyValue,
  Notice,
} from "@/components/console/ConsoleUI";

export const dynamic = "force-dynamic";

const PROVIDER_LABELS: Record<string, string> = {
  stripe: "Stripe",
  creem: "Creem",
  paypal: "PayPal",
  waffo: "Waffo",
};

export default async function AdminSystemPage() {
  const lang = await getLang();
  const c = consoleCopy(lang);
  const snap = await getAdminSnapshot();

  const roleLabel =
    snap.currentRole === "admin" ||
    snap.currentRole === "staff" ||
    snap.currentRole === "member"
      ? c[roleKey(snap.currentRole)]
      : c["role.member"];

  return (
    <div className="max-w-3xl space-y-6">
      <ConsoleSection title={c["admin.system.title"]} desc={c["admin.system.subtitle"]}>
        <KeyValue
          rows={[
            {
              key: c["admin.system.adminAuth"],
              value: snap.protected ? c["admin.system.on"] : c["admin.system.off"],
            },
            {
              key: c["account.role"],
              value: `${roleLabel}${snap.canManage ? ` · ${c["admin.system.roleAdmin"]}` : ""}`,
            },
            {
              key: c["admin.system.adminRoles"],
              value: snap.roleAllowlist.length
                ? `${c["admin.system.set"]} · ${snap.roleAllowlist.length}`
                : c["admin.system.none"],
            },
            {
              key: c["admin.system.licenseGate"],
              value: snap.gateEnabled ? c["admin.system.on"] : c["admin.system.off"],
            },
            {
              key: c["admin.system.paymentProvider"],
              value: `${PROVIDER_LABELS[env.paymentProvider()] ?? env.paymentProvider()} · ${c["admin.system.paymentSwitchNote"]}`,
            },
            {
              key: c["admin.system.persistence"],
              value: snap.serviceRole
                ? c["admin.system.persistenceSupabase"]
                : c["admin.system.persistenceFile"],
            },
            {
              key: c["admin.system.userDirectory"],
              value:
                snap.userSource === "supabase"
                  ? c["admin.system.userDirectorySupabase"]
                  : snap.userSource === "local"
                    ? c["admin.system.userDirectoryLocal"]
                    : c["admin.system.none"],
            },
            {
              key: c["admin.system.analytics"],
              value: c["admin.system.persistenceFile"],
            },
            {
              key: c["console.email"],
              value: snap.adminEmail ?? c["console.dash"],
            },
          ]}
        />
      </ConsoleSection>

      <Notice>{c["admin.system.note"]}</Notice>

      <ConsoleSection title={c["admin.system.limits"]} desc={c["admin.system.limitsDesc"]}>
        <Notice tone="warning">{c["admin.protectNote"]}</Notice>
      </ConsoleSection>
    </div>
  );
}
