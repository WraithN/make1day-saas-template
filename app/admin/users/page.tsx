import { getLang } from "@/lib/i18n-server";
import { consoleCopy } from "@/lib/content/console";
import { getAdminSnapshot, type ConsoleUser } from "@/lib/console";
import {
  ConsoleSection,
  ConsoleTable,
  Notice,
} from "@/components/console/ConsoleUI";
import { UserRoleSelect, type RoleOption } from "@/components/console/UserRoleSelect";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const lang = await getLang();
  const c = consoleCopy(lang);
  const snap = await getAdminSnapshot();

  const sourceLabel =
    snap.userSource === "supabase"
      ? c["admin.users.sourceSupabase"]
      : snap.userSource === "local"
        ? c["admin.users.sourceLocal"]
        : c["admin.users.sourceDerived"];

  const roleOptions: RoleOption[] = [
    { value: "admin", label: c["role.admin"] },
    { value: "staff", label: c["role.staff"] },
    { value: "member", label: c["role.member"] },
  ];

  const currentIdentity = (snap.adminEmail ?? "").toLowerCase();

  // A role change is written to Supabase `profiles` when a service-role key
  // is configured, otherwise to the local SQLite mirror. Only when neither
  // store is reachable does the column have to stay read-only — otherwise the
  // click would fail with a 500 instead of explaining itself.
  const canEditRoles = snap.canManage && snap.roleStore !== "none";

  const originLabel = (u: ConsoleUser): string => {
    switch (u.origin) {
      case "supabase":
        return c["admin.users.originSupabase"];
      case "local":
        return c["admin.users.originLocal"];
      case "license":
        return c["admin.users.originLicense"];
      case "order":
        return c["admin.users.originOrder"];
      case "operator":
        return c["admin.users.originOperator"];
      default:
        return c["admin.users.originSubscription"];
    }
  };

  return (
    <div className="space-y-6">
      <ConsoleSection
        title={c["admin.users.title"]}
        desc={c["admin.users.subtitle"]}
      >
        <p className="text-xs text-muted">
          {c["admin.users.source"]}: {sourceLabel}
        </p>
        <ConsoleTable
          columns={[
            c["console.email"],
            c["console.created"],
            c["console.plan"],
            c["admin.users.colSource"],
            c["account.role"],
          ]}
          empty={c["admin.users.none"]}
          rows={snap.users.map((u) => {
            // The operator account is the visitor's own row — its role is
            // fixed by the credential, so it must never be editable.
            const isSelf =
              u.isOperator === true ||
              u.email.toLowerCase() === currentIdentity;
            const editable = canEditRoles && !isSelf;
            return [
              <span key="email" className="font-mono text-xs">
                {u.email}
                {isSelf ? (
                  <span className="ml-2 text-muted">({c["admin.users.you"]})</span>
                ) : null}
              </span>,
              u.createdAt
                ? new Date(u.createdAt).toLocaleDateString()
                : c["console.dash"],
              u.plan ?? c["console.dash"],
              originLabel(u),
              <UserRoleSelect
                key="role"
                target={{ email: u.email }}
                current={u.role ?? "member"}
                options={roleOptions}
                disabled={!editable}
                selfLabel={c["account.role"]}
                updatingLabel={c["admin.users.changeRole"]}
              />,
            ];
          })}
        />
      </ConsoleSection>

      {snap.userSource === "local" && (
        <Notice>{c["admin.users.localNote"]}</Notice>
      )}
      {snap.userSource === "derived" && (
        <Notice tone="warning">{c["admin.users.derivedNote"]}</Notice>
      )}
      {snap.identityKind === "operator" && (
        <Notice>{c["admin.users.operatorNote"]}</Notice>
      )}
      {snap.identityKind === "supabase" && !snap.canManage && (
        <Notice tone="warning">{c["admin.users.readonlyNote"]}</Notice>
      )}
      {snap.identityKind === "supabase" && snap.canManage && (
        <Notice>{c["admin.users.promoteNote"]}</Notice>
      )}
      {snap.canManage && snap.roleStore === "none" && (
        <Notice tone="warning">{c["admin.users.roleWriteNote"]}</Notice>
      )}
      {snap.userSource === "local" && (
        <Notice>{c["admin.users.migrateNote"]}</Notice>
      )}
    </div>
  );
}
