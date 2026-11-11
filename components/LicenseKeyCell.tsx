"use client";

import { useState } from "react";
import { copyText } from "@/lib/copy";

/**
 * Masked license key display with a copy button: never renders the full key
 * in the table (shoulder-surfing / screenshot safe); the Redeem link on
 * /license?key= still carries the full key in the URL.
 */
export function LicenseKeyCell({
  licenseKey,
  redeemHref,
  redeemLabel,
}: {
  licenseKey: string;
  redeemHref: string;
  redeemLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const masked =
    licenseKey.length > 20
      ? `${licenseKey.slice(0, 12)}…${licenseKey.slice(-4)}`
      : licenseKey;

  async function copy() {
    const ok = await copyText(licenseKey);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 1500);
  }

  return (
    <span className="block">
      <span className="flex items-center gap-2">
        <code className="max-w-xs break-all font-mono text-xs text-accent">
          {masked}
        </code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft hover:border-accent hover:text-accent"
          aria-label="Copy license key"
        >
          {copied ? "✓" : "Copy"}
        </button>
      </span>
      <a
        href={redeemHref}
        className="mt-1 inline-block text-xs font-semibold text-accent hover:underline"
      >
        {redeemLabel} →
      </a>
    </span>
  );
}
