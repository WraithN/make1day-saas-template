"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Org = { id: string; name: string; slug: string; role: string };

export function WorkspaceManager({
  initialOrgs,
  activeOrgId,
  labels,
}: {
  initialOrgs: Org[];
  activeOrgId: string | null;
  labels: {
    createTitle: string;
    createDesc: string;
    namePh: string;
    create: string;
    creating: string;
    listTitle: string;
    active: string;
    switchTo: string;
    personal: string;
    current: string;
    error: string;
  };
}) {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>(initialOrgs);
  const [name, setName] = useState("");
  const [active, setActive] = useState(activeOrgId);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [, startTransition] = useTransition();

  async function create() {
    if (name.trim().length < 2) return;
    setStatus("saving");
    try {
      const res = await fetch("/api/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setOrgs((prev) => [
        ...prev,
        { id: data.orgId, name: name.trim(), slug: "", role: "owner" },
      ]);
      setActive(data.orgId);
      setName("");
      setStatus("idle");
      startTransition(() => router.refresh());
    } catch {
      setStatus("error");
    }
  }

  async function select(orgId: string | null) {
    setActive(orgId);
    try {
      await fetch("/api/org/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      startTransition(() => router.refresh());
    } catch {
      /* optimistic; refresh reconciles */
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-foreground">
          {labels.createTitle}
        </h3>
        <p className="mt-1 text-xs text-muted">{labels.createDesc}</p>
        <div className="mt-4 flex gap-2">
          <input
            className="input flex-1"
            placeholder={labels.namePh}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            className="btn-solid text-sm"
            onClick={create}
            disabled={status === "saving" || name.trim().length < 2}
          >
            {status === "saving" ? labels.creating : labels.create}
          </button>
        </div>
        {status === "error" ? (
          <p className="mt-2 text-xs text-red-400">{labels.error}</p>
        ) : null}
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-semibold text-foreground">
          {labels.listTitle}
        </h3>
        <ul className="mt-3 divide-y divide-white/5">
          <li className="flex items-center justify-between py-2">
            <span className="text-sm">{labels.personal}</span>
            <button
              className="text-xs text-teal-400"
              onClick={() => select(null)}
            >
              {active === null ? labels.current : labels.switchTo}
            </button>
          </li>
          {orgs.map((o) => (
            <li key={o.id} className="flex items-center justify-between py-2">
              <span className="text-sm">
                {o.name}
                {active === o.id ? (
                  <span className="ml-2 text-xs text-teal-400">
                    · {labels.current}
                  </span>
                ) : null}
              </span>
              <button
                className="text-xs text-teal-400"
                onClick={() => select(o.id)}
              >
                {active === o.id ? labels.current : labels.switchTo}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
