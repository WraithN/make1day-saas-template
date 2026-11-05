import { getLang } from "@/lib/i18n-server";
import { consoleCopy } from "@/lib/content/console";
import { getAdminSnapshot } from "@/lib/console";
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
      : c["admin.users.sourceDerived"];

  const roleOptions: RoleOption[] = [
    { value: "admin", label: c["role.admin"] },
    { value: "staff", label: c["role.staff"] },
    { value: "member", label: c["role.member"] },
  ];

  const currentEmail = (snap.adminEmail ?? "").toLowerCase();

  return (
    <div className="space-y-6">
      <ConsoleSection
        title={c["admin.users.title"]}
        desc={c["admin.users.subtitle"]}
      >
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
            const isSelf = u.email.toLowerCase() === currentEmail;
            const editable = snap.canManage && !isSelf;
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
              sourceLabel,
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

      {snap.userSource === "derived" && (
        <Notice tone="warning">{c["admin.users.derivedNote"]}</Notice>
      )}
      {!snap.canManage && (
        <Notice tone="warning">{c["admin.users.readonlyNote"]}</Notice>
      )}
      {snap.canManage && (
        <Notice>{c["admin.users.promoteNote"]}</Notice>
      )}
    </div>
  );
}
