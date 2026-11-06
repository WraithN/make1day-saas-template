"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Ends the operator session and returns to the (now locked) login screen. */
export function AdminSignOutButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      /* the cookie is cleared regardless */
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="btn-ghost"
      data-testid="admin-sign-out"
    >
      {busy ? pendingLabel : label}
    </button>
  );
}
