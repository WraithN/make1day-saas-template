"use client";

// Pipeline Canvas (@xyflow/react) - the n8n-style visual for durable
// workflow runs. Read-only during execution (every node shows its Inngest
// step status + recorded detail); a trigger form on the side starts new
// runs. The graph is rendered FROM the run record, not hand-drawn state,
// so what you see is what the engine actually did.

import { useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

type RunStep = {
  id: string;
  status: "queued" | "running" | "done" | "failed";
  detail?: string;
  costUsd?: number;
};

type RunSummary = {
  id: string;
  pipeline: string;
  status: string;
  steps: RunStep[];
  createdAt: string;
  error: string | null;
};

const STATUS_TONE: Record<string, string> = {
  queued: "border-line text-ink-soft",
  running: "border-accent text-accent",
  done: "border-emerald-500/70 text-emerald-600",
  failed: "border-red-500/70 text-red-600",
};

function StepNode({ data }: { data: { label: string; sub: string; tone: string } }) {
  return (
    <div className={`rounded-xl border-2 bg-bg px-4 py-3 text-sm shadow-sm ${data.tone}`}>
      <div className="font-semibold">{data.label}</div>
      {data.sub && <div className="mt-1 max-w-44 font-mono text-[10px] leading-relaxed text-muted">{data.sub}</div>}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const NODE_TYPES = { step: StepNode };

export function WorkflowCanvas({
  runs,
  copy,
}: {
  runs: RunSummary[];
  copy: Record<string, string>;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);

  const latest = runs[Math.min(selected, Math.max(0, runs.length - 1))];

  const { nodes, edges } = useMemo(() => {
    const steps = latest?.steps ?? [];
    const nodes: Node[] = steps.map((s, i) => ({
      id: s.id,
      type: "step",
      position: { x: i * 220, y: 60 },
      data: {
        label: copy[`admin.workflows.step.${s.id}`] ?? s.id,
        sub: [s.status, s.detail, s.costUsd != null ? `$${s.costUsd.toFixed(4)}` : null]
          .filter(Boolean)
          .join(" · "),
        tone: STATUS_TONE[s.status] ?? STATUS_TONE.queued,
      },
    }));
    const edges: Edge[] = nodes.slice(1).map((n, i) => ({
      id: `${nodes[i].id}-${n.id}`,
      source: nodes[i].id,
      target: n.id,
      animated: latest?.status === "running" && n.id === steps[i + 1]?.id,
    }));
    return { nodes, edges };
  }, [latest, copy]);

  async function trigger() {
    const brief = (document.getElementById("pipeline-brief") as HTMLTextAreaElement | null)?.value ?? "";
    if (brief.trim().length < 8) {
      setNote(copy["admin.workflows.needBrief"]);
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      const j = await res.json().catch(() => ({}));
      setNote(res.ok ? `${copy["admin.workflows.started"]} ${j.runId ?? ""}` : (j.message ?? j.error ?? "failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="eyebrow mb-2">{copy["admin.workflows.trigger"]}</div>
        <textarea
          id="pipeline-brief"
          rows={2}
          placeholder={copy["admin.workflows.briefPlaceholder"]}
          className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <div className="mt-2 flex items-center gap-3">
          <button type="button" className="btn-solid px-3 py-1.5 text-[13px]" onClick={trigger} disabled={busy}>
            {busy ? copy["admin.workflows.starting"] : copy["admin.workflows.runBtn"]}
          </button>
          {note && <span className="text-xs text-ink-soft">{note}</span>}
        </div>
      </div>

      {runs.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {runs.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(i)}
              className={`rounded-full border px-2.5 py-1 font-mono text-[11px] ${
                i === Math.min(selected, runs.length - 1) ? "border-accent text-accent" : "border-line text-muted"
              }`}
            >
              {r.id.slice(0, 8)} · {r.status}
            </button>
          ))}
        </div>
      )}

      <div className="h-[340px] rounded-xl border border-line">
        {latest ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            fitView
            proOptions={{ hideAttribution: true }}
            nodesConnectable={false}
            elementsSelectable={false}
          >
            <Background gap={20} size={1} />
          </ReactFlow>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            {copy["admin.workflows.empty"]}
          </div>
        )}
      </div>
      <p className="text-xs leading-relaxed text-muted">{copy["admin.workflows.note"]}</p>
    </div>
  );
}
