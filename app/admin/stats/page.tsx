import { getLang } from "@/lib/i18n-server";
import { consoleCopy } from "@/lib/content/console";
import { getAdminSnapshot } from "@/lib/console";
import { getTrafficReport } from "@/lib/traffic";
import { getAiUsageSummary, listAiUsage } from "@/lib/ai-usage";
import {
  ConsoleSection,
  ConsoleTable,
  StatCard,
} from "@/components/console/ConsoleUI";
import { Funnel } from "@/components/console/Funnel";

export const dynamic = "force-dynamic";

// AI-quota copy is intentionally hard-coded English: the shared console
// dictionaries are frozen while this feature is being built.
const AI_COPY = {
  calls: "AI calls today",
  limit: "Daily quota per user",
  activeUsers: "Users on AI today",
  used: "Quota units consumed",
  store: "Store",
  storeLocal: "Local SQLite",
  storeSupabase: "Supabase",
  section: "AI usage quota",
  sectionDesc:
    "Every AI chat request spends one unit of the caller's daily budget (AI_MESSAGES_PER_DAY). The counter resets at 00:00 UTC.",
  user: "User",
  callsCol: "Calls today",
  noData: "No AI calls recorded today.",
  day: "Quota day (UTC)",
} as const;

function percent(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  const pct = value * 100;
  if (pct > 0 && pct < 1) return "<1%";
  return `${Math.round(pct)}%`;
}

export default async function AdminStatsPage() {
  const lang = await getLang();
  const c = consoleCopy(lang);
  const { stats } = await getAdminSnapshot();
  const traffic = await getTrafficReport();
  const aiUsage = await getAiUsageSummary();
  let aiRows: { userId: string; used: number }[] = [];
  try {
    aiRows = await listAiUsage(aiUsage.day);
  } catch {
    // The per-user breakdown is a nice-to-have; the totals above are not.
    aiRows = [];
  }

  const topPages = Object.entries(stats.pages).sort((a, b) => b[1] - a[1]);
  const updated =
    stats.updatedAt && stats.updatedAt !== new Date(0).toISOString()
      ? new Date(stats.updatedAt).toLocaleString()
      : c["console.dash"];

  // The funnel is only meaningful once at least one session was recorded.
  const hasTraffic = traffic.sessions > 0;

  return (
    <div className="space-y-6">
      {/* ── Headline metrics ───────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={c["admin.stats.total"]}
          value={traffic.pageviews || stats.total}
          hint={c["admin.stats.window"]}
        />
        <StatCard
          label={c["admin.stats.visitors"]}
          value={traffic.visitors}
          hint={`${c["admin.stats.sessions"]}: ${traffic.sessions}`}
        />
        <StatCard
          label={c["admin.stats.bounceRate"]}
          value={percent(traffic.bounceRate)}
          hint={`${c["admin.stats.pagesPerSession"]}: ${traffic.pagesPerSession.toFixed(1)}`}
        />
        <StatCard
          label={c["admin.stats.ctr"]}
          value={percent(traffic.ctr)}
          hint={`${c["admin.stats.clicks"]}: ${traffic.ctas.reduce((n, c2) => n + c2.clicks, 0)}`}
        />
        <StatCard
          label={c["admin.stats.conversionRate"]}
          value={percent(traffic.conversionRate)}
          hint={`${c["admin.stats.funnel.conversion"]}: ${traffic.funnel.find((f) => f.key === "conversion")?.sessions ?? 0}`}
        />
        <StatCard
          label={c["admin.stats.updated"]}
          value={traffic.updatedAt ? new Date(traffic.updatedAt).toLocaleDateString() : c["console.dash"]}
          hint={c["admin.stats.window"]}
        />
      </div>

      {/* ── AI usage quota ──────────────────────────────────────────────── */}
      <ConsoleSection title={AI_COPY.section} desc={AI_COPY.sectionDesc}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={AI_COPY.calls}
            value={aiUsage.calls}
            hint={`${AI_COPY.day}: ${aiUsage.day}`}
          />
          <StatCard
            label={AI_COPY.limit}
            value={aiUsage.limit}
            hint={`${AI_COPY.store}: ${aiUsage.local ? AI_COPY.storeLocal : AI_COPY.storeSupabase}`}
          />
          <StatCard
            label={AI_COPY.activeUsers}
            value={aiUsage.activeUsers}
            hint={AI_COPY.used}
          />
          <StatCard
            label={AI_COPY.used}
            value={aiUsage.calls}
            hint={`${AI_COPY.limit}: ${aiUsage.limit}`}
          />
        </div>
        <div className="mt-5">
          <ConsoleTable
            columns={[AI_COPY.user, AI_COPY.callsCol, AI_COPY.limit]}
            empty={AI_COPY.noData}
            rows={aiRows.map((row) => [
              <span key="user" className="font-mono text-xs">
                {row.userId}
              </span>,
              <span key="used" className="tabular-nums">
                {row.used}
              </span>,
              <span key="limit" className="tabular-nums">
                {aiUsage.limit}
              </span>,
            ])}
          />
        </div>
      </ConsoleSection>

      {/* ── Funnel ───────────────────────────────────────────────────────── */}
      <ConsoleSection
        title={c["admin.stats.funnel"]}
        desc={c["admin.stats.funnelSubtitle"]}
      >
        {hasTraffic ? (
          <Funnel
            steps={traffic.funnel}
            copy={{
              labels: {
                visitors: c["admin.stats.funnel.visitors"],
                engaged: c["admin.stats.funnel.engaged"],
                cta: c["admin.stats.funnel.cta"],
                checkout: c["admin.stats.funnel.checkout"],
                conversion: c["admin.stats.funnel.conversion"],
              },
              share: c["admin.stats.funnel.share"],
              stepRate: c["admin.stats.funnel.stepRate"],
            }}
          />
        ) : (
          <p className="py-6 text-center text-sm text-ink-soft">
            {c["admin.stats.noEvents"]}
          </p>
        )}
      </ConsoleSection>

      {/* ── CTA performance ─────────────────────────────────────────────── */}
      {traffic.ctas.length > 0 && (
        <ConsoleSection title={c["admin.stats.ctas"]}>
          <ConsoleTable
            columns={[
              c["admin.stats.ctaLabel"],
              c["admin.stats.clicks"],
              c["admin.stats.sessions"],
            ]}
            empty={c["admin.stats.noEvents"]}
            rows={traffic.ctas.map((row) => [
              <span key="label" className="font-mono text-xs">
                {row.label}
              </span>,
              <span key="clicks" className="tabular-nums">
                {row.clicks}
              </span>,
              <span key="sessions" className="tabular-nums">
                {row.sessions}
              </span>,
            ])}
          />
        </ConsoleSection>
      )}

      {/* ── Traffic sources ─────────────────────────────────────────────── */}
      {traffic.referrers.length > 0 && (
        <ConsoleSection title={c["admin.stats.referrers"]}>
          <ConsoleTable
            columns={[c["admin.stats.source"], c["admin.stats.sessions"]]}
            empty={c["admin.stats.noEvents"]}
            rows={traffic.referrers.map((row) => [
              <span key="source" className="font-mono text-xs">
                {row.source}
              </span>,
              <span key="sessions" className="tabular-nums">
                {row.sessions}
              </span>,
            ])}
          />
        </ConsoleSection>
      )}

      {/* ── Top pages ────────────────────────────────────────────────────── */}
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
        <p className="mt-3 text-xs text-muted">
          {c["admin.stats.updated"]}: {updated}
        </p>
      </ConsoleSection>
    </div>
  );
}
