"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type ProfileFormLabels = {
  title: string;
  subtitle: string;
  displayName: string;
  displayNamePh: string;
  fullName: string;
  fullNamePh: string;
  company: string;
  companyPh: string;
  save: string;
  saving: string;
  saved: string;
  errorGeneric: string;
  unchanged: string;
};

/**
 * Editable profile form. Posts displayName / fullName / company to
 * PATCH /api/profile. It never sends `role` (role is admin-only).
 */
export function ProfileForm({
  initial,
  labels,
}: {
  initial: { displayName: string; fullName: string; company: string };
  labels: ProfileFormLabels;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [fullName, setFullName] = useState(initial.fullName);
  const [company, setCompany] = useState(initial.company);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [, startTransition] = useTransition();

  const dirty =
    displayName !== initial.displayName ||
    fullName !== initial.fullName ||
    company !== initial.company;

  async function save() {
    setStatus("saving");
    setMessage("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, fullName, company }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || labels.errorGeneric);
        return;
      }
      setStatus("saved");
      setMessage(labels.saved);
      startTransition(() => router.refresh());
    } catch {
      setStatus("error");
      setMessage(labels.errorGeneric);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">
          {labels.displayName}
        </label>
        <input
          className="input"
          value={displayName}
          maxLength={80}
          placeholder={labels.displayNamePh}
          onChange={(e) => {
            setDisplayName(e.target.value);
            if (status === "saved" || status === "error") setStatus("idle");
          }}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">
          {labels.fullName}
        </label>
        <input
          className="input"
          value={fullName}
          maxLength={80}
          placeholder={labels.fullNamePh}
          onChange={(e) => {
            setFullName(e.target.value);
            if (status === "saved" || status === "error") setStatus("idle");
          }}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">
          {labels.company}
        </label>
        <input
          className="input"
          value={company}
          maxLength={80}
          placeholder={labels.companyPh}
          onChange={(e) => {
            setCompany(e.target.value);
            if (status === "saved" || status === "error") setStatus("idle");
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-solid text-sm"
          onClick={save}
          disabled={!dirty || status === "saving"}
        >
          {status === "saving" ? labels.saving : labels.save}
        </button>
        {status === "saved" && (
          <span className="text-sm text-emerald-300">{message}</span>
        )}
        {status === "error" && (
          <span className="text-sm text-amber-300">{message}</span>
        )}
        {!dirty && status === "idle" && (
          <span className="text-sm text-muted">{labels.unchanged}</span>
        )}
      </div>
    </div>
  );
}
