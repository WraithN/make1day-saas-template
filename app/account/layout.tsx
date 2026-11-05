import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLang } from "@/lib/i18n-server";
import { consoleCopy } from "@/lib/content/console";
import { getAccountSnapshot } from "@/lib/console";
import { canAccessAdmin, roleKey } from "@/lib/rbac";
import { ConsoleNav } from "@/components/console/ConsoleNav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account — user console",
  robots: { index: false, follow: false },
};

// Stable constant so the generator can rewrite this single link when the
// admin console is not selected (see pruneConsoleLinks in lib/generator/prune.ts).
const ADMIN_HREF = "/admin";

export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const lang = await getLang();
  const c = consoleCopy(lang);
  const snap = await getAccountSnapshot();

  const items = [
    { href: "/account", label: c["account.nav.overview"] },
    { href: "/account/billing", label: c["account.nav.billing"] },
    { href: "/account/licenses", label: c["account.nav.licenses"] },
    { href: "/account/settings", label: c["account.nav.settings"] },
  ];

  const badge = snap.email
    ? `${c["console.signedInAs"]} · ${snap.email}`
    : c["console.notSignedIn"];

  const roleBadge =
    snap.role === "admin" || snap.role === "staff" || snap.role === "member"
      ? ` · ${c[roleKey(snap.role)]}`
      : "";

  return (
    <>
      <ConsoleNav
        items={items}
        eyebrow={c["account.eyebrow"]}
        title={c["account.title"]}
        subtitle={c["account.subtitle"]}
        badge={snap.email ? `${badge}${roleBadge}` : badge}
        badgeTone={snap.email ? "success" : "warning"}
        backLabel={c["console.backToSite"]}
        rightSlot={
          canAccessAdmin(snap.role)
            ? { href: ADMIN_HREF, label: c["account.adminEntry"] }
            : null
        }
      />
      <main className="wrap py-8 sm:py-10">{children}</main>
    </>
  );
}
