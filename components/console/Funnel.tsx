import type { FunnelStep } from "@/lib/traffic";

// A conversion funnel rendered as a set of proportional bars.
//
// Every step is a horizontal bar whose width is the share of landing
// sessions it represents, so the shape of the funnel is readable at a
// glance. The number on the right is the absolute session count; the small
// line underneath shows the step-to-step drop-off.
//
// Server-safe: no hooks, no browser APIs.

export type FunnelCopy = {
  labels: Record<string, string>;
  share: string;
  stepRate: string;
};

function percent(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  const pct = value * 100;
  if (pct > 0 && pct < 1) return "<1%";
  return `${Math.round(pct)}%`;
}

export function Funnel({
  steps,
  copy,
}: {
  steps: FunnelStep[];
  copy: FunnelCopy;
}) {
  if (steps.length === 0) return null;
  const top = steps[0]?.sessions || 1;

  return (
    <ol className="space-y-3">
      {steps.map((step, i) => {
        const width = Math.max(3, Math.round((step.sessions / top) * 100));
        // The accent ramp darkens with depth so the funnel reads top-down.
        const tones = [
          "bg-accent/70",
          "bg-accent/55",
          "bg-accent/40",
          "bg-accent/28",
          "bg-accent/18",
        ];
        const tone = tones[Math.min(i, tones.length - 1)];

        return (
          <li key={step.key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-ink">
                {copy.labels[step.key] ?? step.key}
              </span>
              <span className="tabular-nums text-sm font-semibold text-ink">
                {step.sessions.toLocaleString()}
                <span className="ml-2 font-normal text-muted">
                  {percent(step.rate)} {copy.share}
                </span>
              </span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-surface">
              <div
                className={`h-full rounded-full ${tone}`}
                style={{ width: `${width}%` }}
              />
            </div>
            {i > 0 && (
              <div className="mt-1 text-xs text-muted">
                {percent(step.stepRate)} {copy.stepRate}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
