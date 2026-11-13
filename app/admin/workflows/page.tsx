import { getLang } from "@/lib/i18n-server";
import { consoleCopy } from "@/lib/content/console";
import { listRuns } from "@/lib/workflows";
import { WorkflowCanvas } from "@/components/console/WorkflowCanvas";
import { Notice } from "@/components/console/ConsoleUI";

export const dynamic = "force-dynamic";

// Pipeline Canvas: the run history as a live graph. Requires the workflow
// (Inngest) skill at build time - the files prune together.
export default async function AdminWorkflowsPage() {
  const lang = await getLang();
  const c = consoleCopy(lang);
  let runs: Awaited<ReturnType<typeof listRuns>> = [];
  try {
    runs = await listRuns(10);
  } catch {
    // workflow tables missing (migration not applied) - the canvas shows empty
    runs = [];
  }

  return (
    <div className="max-w-4xl space-y-6">
      <WorkflowCanvas
        runs={runs.map((r) => ({
          id: r.id,
          pipeline: r.pipeline,
          status: r.status,
          steps: r.steps,
          createdAt: r.createdAt,
          error: r.error,
        }))}
        copy={c as unknown as Record<string, string>}
      />
      <Notice>{c["admin.workflows.storageNote"]}</Notice>
    </div>
  );
}
