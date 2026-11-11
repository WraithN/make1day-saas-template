import Link from "next/link";
import { getLang } from "@/lib/i18n-server";
import { consoleCopy } from "@/lib/content/console";
import { getAccountSnapshot, getMyLicenses } from "@/lib/console";
import {
  ConsoleSection,
  ConsoleTable,
  Notice,
} from "@/components/console/ConsoleUI";

export const dynamic = "force-dynamic";

export default async function AccountLicensesPage() {
  const lang = await getLang();
  const c = consoleCopy(lang);
  const snap = await getAccountSnapshot();
  const mine = await getMyLicenses(snap.email);

  const planLabel = (plan: string) =>
    plan === "buyout"
      ? c["console.buyout"]
      : plan === "care"
        ? c["console.care"]
        : plan;

  return (
    <div className="space-y-6">
      <ConsoleSection
        title={c["account.licenses.title"]}
        desc={c["account.licenses.subtitle"]}
        action={
          <Link href="/license" className="btn-ghost text-sm">
            {c["account.licenses.redeem"]}
          </Link>
        }
      >
        {mine.length === 0 ? (
          <Notice tone="warning">
            <strong>{c["account.licenses.none"]}</strong>
            <span className="mt-1 block">{c["account.licenses.noneDesc"]}</span>
          </Notice>
        ) : (
          <ConsoleTable
            columns={[
              c["console.plan"],
              c["console.created"],
              c["console.expires"],
              c["console.updates"],
              c["console.order"],
              c["console.key"],
            ]}
            empty={c["account.licenses.none"]}
            rows={mine.map((l) => [
              planLabel(l.plan),
              new Date(l.createdAt).toLocaleDateString(),
              l.expiresAt
                ? new Date(l.expiresAt).toLocaleDateString()
                : c["console.never"],
              l.updatesUntil
                ? new Date(l.updatesUntil).toLocaleDateString()
                : c["console.dash"],
              <span key="order" className="font-mono text-xs">
                {l.orderId ?? c["console.dash"]}
              </span>,
              <span key="keycell" className="block">
                <code className="block max-w-xs break-all font-mono text-xs text-accent">
                  {l.key}
                </code>
                <Link
                  key="redeem"
                  href={`/license?key=${encodeURIComponent(l.key)}`}
                  className="mt-1 inline-block text-xs font-semibold text-accent hover:underline"
                >
                  {c["account.licenses.redeem"]} →
                </Link>
              </span>,
            ])}
          />
        )}
      </ConsoleSection>

      <Notice>{c["account.licenses.keyHint"]}</Notice>
    </div>
  );
}
