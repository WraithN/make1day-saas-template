"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { msgCopy } from "@/lib/content/messaging";

// Kept local (not imported from lib/tickets.ts): that module pulls in
// node:crypto / node:sqlite, which must never reach a client bundle.
type TicketStatus = "open" | "answered" | "closed";
const STATUSES: TicketStatus[] = ["open", "answered", "closed"];

/**
 * Operator-only status control for one support ticket. Calls the guarded
 * PATCH route; a failure leaves the previous value selected and shows a
 * five-language error. Copy is reactive via useLanguage().
 */
export function TicketStatusSelect({
  id,
  status,
}: {
  id: string;
  status: TicketStatus;
}) {
  const { lang } = useLanguage();
  const c = msgCopy(lang);
  const [value, setValue] = useState<TicketStatus>(status);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<"idle" | "saved" | "failed">("idle");

  const labels: Record<TicketStatus, string> = {
    open: c["tickets.statusOpen"],
    answered: c["tickets.statusAnswered"],
    closed: c["tickets.statusClosed"],
  };

  async function change(next: TicketStatus) {
    const previous = value;
    setValue(next);
    setBusy(true);
    setNote("idle");
    try {
      const res = await fetch(`/api/support/tickets/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setNote("saved");
    } catch {
      setValue(previous);
      setNote("failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        aria-label={c["tickets.statusOpen"]}
        className="input py-1 text-xs"
        value={value}
        disabled={busy}
        onChange={(e) => change(e.target.value as TicketStatus)}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {labels[s]}
          </option>
        ))}
      </select>
      {note !== "idle" && (
        <span
          className={`text-xs ${note === "failed" ? "text-red-400" : "text-accent"}`}
          role="status"
        >
          {note === "saved" ? c["tickets.saved"] : c["tickets.failed"]}
        </span>
      )}
    </div>
  );
}
