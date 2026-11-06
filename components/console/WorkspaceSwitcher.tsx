"use client";

import { useEffect, useState } from "react";

type Org = { id: string; name: string; role: string };

// Compact workspace switcher for the account nav. Reads the current orgs from
// the page-provided prop (already filtered to the signed-in user) and switches
// the active org via the cookie-writing API. Falls back silently when the user
// has no orgs.
export function WorkspaceSwitcher({
  orgs,
  activeOrgId,
}: {
  orgs: Org[];
  activeOrgId: string | null;
}) {
  const [current, setCurrent] = useState(activeOrgId ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCurrent(activeOrgId ?? "");
  }, [activeOrgId]);

  if (orgs.length === 0) return null;

  async function change(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    setBusy(true);
    setCurrent(value);
    try {
      await fetch("/api/org/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: value || null }),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      <span>Workspace</span>
      <select
        className="input py-1 text-xs"
        value={current}
        disabled={busy}
        onChange={change}
      >
        <option value="">Personal</option>
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}
