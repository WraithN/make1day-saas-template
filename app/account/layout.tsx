import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLang } from "@/lib/i18n-server";
import { consoleCopy } from "@/lib/content/console";
import { getAccountSnapshot } from "@/lib/console";
import { canAccessAdmin, roleKey } from "@/lib/rbac";
import { ConsoleNav } from "@/components/console/ConsoleNav";
import { SignOutButton } from "@/components/console/SignOutButton";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account — user console",
  robots: { index: false, follow: false },
};

// Stable constants so the generator can rewrite these links when a console is
// not selected (see lib/generator/prune.ts).
const ADMIN_HREF = "/admin";
// When the `multitenancy` Builder feature is OFF, the generator removes the
// workspaces nav entry and the workspaces page / component entirely.
const WORKSPACES_HREF = "/account/workspaces";

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
    { href: WORKSPACES_HREF, label: c["account.nav.workspaces"] },
  ];
  // Ops gate: hide the org UI where tenancy is not productised (make1day's
  // own site sets SHOW_WORKSPACES=false). Filtering by the literal — not the
  // constant — keeps the multitenancy-prune rewrite in prune.ts (which drops
  // the item line and the constant) compiling cleanly.
  const visible = env.showWorkspaces()
    ? items
    : items.filter((i) => i.href !== "/account/workspaces");

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
        items={visible}
        eyebrow={c["account.eyebrow"]}
        title={c["account.title"]}
        subtitle={c["account.subtitle"]}
        badge={snap.email ? `${badge}${roleBadge}` : badge}
        badgeTone={snap.email ? "success" : "warning"}
        backLabel={c["console.backToSite"]}
        action={<SignOutButton label={c["console.signOut"]} />}
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
