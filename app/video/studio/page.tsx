"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";

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
  const [imageUrl, setImageUrl] = useState("");
  const [resolution, setResolution] = useState<"480p" | "720p" | "1080p">("480p");
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
        body: JSON.stringify({ templateId, imageUrl, resolution, consent: true }),
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
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <option value="dance-hook">Dance hook</option>
              <option value="unboxing">Unboxing</option>
              <option value="talking-head">Talking head</option>
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
              <option value="480p">480p · 1 credit</option>
              <option value="720p">720p · 2 credits</option>
              <option value="1080p">1080p · 5 credits</option>
            </select>
          </label>

          <div className="rounded-lg border border-line bg-surface p-3">
            <div className="text-[13px] font-semibold">
              {t("video.consentTitle")}
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
              {t("video.consentBody")}
            </p>
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
