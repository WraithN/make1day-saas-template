import { getLang } from "@/lib/i18n-server";
import { consoleCopy } from "@/lib/content/console";
import { getAccountSnapshot } from "@/lib/console";
import { roleKey } from "@/lib/rbac";
import { ConsoleSection, KeyValue, Notice } from "@/components/console/ConsoleUI";
import { SignOutButton } from "@/components/console/SignOutButton";
import { ProfileForm, type ProfileFormLabels } from "@/components/console/ProfileForm";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const lang = await getLang();
  const c = consoleCopy(lang);
  const snap = await getAccountSnapshot();

  const canEdit = !!snap.userId && !snap.demoMode;
  const roleLabel =
    snap.role === "admin" || snap.role === "staff" || snap.role === "member"
      ? c[roleKey(snap.role)]
      : c["role.member"];

  const labels: ProfileFormLabels = {
    title: c["account.profile.title"],
    subtitle: c["account.profile.subtitle"],
    displayName: c["account.profile.displayName"],
    displayNamePh: c["account.profile.displayNamePh"],
    fullName: c["account.profile.fullName"],
    fullNamePh: c["account.profile.fullNamePh"],
    company: c["account.profile.company"],
    companyPh: c["account.profile.companyPh"],
    save: c["account.profile.save"],
    saving: c["account.profile.saving"],
    saved: c["account.profile.saved"],
    errorGeneric: c["account.profile.error"],
    unchanged: c["account.profile.unchanged"],
  };

  return (
    <div className="max-w-3xl space-y-6">
      <ConsoleSection title={c["account.settings.title"]} desc={c["account.settings.subtitle"]}>
        <KeyValue
          rows={[
            { key: c["console.email"], value: snap.email ?? c["console.notSignedIn"] },
            { key: c["account.role"], value: roleLabel },
            { key: c["console.status"], value: snap.email ? c["console.active"] : c["console.inactive"] },
            {
              key: "Session mode",
              value: snap.demoMode ? "demo" : "supabase",
            },
          ]}
        />
      </ConsoleSection>

      <ConsoleSection title={labels.title} desc={labels.subtitle}>
        {canEdit ? (
          <ProfileForm
            initial={{
              displayName: snap.profile?.displayName ?? "",
              fullName: snap.profile?.fullName ?? "",
              company: snap.profile?.company ?? "",
            }}
            labels={labels}
          />
        ) : (
          <Notice tone="warning">{c["account.profile.locked"]}</Notice>
        )}
      </ConsoleSection>

      <div className="grid gap-5 sm:grid-cols-2">
        <ConsoleSection title={c["account.settings.language"]} desc={c["account.settings.languageDesc"]}>
          <Notice>sk_lang · en / zh / ja / fr</Notice>
        </ConsoleSection>
        <ConsoleSection title={c["account.settings.theme"]} desc={c["account.settings.themeDesc"]}>
          <Notice>sk_theme · dark / light</Notice>
        </ConsoleSection>
      </div>

      <ConsoleSection
        title={c["account.settings.session"]}
        desc={c["account.settings.sessionDesc"]}
        action={<SignOutButton label={c["console.signOut"]} />}
      >
        <Notice>{c["console.signedInAs"]}: {snap.email ?? c["console.dash"]}</Notice>
      </ConsoleSection>

      <ConsoleSection title={c["account.settings.scope"]} desc={c["account.settings.scopeDesc"]}>
        <Notice>{c["admin.system.limitsDesc"]}</Notice>
      </ConsoleSection>
    </div>
  );
}
