// Server-safe presentation primitives shared by the account and admin pages.
// No hooks, no browser APIs — these render inside Server Components.

import type { ReactNode } from "react";

export function ConsoleSection({
  title,
  desc,
  children,
  action,
}: {
  title: string;
  desc?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {desc && <p className="mt-1 text-sm text-ink-soft">{desc}</p>}
        </div>
        {action}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function KeyValue({
  rows,
}: {
  rows: { key: string; value: ReactNode }[];
}) {
  return (
    <dl className="space-y-2 text-sm">
      {rows.map((r) => (
        <div
          key={r.key}
          className="flex flex-wrap items-center justify-between gap-2 border-b border-line/50 pb-2 last:border-0 last:pb-0"
        >
          <dt className="text-muted">{r.key}</dt>
          <dd className="text-right font-mono text-xs text-ink">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ConsoleTable({
  columns,
  rows,
  empty,
}: {
  columns: string[];
  rows: ReactNode[][];
  empty: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
          <tr>
            {columns.map((c) => (
              <th key={c} className="py-2 pr-4 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-ink-soft">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((cells, i) => (
              <tr key={i} className="border-b border-line/50 align-top">
                {cells.map((cell, j) => (
                  <td key={j} className="py-2 pr-4">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Notice({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "warning";
}) {
  return (
    <p
      className={`rounded-lg border p-3 text-sm ${
        tone === "warning"
          ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
          : "border-line bg-surface text-ink-soft"
      }`}
    >
      {children}
    </p>
  );
}
