import { getLang } from "@/lib/i18n-server";
import { consoleCopy } from "@/lib/content/console";
import { getAdminSnapshot } from "@/lib/console";
import {
  ConsoleSection,
  ConsoleTable,
  StatCard,
} from "@/components/console/ConsoleUI";

export const dynamic = "force-dynamic";

export default async function AdminStatsPage() {
  const lang = await getLang();
  const c = consoleCopy(lang);
  const { stats } = await getAdminSnapshot();
  const topPages = Object.entries(stats.pages).sort((a, b) => b[1] - a[1]);
  const updated =
    stats.updatedAt && stats.updatedAt !== new Date(0).toISOString()
      ? new Date(stats.updatedAt).toLocaleString()
      : c["console.dash"];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label={c["admin.stats.total"]} value={stats.total} />
        <StatCard
          label={c["admin.stats.topPages"]}
          value={Object.keys(stats.pages).length}
          hint={`${c["admin.stats.updated"]}: ${updated}`}
        />
      </div>
      <ConsoleSection title={c["admin.stats.topPages"]}>
        <ConsoleTable
          columns={[c["admin.stats.page"], c["admin.stats.views"]]}
          empty={c["admin.stats.noData"]}
          rows={topPages.map(([page, count]) => [
            <span key="page" className="font-mono text-xs">
              {page}
            </span>,
            <span key="count" className="tabular-nums">
              {count}
            </span>,
          ])}
        />
      </ConsoleSection>
    </div>
  );
}
