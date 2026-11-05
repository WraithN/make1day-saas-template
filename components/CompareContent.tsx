"use client";

import { useLanguage } from "@/lib/i18n";
import { compareContent } from "@/lib/content/compare";

export function CompareContent() {
  const { lang } = useLanguage();
  const c = compareContent[lang] ?? compareContent.en;

  return (
    <>
      <div className="text-center">
        <div className="eyebrow mb-3">{c.eyebrow}</div>
        <h1 className="text-3xl font-semibold sm:text-4xl">{c.heading}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-ink-soft">{c.subtitle}</p>
      </div>

      {/* Desktop (md+): the full comparison table. */}
      <div className="mt-12 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="p-3 font-medium text-muted">{c.cols ? "Feature" : ""}</th>
              <th className="p-3 font-semibold text-accent">{c.cols.shipkit}</th>
              <th className="p-3 font-medium">{c.cols.shipfast}</th>
              <th className="p-3 font-medium">{c.cols.makerkit}</th>
              <th className="p-3 font-medium">{c.cols.supastarter}</th>
            </tr>
          </thead>
          <tbody>
            {c.rows.map((r) => (
              <tr key={r.feature} className="border-b border-line/60 align-top">
                <td className="p-3 font-medium text-ink">{r.feature}</td>
                <td className="p-3 text-ink-soft">{r.shipkit}</td>
                <td className="p-3 text-ink-soft">{r.shipfast}</td>
                <td className="p-3 text-ink-soft">{r.makerkit}</td>
                <td className="p-3 text-ink-soft">{r.supastarter}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: one card per feature — no horizontal scrolling, everything
          readable at 320px. */}
      <div className="mt-8 space-y-3 md:hidden">
        {c.rows.map((r) => {
          const cells = [
            { name: c.cols.shipkit, value: r.shipkit, accent: true },
            { name: c.cols.shipfast, value: r.shipfast, accent: false },
            { name: c.cols.makerkit, value: r.makerkit, accent: false },
            { name: c.cols.supastarter, value: r.supastarter, accent: false },
          ];
          return (
            <div key={r.feature} className="card">
              <h2 className="text-sm font-semibold text-ink">{r.feature}</h2>
              <dl className="mt-3 space-y-2">
                {cells.map((cell) => (
                  <div key={cell.name} className="flex gap-3 text-sm">
                    <dt
                      className={`w-24 shrink-0 font-mono text-[11px] font-medium sm:w-28 ${
                        cell.accent ? "text-accent" : "text-muted"
                      }`}
                    >
                      {cell.name}
                    </dt>
                    <dd className="min-w-0 flex-1 break-words text-ink-soft">
                      {cell.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>

      <div className="card mt-8 sm:mt-10 sm:p-6">
        <div className="eyebrow mb-2">VERDICT</div>
        <p className="text-ink-soft">{c.verdict}</p>
      </div>
    </>
  );
}
