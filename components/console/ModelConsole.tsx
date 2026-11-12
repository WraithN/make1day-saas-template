"use client";

// Interactive model-routing + billing console for /admin/models.
// Every save goes through POST /api/admin/models and takes effect live:
// the AI call sites read the routing table on their next request, and the
// ledger prices usage with the stored price sheet.

import { useState } from "react";

export type ProviderInfo = { key: string; label: string; hasKey: boolean; model: string };

export type LaneMeta = {
  lane: "chat" | "embed" | "video" | "image" | "voice";
  title: string;
  /** A call site exists in this build (vs configured-only, e.g. image/voice). */
  wired: boolean;
  /** What the env resolves today, shown as the "(default)" hint. */
  envDefault: string;
  providerOptions: ProviderInfo[];
  allowFallback: boolean;
  priceMode: "tokens" | "unit";
};

export type RoutingValue = {
  provider: string;
  model: string;
  fallbackProvider: string;
  fallbackModel: string;
  budgetUsdPerUserMonth: number;
};

export type PriceValue = {
  mode: "tokens" | "unit";
  inputUsdPer1k: number;
  outputUsdPer1k: number;
  unitUsd: number;
  unit: string;
};

export type LedgerRow = {
  day: string;
  lane: string;
  provider: string;
  model: string;
  inputUnits: number;
  outputUnits: number;
  costUsd: number;
  source: string;
};

const EMPTY_ROUTING: RoutingValue = {
  provider: "",
  model: "",
  fallbackProvider: "",
  fallbackModel: "",
  budgetUsdPerUserMonth: 0,
};

const inputCls =
  "mt-1 w-full rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm outline-none focus:border-accent";

