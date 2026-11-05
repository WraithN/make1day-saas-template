"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type RoleOption = { value: string; label: string };

/**
 * Per-user role dropdown used in the admin user directory. Calls
 * PATCH /api/admin/users. Renders as a read-only chip when `disabled`
 * (e.g. a staff member viewing, or the current admin's own row).
 */
export function UserRoleSelect({
  target,
  current,
  options,
  disabled,
  selfLabel,
  updatingLabel,
}: {
  target: { userId?: string; email?: string };
  current: string | null | undefined;
  options: RoleOption[];
  disabled?: boolean;
  selfLabel: string;
  updatingLabel: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "member");
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  if (disabled) {
    const label =
      options.find((o) => o.value === value)?.label ?? value;
    return (
      <span className="inline-block rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink-soft">
        {label}
      </span>
    );
  }

  async function change(next: string) {
    if (next === value) return;
    setValue(next);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, role: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setValue(current ?? "member");
        alert(data.error || "Failed to update role");
      } else {
        startTransition(() => router.refresh());
      }
    } catch {
      setValue(current ?? "member");
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      className="input !min-h-0 !py-1 !text-xs"
      value={value}
      disabled={busy}
      onChange={(e) => change(e.target.value)}
      aria-label={selfLabel}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
