import Link from "next/link";
import { getLang } from "@/lib/i18n-server";
import { consoleCopy } from "@/lib/content/console";
import { getAdminSnapshot } from "@/lib/console";
import {
  ConsoleSection,
  ConsoleTable,
  StatCard,
} from "@/components/console/ConsoleUI";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const lang = await getLang();
  const c = consoleCopy(lang);
  const snap = await getAdminSnapshot();

  const shortcuts = [
    { href: "/admin/licenses", label: c["admin.overview.quickLicenses"] },
    { href: "/admin/users", label: c["admin.overview.quickUsers"] },
    { href: "/admin/stats", label: c["admin.overview.quickStats"] },
    { href: "/admin/system", label: c["admin.overview.quickSystem"] },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={c["admin.overview.licenses"]} value={snap.licenses.length} />
        <StatCard label={c["admin.overview.pageviews"]} value={snap.stats.total} />
        <StatCard label={c["admin.overview.users"]} value={snap.users.length} />
      </div>

      <ConsoleSection title={c["admin.overview.quick"]}>
        <div className="flex flex-wrap gap-3">
          {shortcuts.map((s) => (
            <Link key={s.href} href={s.href} className="btn-ghost text-sm">
              {s.label}
            </Link>
          ))}
        </div>
      </ConsoleSection>

      <ConsoleSection title={c["admin.overview.recent"]}>
        <ConsoleTable
          columns={[
            c["console.created"],
            c["console.plan"],
            c["console.email"],
            c["console.order"],
          ]}
          empty={c["admin.licenses.none"]}
          rows={snap.licenses.slice(0, 8).map((l) => [
            new Date(l.createdAt).toLocaleDateString(),
            l.plan,
            l.email ?? c["console.dash"],
            <span key="order" className="font-mono text-xs">
              {l.orderId ?? c["console.dash"]}
            </span>,
          ])}
        />
      </ConsoleSection>
    </div>
  );
}
