"use client";

import { useState } from "react";

/**
 * Client button that opens the provider's self-serve billing portal. On
 * providers without a portal (e.g. PayPal, Waffo Pancake) the API returns 422
 * with `reason: "unsupported_provider"` and we surface a "contact support"
 * message instead of crashing.
 */
export function BillingPortalButton({
  label,
  unsupportedLabel,
  supportHref,
}: {
  label: string;
  unsupportedLabel: string;
  supportHref: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "unsupported" | "error">(
    "idle",
  );

  async function open() {
    setState("loading");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.reason === "unsupported_provider") {
        setState("unsupported");
        return;
      }
      setState("error");
    } catch {
      setState("error");
    }
  }

  if (state === "unsupported") {
    return (
      <a href={supportHref} className="btn-ghost mt-4 inline-block text-sm">
        {unsupportedLabel}
      </a>
    );
  }

  return (
    <button
      onClick={open}
      disabled={state === "loading"}
      className="btn-solid mt-4 inline-block text-sm disabled:opacity-60"
    >
      {state === "loading" ? "Opening…" : label}
      {state === "error" ? (
        <span className="ml-2 text-xs opacity-80">(couldn’t open — retry)</span>
      ) : null}
    </button>
  );
}
