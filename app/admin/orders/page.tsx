import { getLang } from "@/lib/i18n-server";
import { consoleCopy } from "@/lib/content/console";
import { getAdminSnapshot } from "@/lib/console";
import { ConsoleSection, ConsoleTable } from "@/components/console/ConsoleUI";

export const dynamic = "force-dynamic";

const PROVIDER_LABELS: Record<string, string> = {
  stripe: "Stripe",
  creem: "Creem",
  paypal: "PayPal",
  waffo: "Waffo",
};

function formatAmount(amount: number | null | undefined, currency?: string | null): string {
  if (amount == null) return "—";
  const cur = (currency ?? "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(amount);
  } catch {
    return `${cur} ${amount.toFixed(2)}`;
  }
}

export default async function AdminOrdersPage() {
  const lang = await getLang();
  const c = consoleCopy(lang);
  const { orders } = await getAdminSnapshot();

  return (
    <ConsoleSection
      title={c["admin.orders.title"]}
      desc={c["admin.orders.subtitle"]}
    >
      <ConsoleTable
        columns={[
          c["console.created"],
          c["admin.orders.customer"],
          c["admin.orders.provider"],
          c["console.plan"],
          c["admin.orders.amount"],
          c["console.status"],
          c["admin.orders.orderId"],
        ]}
        empty={c["admin.orders.none"]}
        rows={orders.map((o) => [
          new Date(o.createdAt).toLocaleDateString(),
          o.email ?? c["console.dash"],
          PROVIDER_LABELS[o.provider] ?? o.provider,
          o.plan ?? c["console.dash"],
          <span key="amt" className="font-mono text-xs">
            {formatAmount(o.amount, o.currency)}
          </span>,
          <span key="st" className="text-xs">
            {o.status}
          </span>,
          <span key="oid" className="font-mono text-xs">
            {o.providerOrderId}
          </span>,
        ])}
      />
    </ConsoleSection>
  );
}
