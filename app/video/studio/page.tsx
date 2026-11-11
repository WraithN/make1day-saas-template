"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import {
  VIDEO_TEMPLATES,
  getVideoTemplate,
  type VideoAspect,
} from "@/lib/content/video-templates";

type Job = {
  id: string;
  status: "queued" | "running" | "done" | "failed";
  output_url: string | null;
  error: string | null;
  credits: number;
};

// Video studio: consent-first face-swap job creator. The portrait-rights
// attestation checkbox gates the submit button client-side AND the API
// re-validates `consent: true` server-side (recorded as consent_at).
export default function VideoStudioPage() {
  const { t } = useLanguage();
  const [templateId, setTemplateId] = useState("dance-hook");
  const [aspect, setAspect] = useState<VideoAspect>("9:16");
  const [imageUrl, setImageUrl] = useState("");
  const [resolution, setResolution] = useState<"480p" | "720p" | "1080p">("480p");
  const { lang } = useLanguage();
  const template = getVideoTemplate(templateId);
  const aspects = template?.aspects ?? (["9:16"] as VideoAspect[]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [credits, setCredits] = useState<{ used: number; limit: number } | null>(null);

  useEffect(() => {
    if (!job || job.status === "done" || job.status === "failed") return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/video/jobs/${job.id}`);
        if (!res.ok) return;
        const data = await res.json();
        setJob(data.job);
      } catch {
        /* retry next tick */
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [job]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/video/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId, imageUrl, resolution, aspect, consent: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      setCredits(data.credits);
      setJob({
        id: data.jobId,
        status: "queued",
        output_url: null,
        error: null,
        credits: 1,
      });
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="wrap py-10 sm:py-16">
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl font-semibold">{t("video.title")}</h1>
        {credits && (
          <p className="mt-2 text-[13px] text-muted">
            {t("video.credits")}: {credits.used}/{credits.limit}
          </p>
        )}

        <div className="card mt-6 space-y-4">
          <label className="block text-[13px] font-medium">
            {t("video.templateLabel")}
            <select
              className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2"
              value={templateId}
              onChange={(e) => {
                setTemplateId(e.target.value);
                const next = getVideoTemplate(e.target.value);
                if (next && !next.aspects.includes(aspect)) {
                  setAspect(next.aspects[0]);
                }
              }}
            >
              {VIDEO_TEMPLATES.map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {tp.name[lang] ?? tp.name.en} · {tp.aspects.join(" / ")}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[13px] font-medium">
            {t("video.aspectLabel")}
            <select
              className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2"
              value={aspect}
              onChange={(e) => setAspect(e.target.value as VideoAspect)}
            >
              {aspects.map((a) => (
                <option key={a} value={a}>
                  {a}
                  {a === "9:16" ? " · vertical" : a === "16:9" ? " · wide" : " · square"}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[13px] font-medium">
            {t("video.selfieUrlLabel")}
            <input
              className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>

          <label className="block text-[13px] font-medium">
            {t("video.resolutionLabel")}
            <select
              className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2"
              value={resolution}
              onChange={(e) =>
                setResolution(e.target.value as "480p" | "720p" | "1080p")
              }
            >
              <option value="480p">480p</option>
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
            </select>
          </label>

          <div className="rounded-lg border border-line bg-surface p-3">
            <div className="text-[13px] font-semibold">
              {t("video.consentTitle")}
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
              {t("video.consentBody")}
            </p>
            <a
              href="/acceptable-use"
              className="mt-1 inline-block text-[12px] font-medium underline-offset-2 hover:underline"
              style={{ color: "rgb(var(--accent))" }}
            >
              {t("video.aupLink")}
            </a>
            <label className="mt-2 flex items-start gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5"
              />
              {t("video.consentCheck")}
            </label>
          </div>

          <button
            className="btn-solid w-full"
            disabled={!consent || !imageUrl || busy}
            onClick={submit}
          >
            {busy ? t("video.pending") : t("video.submit")}
          </button>
          {error && <p className="text-[13px] text-accent">{error}</p>}
        </div>

        {job && (
          <div className="card mt-6">
            <div className="text-[13px] font-semibold">
              {job.status === "queued" && t("video.pending")}
              {job.status === "running" && t("video.running")}
              {job.status === "done" && t("video.done")}
              {job.status === "failed" && `${t("video.failed")}: ${job.error ?? ""}`}
            </div>
            {job.status === "done" && job.output_url && (
              <>
                <video
                  controls
                  src={job.output_url}
                  className="mt-3 w-full rounded-lg border border-line"
                />
                <p className="mt-2 text-[12px] text-muted">
                  {t("video.watermark")}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
