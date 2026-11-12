"use client";

import { useState } from "react";
import { themeVars, textureStyle } from "@/lib/generator/themes";
import type { TemplateMeta, TText } from "@/lib/content/templates";
import type { Lang } from "@/lib/i18n-core";

// Chrome strings resolved server-side (i18n) and passed in — this component
// is client-only for the surface switcher.
export type TemplateChrome = {
  tabLanding: string;
  tabPricing: string;
  tabLogin: string;
  tabChat: string;
  tabRag: string;
  tabAdmin: string;
  email: string;
  password: string;
  signIn: string;
  forgot: string;
  orSocial: string;
  chatPlaceholder: string;
  send: string;
  ragPlaceholder: string;
  sources: string;
  statUsers: string;
  statLicenses: string;
  statRevenue: string;
  statTickets: string;
  activity: string;
  perMonth: string;
  oneTime: string;
  choose: string;
  tabWorkspaces: string;
  tabWorkflow: string;
  tabOps: string;
  invoices: string;
  members: string;
  owner: string;
  member: string;
  switch: string;
  activeWs: string;
};

export type Surface =
  | "landing"
  | "pricing"
  | "login"
  | "chat"
  | "rag"
  | "admin"
  | "workspaces"
  | "workflow"
  | "ops";

/**
 * Tab set follows the VERTICAL: knowledge products show chat + RAG, pipeline
 * products show workflow + model/billing ops; a face-swap-free video ad tool
 * never gets a document-Q&A tab it has no reason to ship.
 */
function surfacesFor(tpl: TemplateMeta): { id: Surface; key: keyof TemplateChrome }[] {
  return [
    { id: "landing", key: "tabLanding" },
    { id: "pricing", key: "tabPricing" },
    { id: "login", key: "tabLogin" },
    ...(tpl.chat ? [{ id: "chat" as Surface, key: "tabChat" as keyof TemplateChrome }] : []),
    ...(tpl.rag ? [{ id: "rag" as Surface, key: "tabRag" as keyof TemplateChrome }] : []),
    ...(tpl.workflow ? [{ id: "workflow" as Surface, key: "tabWorkflow" as keyof TemplateChrome }] : []),
    ...(tpl.ops ? [{ id: "ops" as Surface, key: "tabOps" as keyof TemplateChrome }] : []),
    { id: "admin", key: "tabAdmin" },
    { id: "workspaces", key: "tabWorkspaces" },
  ];
}

/**
 * A believable product site generated from a template: the surfaces the
 * generator actually ships (landing, pricing, login, AI chat, RAG, admin
 * console, workspaces), rendered with the template's REAL theme variables and switchable
 * in-page. Demo controls are inert — this is a preview, not a live app.
 */
