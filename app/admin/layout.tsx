import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { getLang } from "@/lib/i18n-server";
import { consoleCopy } from "@/lib/content/console";
import { getAdminSnapshot } from "@/lib/console";
import { ConsoleNav } from "@/components/console/ConsoleNav";
import { Notice } from "@/components/console/ConsoleUI";
import { AdminLoginScreen } from "@/components/console/AdminLoginScreen";
import { AdminSignOutButton } from "@/components/console/AdminSignOutButton";
import {
  currentOperator,
  operatorIdentity,
  supabaseAdminAccess,
} from "@/lib/admin-session";
import { hasAdminUser } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin — operations console",
  robots: { index: false, follow: false },
};

function supabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const lang = await getLang();
  const c = consoleCopy(lang);

  // ── The gate ───────────────────────────────────────────────────────────
  // The Edge middleware can only see that the session cookie EXISTS; this is
  // the authoritative check (Node runtime, SQLite-backed). Two ways in:
  // the operator account (ADMIN_USER / ADMIN_PASSWORD) or a Supabase user
  // holding an admin/staff role. Neither → the console renders its own
  // sign-in screen instead of any data.
  const operator = await currentOperator();
  const supabaseAdmin = operator ? false : await supabaseAdminAccess();

  if (!operator && !supabaseAdmin) {
    let configured = false;
    try {
      configured = hasAdminUser();
    } catch {
      configured = false;
    }
    return (
      <Suspense fallback={null}>
        <AdminLoginScreen
          configured={configured}
          supabaseEnabled={supabaseConfigured()}
          copy={{
            eyebrow: c["admin.login.eyebrow"],
            title: c["admin.login.title"],
            subtitle: c["admin.login.subtitle"],
            username: c["admin.login.username"],
            usernamePlaceholder: c["admin.login.usernamePlaceholder"],
            password: c["admin.login.password"],
            submit: c["admin.login.submit"],
            submitting: c["admin.login.submitting"],
            errorMissing: c["admin.login.errorMissing"],
            errorInvalid: c["admin.login.errorInvalid"],
            errorRateLimited: c["admin.login.errorRateLimited"],
            errorUnknown: c["admin.login.errorUnknown"],
            hint: c["admin.login.hint"],
            notConfigured: c["admin.login.notConfigured"],
            security: c["admin.login.security"],
            accountLink: c["admin.login.accountLink"],
          }}
        />
      </Suspense>
    );
  }

  // Cheap read for the protection badge; pages call getAdminSnapshot() again
  // for their own data. All reads are local / Supabase, never a paid API.
  const { protected: guarded } = await getAdminSnapshot();
  const identity = await operatorIdentity();

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
        badge={
          identity
            ? `${c["console.signedInAs"]} ${identity}`
            : guarded
              ? c["console.protected"]
              : c["console.unprotected"]
        }
        badgeTone={guarded ? "success" : "warning"}
        backLabel={c["console.backToSite"]}
        action={
          <AdminSignOutButton
            label={c["console.signOut"]}
            pendingLabel={c["admin.signOutPending"]}
          />
        }
      />
      <main className="wrap space-y-6 py-8 sm:py-10">
        {!guarded && <Notice tone="warning">{c["admin.protectNote"]}</Notice>}
        {children}
      </main>
    </>
  );
}
