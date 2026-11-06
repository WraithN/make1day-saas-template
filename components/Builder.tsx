"use client";

import { useMemo, useState } from "react";
import {
  AUTH_OPTIONS,
  AI_OPTIONS,
  FEATURE_OPTIONS,
  PAYMENT_OPTIONS,
  DEPLOY_OPTIONS,
  SKILL_OPTIONS,
  DEFAULT_CONFIG,
  slugify,
  STYLE_OPTIONS,
  type BuilderConfig,
  type AuthProvider,
  type AiProvider,
  type Feature,
  type PaymentProvider,
  type DeployTarget,
  type StyleId,
  type SkillId,
} from "@/lib/generator/config";
import { themeVars, PALETTES, textureStyle } from "@/lib/generator/themes";
import { useLanguage } from "@/lib/i18n";
import { LicensePanel } from "./LicensePanel";

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

/** Save a generated ZIP to disk. */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function Builder({ initialStyle }: { initialStyle?: StyleId }) {
  const { t } = useLanguage();
  const [config, setConfig] = useState<BuilderConfig>(() =>
    initialStyle ? { ...DEFAULT_CONFIG, style: initialStyle } : DEFAULT_CONFIG,
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [needLicense, setNeedLicense] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewErr, setPreviewErr] = useState("");

  function set<K extends keyof BuilderConfig>(key: K, value: BuilderConfig[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  const slug = slugify(config.appName);
  const included = useMemo(() => {
    const items: string[] = [];
    if (config.auth.length) items.push(`Auth: ${config.auth.join(", ")}`);
    items.push(
      config.payment === "none"
        ? "Payments: none"
        : `Payments: ${config.payment}`,
    );
    items.push(
      config.ai.length ? `AI: ${config.ai.join(", ")}` : "AI: none",
    );
    config.features.forEach((f) => items.push(`Feature: ${f}`));
    items.push(`Style: ${config.style}`);
    items.push(`Deploy: ${config.deploy}`);
    items.push(`Skills: ${config.skills.join(", ")}`);
    return items;
  }, [config]);

  async function generate() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        // 402 = license gate. Show the localized redeem panel instead of an
        // opaque English error, and keep the visitor's configuration intact.
        if (res.status === 402 || j.code === "PAYMENT_REQUIRED") {
          setNeedLicense(true);
          setErr("");
          return;
        }
        setErr(j.error || "Generate failed");
        return;
      }
      setNeedLicense(false);
      const blob = await res.blob();
      downloadBlob(blob, `${slug}-shipkit.zip`);
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  }

  // The free preview: the file inventory of the configured build plus the
  // design tokens. It never contains application source code — the download
  // of the source tree is the product, and that needs a license.
  async function downloadPreview() {
    setPreviewBusy(true);
    setPreviewErr("");
    try {
      const res = await fetch("/api/generate/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setPreviewErr(
          j.code === "PREVIEW_LIMIT"
            ? t("builder.previewLimit")
            : j.error || "Preview failed",
        );
        return;
      }
      const blob = await res.blob();
      downloadBlob(blob, `${slug}-shipkit-preview.zip`);
    } catch {
      setPreviewErr("Network error");
    } finally {
      setPreviewBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
      {/* ── Left: configuration ───────────────────────────── */}
      <div className="space-y-8">
        <Section eyebrow={t("builder.s01")} title={t("builder.s01title")}>
          <input
            className="input max-w-sm"
            value={config.appName}
            onChange={(e) => set("appName", e.target.value)}
            placeholder={t("builder.appPlaceholder")}
          />
          <p className="mt-2 font-mono text-xs text-muted">
            {t("builder.pkgName")}{" "}
            <span className="text-accent">{slug}</span>
          </p>
        </Section>

        <Section eyebrow={t("builder.s02")} title={t("builder.s02title")}>
          <div className="flex flex-wrap gap-2">
            {AUTH_OPTIONS.map((o) => (
              <Chip
                key={o.id}
                active={config.auth.includes(o.id)}
                onClick={() => set("auth", toggle(config.auth, o.id))}
              >
                {o.label}
              </Chip>
            ))}
          </div>
        </Section>

        <Section eyebrow={t("builder.s03")} title={t("builder.s03title")}>
          <div className="grid gap-3 sm:grid-cols-2">
            {PAYMENT_OPTIONS.map((o) => (
              <RadioCard
                key={o.id}
                active={config.payment === o.id}
                title={o.label}
                note={t(`builder.pay.${o.id}.note`)}
                onClick={() => set("payment", o.id as PaymentProvider)}
              />
            ))}
          </div>
        </Section>

        <Section eyebrow={t("builder.s04")} title={t("builder.s04title")}>
          <div className="flex flex-wrap gap-2">
            {AI_OPTIONS.map((o) => (
              <Chip
                key={o.id}
                active={config.ai.includes(o.id)}
                sub={o.note}
                onClick={() => set("ai", toggle(config.ai, o.id as AiProvider))}
              >
                {o.label}
              </Chip>
            ))}
          </div>
        </Section>

        <Section eyebrow={t("builder.s05")} title={t("builder.s05title")}>
          <div className="flex flex-wrap gap-2">
            {FEATURE_OPTIONS.map((o) => (
              <Chip
                key={o.id}
                active={config.features.includes(o.id)}
                sub={t(`builder.feat.${o.id}.d`)}
                onClick={() =>
                  set("features", toggle(config.features, o.id as Feature))
                }
              >
                {t(`builder.feat.${o.id}`)}
              </Chip>
            ))}
          </div>
        </Section>

        <Section eyebrow={t("builder.s06")} title={t("builder.s06title")}>
          <div className="grid gap-3 sm:grid-cols-2">
            {STYLE_OPTIONS.map((o) => {
              const pal = PALETTES[o.id];
              const active = config.style === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => set("style", o.id as StyleId)}
                  className={`rounded-xl border p-4 text-left transition ${
                    active
                      ? "border-accent bg-accent/10"
                      : "border-line hover:border-accent/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{o.label}</span>
                    <span
                      className={`h-3 w-3 rounded-full border ${
                        active ? "border-accent bg-accent" : "border-line"
                      }`}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted">{o.note}</p>
                  <div className="mt-3 flex gap-1.5">
                    {[pal.bg, pal.surface, pal.accent, pal.accent2].map(
                      (c, i) => (
                        <span
                          key={i}
                          className="h-5 w-5 rounded-md border border-line"
                          style={{ backgroundColor: `rgb(${c.split(" ").join(",")})` }}
                        />
                      ),
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Local, contained preview of the chosen style — does NOT recolor
              the ShipKit site. */}
          <StylePreview style={config.style} />
        </Section>

        <Section eyebrow={t("builder.s07")} title={t("builder.s07title")}>
          <div className="grid gap-3 sm:grid-cols-2 max-w-md">
            {DEPLOY_OPTIONS.map((o) => (
              <RadioCard
                key={o.id}
                active={config.deploy === o.id}
                title={o.label}
                note={t(`builder.deploy.${o.id}.note`)}
                onClick={() => set("deploy", o.id as DeployTarget)}
              />
            ))}
          </div>
        </Section>

        <Section eyebrow={t("builder.s08")} title={t("builder.s08title")}>
          <p className="mb-3 text-sm text-muted">
            {t("builder.s08hint")}
          </p>
          <div className="flex flex-wrap gap-2">
            {SKILL_OPTIONS.map((o) => (
              <Chip
                key={o.id}
                active={config.skills.includes(o.id)}
                sub={o.note}
                onClick={() =>
                  set("skills", toggle(config.skills, o.id as SkillId))
                }
              >
                {o.label}
              </Chip>
            ))}
          </div>
        </Section>
      </div>

      {/* ── Right: live config ───────────────────────────── */}
      <aside className="lg:sticky lg:top-20 self-start">
        <div className="card">
          <div className="eyebrow mb-3">{t("builder.liveConfig")}</div>
          <pre className="max-h-64 overflow-auto rounded-lg bg-bg border border-line p-3 font-mono text-[11px] leading-relaxed text-ink-soft">
{JSON.stringify(config, null, 2)}
          </pre>
          <div className="mt-4">
            <div className="eyebrow mb-2">{t("builder.included")}</div>
            <ul className="space-y-1 font-mono text-[11px] text-muted">
              {included.map((i) => (
                <li key={i}>· {i}</li>
              ))}
            </ul>
          </div>
          <button
            className="btn-solid mt-5 w-full"
            data-cta="builder-generate"
            onClick={generate}
            disabled={busy}
          >
            {busy ? t("login.sending") : t("builder.generate")}
          </button>
          {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
          {needLicense && (
            <LicensePanel
              compact
              onRedeemed={() => setErr("")}
            />
          )}
          <p className="mt-3 text-xs text-muted">{t("builder.downloadNote")}</p>

          {/* Free preview: no source code, just the inventory + tokens. */}
          <div className="mt-3 border-t border-line pt-3">
            <button
              className="btn w-full"
              data-cta="builder-preview"
              onClick={downloadPreview}
              disabled={previewBusy}
            >
              {previewBusy ? t("builder.previewBusy") : t("builder.preview")}
            </button>
            <p className="mt-2 text-[11px] text-muted">
              {t("builder.previewNote")}
            </p>
            {previewErr && (
              <p className="mt-2 text-sm text-red-400">{previewErr}</p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

/** Contained mock that renders sample components in the selected palette. */
function StylePreview({ style }: { style: StyleId }) {
  const p = PALETTES[style];
  const v = themeVars(style);
  const radius = p.radius;
  return (
    <div
      className="mt-4 overflow-hidden border border-line"
      style={{
        ...v,
        ...textureStyle(style),
        backgroundColor: "rgb(var(--bg))",
        color: "rgb(var(--ink))",
        borderRadius: `calc(${radius} * 1.25)`,
      }}
    >
      <div className="border-b border-line px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
          {style} · preview
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div className="text-lg font-semibold">
          <span className="grad-text">Aa</span> Sample heading
        </div>
        <div
          className="border border-line"
          style={{
            backgroundColor: "rgb(var(--surface))",
            borderRadius: radius,
            padding: "1rem",
          }}
        >
          <p className="text-sm" style={{ color: "rgb(var(--ink-soft))" }}>
            A surface card in this palette — buttons, text and borders all adapt.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="font-semibold"
            style={{
              backgroundColor: "rgb(var(--accent))",
              color: "rgb(var(--bg))",
              borderRadius: radius,
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
            }}
          >
            Primary
          </button>
          <span
            className="font-mono text-[11px] border border-line"
            style={{
              color: "rgb(var(--ink-soft))",
              borderRadius: radius,
              padding: "0.25rem 0.5rem",
            }}
          >
            chip
          </span>
        </div>
      </div>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      <div className="eyebrow mb-1">{eyebrow}</div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Chip({
  active,
  sub,
  onClick,
  children,
}: {
  active: boolean;
  sub?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
        active
          ? "border-accent bg-accent/10 text-ink"
          : "border-line text-ink-soft hover:border-accent/50"
      }`}
    >
      <div className="font-medium">{children}</div>
      {sub && <div className="mt-0.5 font-mono text-[10px] text-muted">{sub}</div>}
    </button>
  );
}

function RadioCard({
  active,
  title,
  note,
  onClick,
}: {
  active: boolean;
  title: string;
  note?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        active
          ? "border-accent bg-accent/10"
          : "border-line hover:border-accent/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold">{title}</span>
        <span
          className={`h-3 w-3 rounded-full border ${
            active ? "border-accent bg-accent" : "border-line"
          }`}
        />
      </div>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </button>
  );
}