export function TemplateSite({
  tpl,
  lang,
  t,
}: {
  tpl: TemplateMeta;
  lang: Lang;
  t: TemplateChrome;
}) {
  const [surface, setSurface] = useState<Surface>("landing");
  const pick = (x: TText) => x[lang] ?? x.en;

  const wrapStyle = {
    ...themeVars(tpl.styleId),
    backgroundColor: "rgb(var(--bg))",
    color: "rgb(var(--ink))",
  } as React.CSSProperties;

  const panel =
    "rounded-xl border border-[rgb(var(--line))] bg-[rgb(var(--bg))] p-4 sm:p-5";
  const solidBtn =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-[14px] font-semibold transition-opacity hover:opacity-90 active:opacity-75";
  const solidStyle = {
    backgroundColor: "rgb(var(--accent))",
    color: "rgb(var(--bg))",
  } as React.CSSProperties;
  const ghostBtn =
    "inline-flex items-center justify-center rounded-lg border border-[rgb(var(--line))] px-4 py-2 text-[14px] font-semibold hover:border-[rgb(var(--accent))]";
  const inputCls =
    "w-full rounded-lg border border-[rgb(var(--line))] bg-[rgb(var(--bg))] px-3 py-2 text-[14px] outline-none focus:border-[rgb(var(--accent))]";

  const name = pick(tpl.name);
  const surfaces = surfacesFor(tpl);
  // Invoice rows: verticals author them explicitly; classic templates get
  // generated ones from their real tier prices, so EVERY demo console shows
  // billing — which is what buyers actually look for.
  const PAID: TText = { en: "Paid", zh: "已支付", ja: "支払済", fr: "Payée", de: "Bezahlt" };
  const REFUNDED: TText = { en: "Refunded", zh: "已退款", ja: "返金済", fr: "Remboursée", de: "Erstattet" };
  const inv =
    tpl.admin.invoices ??
    tpl.tiers
      .filter((x) => x.price !== "$0")
      .slice(0, 2)
      .map((x, i) => ({
        id: `INV-${1041 + i}`,
        who: `member${i + 1}@${tpl.slug.replace(/-/g, "")}.app`,
        amount: `${x.price}.00${x.period === "mo" ? " /mo" : ""}`,
        status: i === 1 ? REFUNDED : PAID,
      }));

  return (
    <div className="ts-site relative overflow-hidden" style={wrapStyle}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={textureStyle(tpl.styleId)}
      />

      <div className="wrap relative z-10 py-5">
        {/* Mini nav */}
        <nav className="flex items-center justify-between gap-3">
          <span className="text-[15px] font-bold tracking-tight">{name}</span>
          <button type="button" className={solidBtn} style={solidStyle}>
            {pick(tpl.primaryCta)}
          </button>
        </nav>

        {/* Surface switcher */}
        <div
          role="tablist"
          aria-label={name}
          className="mt-4 flex flex-wrap gap-1.5 border-y border-[rgb(var(--line))] py-2"
        >
          {surfaces.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={surface === s.id}
              onClick={() => setSurface(s.id)}
              className={
                "rounded-full px-3 py-1 text-[12px] font-semibold transition-colors " +
                (surface === s.id
                  ? "text-[rgb(var(--bg))]"
                  : "border border-[rgb(var(--line))] text-[rgb(var(--ink-soft))] hover:border-[rgb(var(--accent))]")
              }
              style={surface === s.id ? solidStyle : undefined}
            >
              {t[s.key]}
            </button>
          ))}
        </div>

        {/* ── Landing ── */}
        {surface === "landing" && (
          <>
            <header className="py-10 text-center sm:py-14">
              <span className="tag">{pick(tpl.category)}</span>
              <h1 className="mx-auto mt-4 max-w-2xl text-[28px] font-bold leading-tight sm:text-[38px]">
                {pick(tpl.heroTitle)}
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-[14px] leading-relaxed text-[rgb(var(--ink-soft))] sm:text-[15px]">
                {pick(tpl.heroSubtitle)}
              </p>
              <div className="mt-7 flex justify-center">
                <button type="button" className={solidBtn} style={solidStyle}>
                  {pick(tpl.primaryCta)}
                </button>
              </div>
            </header>
            <section className="grid gap-4 pb-10 sm:grid-cols-3">
              {tpl.features.map((f, i) => (
                <div key={i} className={panel}>
                  <div className="text-[15px] font-semibold">{pick(f)}</div>
                  <div className="mt-2 h-1 w-10 rounded-full bg-[rgb(var(--accent))]" />
                </div>
              ))}
            </section>
          </>
        )}

        {/* ── Pricing ── */}
        {surface === "pricing" && (
          <section className="py-10">
            <h2 className="text-[20px] font-semibold">{t.tabPricing}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {tpl.tiers.map((tier, i) => (
                <div
                  key={i}
                  className={
                    panel +
                    (tier.highlight
                      ? " border-[rgb(var(--accent))] ring-1 ring-[rgb(var(--accent))]"
                      : "")
                  }
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[15px] font-semibold">{pick(tier.name)}</span>
                    {tier.highlight && (
                      <span className="tag" style={solidStyle}>
                        ★
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-[30px] font-bold">
                    {tier.price}
                    <span className="ml-1 text-[13px] font-medium text-[rgb(var(--muted))]">
                      {tier.period === "mo" ? t.perMonth : t.oneTime}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-1.5 text-[13px] text-[rgb(var(--ink-soft))]">
                    {tier.features.map((f, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="font-bold text-[rgb(var(--accent))]">✓</span>
                        {pick(f)}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className={(tier.highlight ? solidBtn : ghostBtn) + " mt-4 w-full"}
                    style={tier.highlight ? solidStyle : undefined}
                  >
                    {t.choose}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Login ── */}
        {surface === "login" && (
          <section className="py-10">
            <form
              className={panel + " mx-auto max-w-sm space-y-3"}
              onSubmit={(e) => e.preventDefault()}
            >
              <h2 className="text-[18px] font-semibold">{t.signIn}</h2>
              <label className="block text-[13px] font-medium text-[rgb(var(--ink-soft))]">
                {t.email}
                <input type="email" className={inputCls + " mt-1"} placeholder="you@company.com" />
              </label>
              <label className="block text-[13px] font-medium text-[rgb(var(--ink-soft))]">
                {t.password}
                <input type="password" className={inputCls + " mt-1"} placeholder="••••••••" />
              </label>
              <div className="flex items-center justify-between gap-2 pt-1">
                <button type="submit" className={solidBtn} style={solidStyle}>
                  {t.signIn}
                </button>
                <span className="text-[12px] text-[rgb(var(--muted))] underline-offset-2 hover:underline">
                  {t.forgot}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1 text-[12px] text-[rgb(var(--muted))]">
                <span className="h-px flex-1 bg-[rgb(var(--line))]" />
                {t.orSocial}
                <span className="h-px flex-1 bg-[rgb(var(--line))]" />
              </div>
              <button type="button" className={ghostBtn + " w-full"}>
                <span className="mr-2 font-bold text-[rgb(var(--accent))]">G</span>
                Google
              </button>
            </form>
          </section>
        )}

        {/* ── AI chat ── */}
        {surface === "chat" && tpl.chat && (
          <section className="py-10">
            <div className={panel + " mx-auto max-w-xl"}>
              <div className="space-y-3">
                <div
                  className="ml-auto max-w-[85%] rounded-xl rounded-br-sm px-3 py-2 text-[13px] leading-relaxed"
                  style={{ backgroundColor: "rgb(var(--accent) / 0.14)" }}
                >
                  {pick(tpl.chat.user)}
                </div>
                <div className="max-w-[85%] rounded-xl rounded-bl-sm border border-[rgb(var(--line))] px-3 py-2 text-[13px] leading-relaxed">
                  {pick(tpl.chat.assistant)}
                </div>
              </div>
              <form
                className="mt-4 flex gap-2"
                onSubmit={(e) => e.preventDefault()}
              >
                <input className={inputCls} placeholder={t.chatPlaceholder} />
                <button type="submit" className={solidBtn} style={solidStyle}>
                  {t.send}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* ── RAG ── */}
        {surface === "rag" && tpl.rag && (
          <section className="py-10">
            <div className={panel + " mx-auto max-w-xl space-y-3"}>
              <div className="flex items-start gap-2">
                <span className="tag" style={solidStyle}>
                  Q
                </span>
                <span className="text-[14px] font-semibold">{pick(tpl.rag.question)}</span>
              </div>
              <p className="text-[13px] leading-relaxed text-[rgb(var(--ink-soft))]">
                {pick(tpl.rag.answer)}
              </p>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                  {t.sources}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {tpl.rag.sources.map((s, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-[rgb(var(--line))] px-2.5 py-0.5 text-[12px] text-[rgb(var(--ink-soft))]"
                    >
                      § {pick(s)}
                    </span>
                  ))}
                </div>
              </div>
              <form className="flex gap-2 pt-1" onSubmit={(e) => e.preventDefault()}>
                <input className={inputCls} placeholder={t.ragPlaceholder} />
                <button type="submit" className={solidBtn} style={solidStyle}>
                  {t.send}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* ── Admin console ── */}
        {surface === "admin" && (
          <section className="py-10">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[18px] font-semibold">{t.tabAdmin}</h2>
              <span className="tag">{name}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  [tpl.admin.stats.users, t.statUsers],
                  [tpl.admin.stats.licenses, t.statLicenses],
                  [tpl.admin.stats.revenue, t.statRevenue],
                  [tpl.admin.stats.tickets, t.statTickets],
                ] as const
              ).map(([value, label], i) => (
                <div key={i} className={panel + " !p-3"}>
                  <div className="text-[20px] font-bold">{value}</div>
                  <div className="mt-0.5 text-[11px] text-[rgb(var(--muted))]">{label}</div>
                </div>
              ))}
            </div>
            <div className={panel + " mt-3"}>
              <div className="text-[13px] font-semibold">{t.invoices}</div>
              <table className="mt-2 w-full text-[12px]">
                <tbody>
                  {inv.map((item) => (
                    <tr key={item.id} className="border-b border-[rgb(var(--line))] last:border-0">
                      <td className="py-1.5 pr-2 font-mono">{item.id}</td>
                      <td className="py-1.5 pr-2 text-[rgb(var(--ink-soft))]">{item.who}</td>
                      <td className="py-1.5 pr-2 font-semibold">{item.amount}</td>
                      <td className="py-1.5 text-right text-[rgb(var(--muted))]">{pick(item.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={panel + " mt-3"}>
              <div className="text-[13px] font-semibold">{t.activity}</div>
              <ul className="mt-2 space-y-1.5 text-[13px] text-[rgb(var(--ink-soft))]">
                {tpl.admin.activity.map((a, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))]" />
                    {pick(a)}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ── Workspaces (multi-tenancy showcase) ── */}
        {surface === "workspaces" && (
          <section className="py-10">
            <h2 className="text-[18px] font-semibold">{t.tabWorkspaces}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { org: `${name} HQ`, role: t.owner, members: 8, active: true },
                { org: `${name} Studio`, role: t.member, members: 3, active: false },
              ].map((o, i) => (
                <div
                  key={i}
                  className={
                    panel +
                    (o.active
                      ? " border-[rgb(var(--accent))] ring-1 ring-[rgb(var(--accent))]"
                      : "")
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[15px] font-semibold">{o.org}</span>
                    {o.active && (
                      <span className="tag" style={solidStyle}>
                        {t.activeWs}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[12px] text-[rgb(var(--muted))]">
                    {o.role} · {o.members} {t.members}
                  </div>
                  <button
                    type="button"
                    className={(o.active ? ghostBtn : solidBtn) + " mt-3 w-full"}
                    style={o.active ? undefined : solidStyle}
                    disabled={o.active}
                  >
                    {o.active ? t.activeWs : t.switch}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Pipeline workflow (scene verticals) ── */}
        {surface === "workflow" && tpl.workflow && (
          <section className="py-10">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[18px] font-semibold">{t.tabWorkflow}</h2>
              <span className="tag">{name}</span>
            </div>
            <p className="mt-2 text-[12px] text-[rgb(var(--muted))]">{pick(tpl.workflow.note)}</p>
            <ol className="mt-4 space-y-2">
              {tpl.workflow.steps.map((st, i) => (
                <li key={i} className={panel + " flex gap-3 !p-3"}>
                  <span
                    className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                    style={solidStyle}
                  >
                    {i + 1}
                  </span>
                  <span>
                    <span className="text-[14px] font-semibold">{pick(st.name)}</span>
                    <span className="mt-0.5 block text-[12px] text-[rgb(var(--ink-soft))]">
                      {pick(st.detail)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tpl.workflow.gates.map((g, i) => (
                <span key={i} className="rounded-full border border-[rgb(var(--line))] px-2.5 py-1 text-[11px] text-[rgb(var(--ink-soft))]">
                  ✓ {pick(g)}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ── Model routing + billing plane ── */}
        {surface === "ops" && tpl.ops && (
          <section className="py-10">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[18px] font-semibold">{t.tabOps}</h2>
              <span className="tag">{name}</span>
            </div>
            <div className={panel + " mt-4"}>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[rgb(var(--line))] text-left text-[rgb(var(--muted))]">
                    <th className="py-1.5 pr-2 font-semibold">task</th>
                    <th className="py-1.5 pr-2 font-semibold">primary</th>
                    <th className="py-1.5 font-semibold">fallback</th>
                  </tr>
                </thead>
                <tbody>
                  {tpl.ops.routes.map((r, i) => (
                    <tr key={i} className="border-b border-[rgb(var(--line))] last:border-0">
                      <td className="py-2 pr-2 text-[rgb(var(--ink-soft))]">{pick(r.task)}</td>
                      <td className="py-2 pr-2 font-mono text-[11px]">{r.primary}</td>
                      <td className="py-2 font-mono text-[11px] text-[rgb(var(--muted))]">{r.fallback}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-3 space-y-1.5 text-[12px] text-[rgb(var(--ink-soft))]">
              {tpl.ops.billing.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(var(--accent))]" />
                  {pick(b)}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Footer */}
        <footer className="border-t border-[rgb(var(--line))] py-6 text-[13px] text-[rgb(var(--muted))]">
          © {name}
        </footer>
      </div>
    </div>
  );
}
