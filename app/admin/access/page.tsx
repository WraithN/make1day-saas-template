import { getLang } from "@/lib/i18n-server";
import { consoleCopy } from "@/lib/content/console";
import { getAdminSnapshot } from "@/lib/console";
import { ConsoleSection, ConsoleTable } from "@/components/console/ConsoleUI";

export const dynamic = "force-dynamic";

export default async function AdminAccessPage() {
  const lang = await getLang();
  const c = consoleCopy(lang);
  const { access } = await getAdminSnapshot();

  const statCards = [
    { label: c["admin.access.paidUsers"], value: String(access.paidEmailUsers) },
    { label: c["admin.access.issuedLicenses"], value: String(access.issuedLicenses) },
    { label: c["admin.access.subscriptions"], value: String(access.subscriptionRows) },
  ];

  return (
    <div className="space-y-6">
      <ConsoleSection
        title={c["admin.access.title"]}
        desc={c["admin.access.subtitle"]}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {statCards.map((s) => (
            <div key={s.label} className="card p-4">
              <div className="text-2xl font-semibold text-accent">{s.value}</div>
              <div className="mt-1 text-xs text-ink-soft">{s.label}</div>
            </div>
          ))}
        </div>
      </ConsoleSection>

      <ConsoleSection title={c["admin.access.grants"]}>
        <ConsoleTable
          columns={[
            c["admin.access.email"],
            c["console.plan"],
            c["admin.access.type"],
            c["console.created"],
          ]}
          empty={c["admin.access.none"]}
          rows={access.grants.map((g) => [
            g.email,
            g.plan ?? c["console.dash"],
            <span
              key="t"
              className={`rounded-full px-2 py-0.5 text-[11px] ${
                g.type === "license"
                  ? "border border-accent/40 bg-accent/10 text-accent"
                  : "border border-line bg-surface text-ink-soft"
              }`}
            >
              {g.type === "license"
                ? c["admin.access.typeLicense"]
                : c["admin.access.typeSubscription"]}
            </span>,
            g.since ? new Date(g.since).toLocaleDateString() : c["console.dash"],
          ])}
        />
      </ConsoleSection>
    </div>
  );
}
