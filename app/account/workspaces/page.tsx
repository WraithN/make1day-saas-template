import { getLang } from "@/lib/i18n-server";
import { consoleCopy } from "@/lib/content/console";
import { getAccountSnapshot } from "@/lib/console";
import { getCurrentUser } from "@/lib/subscriptions";
import { getUserOrgs, getActiveOrgId } from "@/lib/org";
import { ConsoleSection } from "@/components/console/ConsoleUI";
import { WorkspaceManager } from "@/components/console/WorkspaceManager";
import { env } from "@/lib/env";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  // Ops can hide the org UI on deployments where tenancy is not productised
  // (make1day.dev's own site: SHOW_WORKSPACES=false). Customer builds default ON.
  if (!env.showWorkspaces()) notFound();
  const lang = await getLang();
  const c = consoleCopy(lang);
  const snap = await getAccountSnapshot();

  const user = snap.userId ? { id: snap.userId } : null;
  const orgs = user ? await getUserOrgs(user.id) : [];
  const activeOrgId = user ? await getActiveOrgId() : null;

  return (
    <div className="max-w-3xl space-y-6">
      <ConsoleSection
        title={c["account.workspaces.title"]}
        desc={c["account.workspaces.subtitle"]}
      >
        {snap.demoMode || !user ? (
          <p className="text-sm text-muted">
            {c["account.workspaces.locked"]}
          </p>
        ) : (
          <WorkspaceManager
            initialOrgs={orgs}
            activeOrgId={activeOrgId}
            labels={{
              createTitle: c["account.workspaces.createTitle"],
              createDesc: c["account.workspaces.createDesc"],
              namePh: c["account.workspaces.namePh"],
              create: c["account.workspaces.create"],
              creating: c["account.workspaces.creating"],
              listTitle: c["account.workspaces.listTitle"],
              active: c["account.workspaces.active"],
              switchTo: c["account.workspaces.switchTo"],
              personal: c["account.workspaces.personal"],
              current: c["account.workspaces.current"],
              error: c["account.workspaces.error"],
            }}
          />
        )}
      </ConsoleSection>
    </div>
  );
}
