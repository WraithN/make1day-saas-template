import { getLang } from "@/lib/i18n-server";
import { consoleCopy } from "@/lib/content/console";
import { getAdminSnapshot } from "@/lib/console";
import { ConsoleSection, ConsoleTable } from "@/components/console/ConsoleUI";

export const dynamic = "force-dynamic";

/**
 * Operator view of keys issued by paid webhooks. The /admin Basic-Auth rule in
 * middleware.ts (plus the optional ADMIN_EMAILS role check) guards this route.
 */
export default async function AdminLicensesPage() {
  const lang = await getLang();
  const c = consoleCopy(lang);
  const { licenses } = await getAdminSnapshot();

  return (
    <ConsoleSection
      title={c["admin.licenses.title"]}
      desc={c["admin.licenses.subtitle"]}
    >
      <ConsoleTable
        columns={[
          c["console.created"],
          c["console.plan"],
          c["console.email"],
          c["console.order"],
          c["console.key"],
        ]}
        empty={c["admin.licenses.none"]}
        rows={licenses.map((l) => [
          new Date(l.createdAt).toLocaleDateString(),
          l.plan,
          l.email ?? c["console.dash"],
          <span key="order" className="font-mono text-xs">
            {l.orderId ?? c["console.dash"]}
          </span>,
          <code key="key" className="block max-w-xs break-all font-mono text-xs text-accent">
            {l.key}
          </code>,
        ])}
      />
    </ConsoleSection>
  );
}