export function ModelConsole({
  copy,
  lanes,
  routing,
  prices,
  ledgerRows,
  totalUsd,
}: {
  copy: Record<string, string>;
  lanes: LaneMeta[];
  routing: Record<string, RoutingValue | null>;
  prices: Record<string, PriceValue>;
  ledgerRows: LedgerRow[];
  totalUsd: number;
}) {
  const [draftR, setDraftR] = useState<Record<string, RoutingValue>>(() => {
    const out: Record<string, RoutingValue> = {};
    for (const l of lanes) out[l.lane] = routing[l.lane] ?? EMPTY_ROUTING;
    return out;
  });
  const [draftP, setDraftP] = useState<Record<string, PriceValue>>(() => {
    const out: Record<string, PriceValue> = {};
    for (const l of lanes) out[l.lane] = prices[l.lane];
    return out;
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  async function save(lane: LaneMeta) {
    setBusy(lane.lane);
    setSaved(null);
    setFailed(null);
    try {
      const res = await fetch("/api/admin/models", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lane: lane.lane, routing: draftR[lane.lane], price: draftP[lane.lane] }),
      });
      if (res.ok) setSaved(lane.lane);
      else setFailed(lane.lane);
    } catch {
      setFailed(lane.lane);
    } finally {
      setBusy(null);
    }
  }

  const sourceLabel = (s: string) =>
    s === "usage" ? copy["admin.models.sourceUsage"] : s === "priced" ? copy["admin.models.sourcePriced"] : copy["admin.models.sourceEstimated"];

  return (
    <div className="space-y-5">
      {lanes.map((lane) => {
        const r = draftR[lane.lane] ?? EMPTY_ROUTING;
        const p = draftP[lane.lane];
        const setR = (patch: Partial<RoutingValue>) =>
          setDraftR((d) => ({ ...d, [lane.lane]: { ...r, ...patch } }));
        const setP = (patch: Partial<PriceValue>) =>
          setDraftP((d) => ({ ...d, [lane.lane]: { ...p, ...patch } }));
        return (
          <div key={lane.lane} className="card">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[15px] font-semibold">{lane.title}</h3>
              <span className="font-mono text-[10px] uppercase tracking-wide text-muted">
                {lane.wired ? copy["admin.models.wired"] : copy["admin.models.notWired"]}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-muted">{copy["admin.models.envDefault"].replace("{v}", lane.envDefault)}</p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-[12px] font-medium text-ink-soft">
                {copy["admin.models.provider"]}
                <select
                  className={inputCls}
                  value={r.provider}
                  onChange={(e) => setR({ provider: e.target.value })}
                >
                  <option value="">{copy["admin.models.useEnvDefault"]}</option>
                  {lane.providerOptions.map((pr) => (
                    <option key={pr.key} value={pr.key}>
                      {pr.label}
                      {pr.hasKey ? "" : ` — ${copy["admin.models.keyMissing"]}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[12px] font-medium text-ink-soft">
                {copy["admin.models.model"]}
                <input
                  className={inputCls}
                  value={r.model}
                  placeholder={lane.envDefault.split("·").pop()?.trim() || ""}
                  onChange={(e) => setR({ model: e.target.value })}
                />
              </label>
              {lane.allowFallback && (
                <>
                  <label className="block text-[12px] font-medium text-ink-soft">
                    {copy["admin.models.fallbackProvider"]}
                    <input
                      className={inputCls}
                      value={r.fallbackProvider}
                      onChange={(e) => setR({ fallbackProvider: e.target.value })}
                    />
                  </label>
                  <label className="block text-[12px] font-medium text-ink-soft">
                    {copy["admin.models.fallbackModel"]}
                    <input
                      className={inputCls}
                      value={r.fallbackModel}
                      onChange={(e) => setR({ fallbackModel: e.target.value })}
                    />
                  </label>
                </>
              )}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {lane.priceMode === "tokens" ? (
                <>
                  <label className="block text-[12px] font-medium text-ink-soft">
                    {copy["admin.models.inputPer1k"]}
                    <input
                      type="number"
                      step="0.00001"
                      min="0"
                      className={inputCls}
                      value={p?.inputUsdPer1k ?? 0}
                      onChange={(e) => setP({ inputUsdPer1k: Number(e.target.value) || 0 })}
                    />
                  </label>
                  <label className="block text-[12px] font-medium text-ink-soft">
                    {copy["admin.models.outputPer1k"]}
                    <input
                      type="number"
                      step="0.00001"
                      min="0"
                      className={inputCls}
                      value={p?.outputUsdPer1k ?? 0}
                      onChange={(e) => setP({ outputUsdPer1k: Number(e.target.value) || 0 })}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="block text-[12px] font-medium text-ink-soft">
                    {copy["admin.models.unitPrice"]}
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      className={inputCls}
                      value={p?.unitUsd ?? 0}
                      onChange={(e) => setP({ unitUsd: Number(e.target.value) || 0 })}
                    />
                  </label>
                  <label className="block text-[12px] font-medium text-ink-soft">
                    {copy["admin.models.unit"]}
                    <input
                      className={inputCls}
                      value={p?.unit ?? ""}
                      onChange={(e) => setP({ unit: e.target.value })}
                    />
                  </label>
                </>
              )}
              <label className="block text-[12px] font-medium text-ink-soft">
                {copy["admin.models.budget"]}
                <input
                  type="number"
                  step="1"
                  min="0"
                  className={inputCls}
                  value={r.budgetUsdPerUserMonth}
                  onChange={(e) => setR({ budgetUsdPerUserMonth: Number(e.target.value) || 0 })}
                />
              </label>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                className="btn-solid px-3 py-1.5 text-[13px]"
                onClick={() => save(lane)}
                disabled={busy === lane.lane}
              >
                {busy === lane.lane ? copy["admin.models.saving"] : copy["admin.models.save"]}
              </button>
              {saved === lane.lane && (
                <span className="text-[12px] text-accent">{copy["admin.models.saved"]}</span>
              )}
              {failed === lane.lane && (
                <span className="text-[12px] text-red-500">{copy["admin.models.saveFail"]}</span>
              )}
            </div>
          </div>
        );
      })}

      <div className="card">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[15px] font-semibold">{copy["admin.models.ledger"]}</h3>
          <a href="/api/admin/models?format=csv" className="text-[12px] font-semibold text-accent hover:underline">
            {copy["admin.models.csv"]}
          </a>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="py-1.5 pr-3 font-semibold">{copy["admin.models.colDay"]}</th>
                <th className="py-1.5 pr-3 font-semibold">{copy["admin.models.colLane"]}</th>
                <th className="py-1.5 pr-3 font-semibold">{copy["admin.models.colModel"]}</th>
                <th className="py-1.5 pr-3 font-semibold">{copy["admin.models.colQty"]}</th>
                <th className="py-1.5 pr-3 font-semibold">{copy["admin.models.colCost"]}</th>
                <th className="py-1.5 font-semibold">{copy["admin.models.colSource"]}</th>
              </tr>
            </thead>
            <tbody>
              {ledgerRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-3 text-muted">
                    {copy["admin.models.empty"]}
                  </td>
                </tr>
              )}
              {ledgerRows.map((row, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  <td className="py-1.5 pr-3 font-mono">{row.day}</td>
                  <td className="py-1.5 pr-3">{row.lane}</td>
                  <td className="py-1.5 pr-3 font-mono text-[11px]">
                    {row.provider} / {row.model}
                  </td>
                  <td className="py-1.5 pr-3 font-mono">
                    {row.inputUnits || row.outputUnits
                      ? `${Math.round(row.inputUnits).toLocaleString()} in · ${Math.round(row.outputUnits).toLocaleString()} out`
                      : "—"}
                  </td>
                  <td className="py-1.5 pr-3 font-mono font-semibold">${row.costUsd.toFixed(4)}</td>
                  <td className="py-1.5 text-muted">{sourceLabel(row.source)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-right text-[13px] font-semibold">
          {copy["admin.models.total30"]} ${totalUsd.toFixed(4)}
        </p>
      </div>
    </div>
  );
}
