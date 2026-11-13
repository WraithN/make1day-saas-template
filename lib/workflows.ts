// Shared run/step persistence for the Inngest workflow module
// (lib/workflows.ts). Same dual-backend pattern as lib/ai-usage.ts:
// Supabase when the service-role key is configured, local SQLite otherwise.

import { logger } from "@/lib/logger";

export type RunStep = {
  id: string;
  status: "queued" | "running" | "done" | "failed";
  detail?: string;
  costUsd?: number;
};

export type WorkflowRun = {
  id: string;
  pipeline: string;
  status: "queued" | "running" | "done" | "failed";
  steps: RunStep[];
  input: Record<string, unknown>;
  outputUrl: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

const PIPELINE_DEFAULT_STEPS = [
  "brief",
  "script",
  "storyboard",
  "quote",
  "render",
  "assemble",
];

function rowToRun(r: {
  id: string;
  pipeline: string;
  status: string;
  steps: unknown;
  input: unknown;
  output_url: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}): WorkflowRun {
  return {
    id: r.id,
    pipeline: r.pipeline,
    status: r.status as WorkflowRun["status"],
    steps: Array.isArray(r.steps) ? (r.steps as RunStep[]) : [],
    input: typeof r.input === "object" && r.input ? (r.input as Record<string, unknown>) : {},
    outputUrl: r.output_url,
    error: r.error,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const role = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (url && role) {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(url, role, { auth: { persistSession: false } });
  }
  return null;
}

export async function createRun(
  id: string,
  pipeline: string,
  input: Record<string, unknown>,
  steps: string[] = PIPELINE_DEFAULT_STEPS,
): Promise<void> {
  const run = {
    id,
    pipeline,
    status: "queued",
    steps: steps.map((s) => ({ id: s, status: "queued" as const })),
    input,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const supa = await db();
  if (supa) {
    const { error } = await supa.from("workflow_runs").insert({
      id: run.id,
      pipeline: run.pipeline,
      status: run.status,
      steps: run.steps,
      input: run.input,
      output_url: null,
      error: null,
      created_at: run.created_at,
      updated_at: run.updated_at,
    });
    if (!error) return;
    logger.warn("workflow create fell back to local store", { message: error.message });
  }
  const { run: sql } = await import("@/lib/sqlite");
  sql(
    `INSERT OR IGNORE INTO workflow_runs (id, pipeline, status, steps, input, output_url, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    run.id,
    run.pipeline,
    run.status,
    JSON.stringify(run.steps),
    JSON.stringify(run.input),
    null,
    null,
    run.created_at,
    run.updated_at,
  );
}

export async function updateRun(
  id: string,
  patch: Partial<Pick<WorkflowRun, "status" | "steps" | "outputUrl" | "error">>,
): Promise<void> {
  const set: string[] = [];
  const params: unknown[] = [];
  if (patch.status) { set.push("status = ?"); params.push(patch.status); }
  if (patch.steps) { set.push("steps = ?"); params.push(JSON.stringify(patch.steps)); }
  if ("outputUrl" in patch) { set.push("output_url = ?"); params.push(patch.outputUrl); }
  if ("error" in patch) { set.push("error = ?"); params.push(patch.error); }
  set.push("updated_at = ?");
  params.push(new Date().toISOString());
  params.push(id);

  const supa = await db();
  if (supa) {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.status) row.status = patch.status;
    if (patch.steps) row.steps = patch.steps;
    if ("outputUrl" in patch) row.output_url = patch.outputUrl;
    if ("error" in patch) row.error = patch.error;
    const { error } = await supa.from("workflow_runs").update(row).eq("id", id);
    if (!error) return;
    logger.warn("workflow update supabase failed", { message: error.message });
  }
  const { run: sql } = await import("@/lib/sqlite");
  sql(`UPDATE workflow_runs SET ${set.join(", ")} WHERE id = ?`, ...params);
}

export async function getRun(id: string): Promise<WorkflowRun | null> {
  const supa = await db();
  if (supa) {
    const { data } = await supa.from("workflow_runs").select("*").eq("id", id).maybeSingle();
    if (data) return rowToRun(data as never);
  }
  const { get } = await import("@/lib/sqlite");
  type SqliteRow = Record<string, string | number | null>;
  const r = get<SqliteRow>("SELECT * FROM workflow_runs WHERE id = ?", id);
  return r ? rowToRun(r as never) : null;
}

export async function listRuns(limit = 20): Promise<WorkflowRun[]> {
  const supa = await db();
  if (supa) {
    const { data } = await supa
      .from("workflow_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data?.length) return data.map((r) => rowToRun(r as never));
  }
  const { all } = await import("@/lib/sqlite");
  return all(
    "SELECT * FROM workflow_runs ORDER BY created_at DESC LIMIT ?",
    limit,
  ).map((r) => rowToRun(r as never));
}
