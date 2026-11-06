import { getLang } from "@/lib/i18n-server";
import { consoleCopy } from "@/lib/content/console";
import { msgCopy } from "@/lib/content/messaging";
import { listTickets } from "@/lib/tickets";
import { ConsoleSection, ConsoleTable } from "@/components/console/ConsoleUI";
import { TicketStatusSelect } from "@/components/TicketStatusSelect";

export const dynamic = "force-dynamic";

/**
 * Operator ticket console. The /admin/layout.tsx gate (operator session OR a
 * Supabase admin/staff role) protects this route; the PATCH endpoint repeats
 * the same check so a direct API call cannot bypass it.
 */
export default async function AdminTicketsPage() {
  const lang = await getLang();
  const c = msgCopy(lang);
  const g = consoleCopy(lang);
  const tickets = await listTickets({ operator: true });

  return (
    <ConsoleSection title={c["tickets.title"]} desc={c["tickets.subtitle"]}>
      <ConsoleTable
        columns={[
          g["console.created"],
          g["console.email"],
          c["mail.labelTicket"],
          c["support.subject"],
          c["support.message"],
          g["console.status"],
        ]}
        empty={c["tickets.empty"]}
        rows={tickets.map((t) => [
          new Date(t.createdAt).toLocaleDateString(),
          <span key="email" className="break-all font-mono text-xs">
            {t.email}
          </span>,
          <span key="id" className="font-mono text-xs" title={t.id}>
            {t.id.slice(0, 8)}
          </span>,
          t.subject,
          <span key="msg" className="block max-w-[320px] whitespace-pre-wrap break-words text-xs text-ink-soft">
            {t.message}
          </span>,
          <TicketStatusSelect key="status" id={t.id} status={t.status} />,
        ])}
      />
    </ConsoleSection>
  );
}
