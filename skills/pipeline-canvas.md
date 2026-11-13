# Skill: Pipeline Canvas

The admin console (`/admin/workflows`) renders workflow runs as a live graph
with @xyflow/react: one node per Inngest step, status + recorded detail +
cost, animated edge on the currently running step. A trigger card starts
runs; the run picker chips switch between the last 10 runs.

## Rules
1. The canvas is a VIEW over `workflow_runs` — never a second source of
   truth. Do not store graph edits that the engine does not execute.
2. Requires the `workflow` (Inngest) skill: without it there are no runs to
   draw and `lib/workflows.ts` is not bundled.
3. Node labels are i18n keys (`admin.workflows.step.*`); add keys to
   `lib/content/console.ts` in all five locales when adding steps.
4. Keep the canvas read-only for status. If you add definition-editing,
   persist it through an admin-guarded API and have the Inngest function
   read the stored definition — the graph and the engine must agree.
5. Styling follows the active theme tokens (`--bg`, `--line`, `--accent`);
   import `@xyflow/react/dist/style.css` only inside the client component.
