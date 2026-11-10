"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";

export type StyleItem = {
  id: string;
  label: string;
  note: string;
  scheme: "dark" | "light";
  radius: string;
  texture: "grid" | "dots" | "glow" | "pixel" | "none";
  vars: Record<string, string>;
  textureStyle: Record<string, string>;
};

function Swatch({ rgb }: { rgb: string }) {
  return (
    <span
      className="h-7 w-7 rounded-md border border-line"
      style={{ backgroundColor: `rgb(${rgb})` }}
      aria-hidden="true"
    />
  );
}

/** A representative slice of the product UI, rendered in a given style. */
function Preview({ item, scale = 1 }: { item: StyleItem; scale?: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        ...item.vars,
        backgroundColor: `rgb(${item.vars["--bg"]})`,
        color: `rgb(${item.vars["--ink"]})`,
        padding: `${1.1 * scale}rem`,
      }}
    >
      {/* Texture overlay (decorative only). */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ ...item.textureStyle }}
        aria-hidden="true"
      />
      <div className="relative" style={{ opacity: 1 }}>
        <div
          className="font-mono text-[11px] uppercase tracking-[0.18em]"
          style={{ color: `rgb(${item.vars["--accent"]})` }}
        >
          {item.label}
        </div>
        <h3 className="mt-2 font-semibold" style={{ fontSize: `${1.25 * scale}rem` }}>
          Build something people pay for.
        </h3>
        <p
          className="mt-2 max-w-prose"
          style={{
            fontSize: `${0.875 * scale}rem`,
            color: `rgb(${item.vars["--ink-soft"]})`,
          }}
        >
          Auth, billing, one real AI feature and an admin — already wired to your
          picks.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="btn-solid text-sm">Get started</span>
          <span className="btn-ghost text-sm">View pricing</span>
          <span
            className="rounded-md border px-2 py-1 text-xs"
            style={{
              borderColor: `rgb(${item.vars["--line"]})`,
              color: `rgb(${item.vars["--muted"]})`,
            }}
          >
            v1.0
          </span>
        </div>
        <div
          className="mt-4 flex items-center gap-2 rounded-2xl border p-3"
          style={{
            borderColor: `rgb(${item.vars["--line"]})`,
            backgroundColor: `rgb(${item.vars["--surface"]})`,
          }}
        >
          <Swatch rgb={item.vars["--accent"]} />
          <Swatch rgb={item.vars["--accent2"]} />
          <Swatch rgb={item.vars["--surface"]} />
          <Swatch rgb={item.vars["--line"]} />
          <Swatch rgb={item.vars["--ink"]} />
        </div>
      </div>
    </div>
  );
}

/**
 * Interactive gallery of all make1day styles. The big panel re-renders in the
 * selected palette; each grid card is a mini preview. Styles are pure CSS
 * variable sets, so the preview just swaps the custom properties on a wrapper.
 */
export function StylePlayground({ items }: { items: StyleItem[] }) {
  const { t } = useLanguage();
  const [selectedId, setSelectedId] = useState(items[0]?.id);
  const [copied, setCopied] = useState(false);
  const selected =
    items.find((i) => i.id === selectedId) ?? items[0];

  function copyCss() {
    if (!selected) return;
    const lines = Object.entries(selected.vars).map(
      ([k, v]) => `  ${k}: ${v};`,
    );
    const css = `:root {\n${lines.join("\n")}\n}`;
    copyText(css).then((ok) => {
      if (!ok) return;
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const schemeLabel =
    selected?.scheme === "light" ? t("styles.light") : t("styles.dark");
  const textureLabel = (() => {
    switch (selected?.texture) {
      case "grid":
        return t("styles.grid");
      case "dots":
        return t("styles.dots");
      case "glow":
        return t("styles.glow");
      case "pixel":
        return t("styles.pixel");
      default:
        return t("styles.none");
    }
  })();

  if (!selected) return null;

  const designExcerpt = [
    `# Design System — ${selected.label}`,
    "",
    "Your project ships a design.md documenting these tokens.",
    "",
    ":root {",
    ...Object.entries(selected.vars).map(([k, v]) => `  ${k}: ${v};`),
    "}",
    "",
    `Scheme: ${schemeLabel} · Radius: ${selected.radius} · Texture: ${textureLabel}`,
  ].join("\n");

  return (
    <div className="space-y-8">
      {/* Live preview hero */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("styles.livePreview")}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">
              {t("styles.scheme")}: {schemeLabel}
            </span>
            <span className="chip">
              {t("styles.texture")}: {textureLabel}
            </span>
            <span className="chip">
              {t("styles.radius")}: {selected.radius}
            </span>
            <button type="button" className="btn-ghost text-sm" onClick={copyCss}>
              {copied ? t("styles.copied") : t("styles.copyCss")}
            </button>
            <Link
              href={`/builder?style=${selected.id}`}
              className="btn-solid text-sm"
            >
              {t("styles.useStyle")}
            </Link>
          </div>
        </div>
        <Preview item={selected} scale={1} />
        <div className="mt-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            {t("styles.designExcerpt")}
          </div>
          <pre className="overflow-x-auto rounded-xl border border-line bg-surface p-4 text-xs leading-relaxed">
            <code>{designExcerpt}</code>
          </pre>
        </div>
      </div>

      {/* Gallery */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">{t("styles.allStyles")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const active = item.id === selected.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className="group block text-left"
                aria-pressed={active}
              >
                <div
                  className="overflow-hidden rounded-2xl border transition"
                  style={{
                    borderColor: active
                      ? `rgb(${item.vars["--accent"]})`
                      : "transparent",
                  }}
                >
                  <Preview item={item} scale={0.78} />
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-2">
                  <span className="font-medium">{item.label}</span>
                  <span
                    className="font-mono text-[11px]"
                    style={{ color: "rgb(var(--muted))" }}
                  >
                    {item.scheme}
                  </span>
                </div>
                <p
                  className="text-xs"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  {item.note}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
