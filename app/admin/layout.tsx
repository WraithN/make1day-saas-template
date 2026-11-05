import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLang } from "@/lib/i18n-server";
import { consoleCopy } from "@/lib/content/console";
import { getAdminSnapshot } from "@/lib/console";
import { ConsoleNav } from "@/components/console/ConsoleNav";
import { Notice } from "@/components/console/ConsoleUI";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin — operations console",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const lang = await getLang();
  const c = consoleCopy(lang);
  // Cheap read for the protection badge; pages call getAdminSnapshot() again
  // for their own data. All reads are local / Supabase, never a paid API.
  const { protected: guarded } = await getAdminSnapshot();

  const items = [
    { href: "/admin", label: c["admin.nav.overview"] },
    { href: "/admin/users", label: c["admin.nav.users"] },
    { href: "/admin/licenses", label: c["admin.nav.licenses"] },
    { href: "/admin/orders", label: c["admin.nav.orders"] },
    { href: "/admin/access", label: c["admin.nav.access"] },
    { href: "/admin/stats", label: c["admin.nav.stats"] },
    { href: "/admin/system", label: c["admin.nav.system"] },
  ];

  return (
    <>
      <ConsoleNav
        items={items}
        eyebrow={c["admin.eyebrow"]}
        title={c["admin.title"]}
        subtitle={c["admin.subtitle"]}
        badge={guarded ? c["console.protected"] : c["console.unprotected"]}
        badgeTone={guarded ? "success" : "warning"}
        backLabel={c["console.backToSite"]}
      />
      <main className="wrap space-y-6 py-8 sm:py-10">
        {!guarded && <Notice tone="warning">{c["admin.protectNote"]}</Notice>}
        {children}
      </main>
    </>
  );
}
