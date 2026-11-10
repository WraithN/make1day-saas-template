import type { Metadata } from "next";
import Link from "next/link";
import { getLang, tr } from "@/lib/i18n-server";
import { langAlternatePaths } from "@/lib/seo-alternates";
import {
  VIDEO_TEMPLATES,
  templateSourceUrl,
} from "@/lib/content/video-templates";
import { videoConfigured } from "@/lib/video/fal";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: {
    canonical: "/video",
    languages: langAlternatePaths("/video"),
  },
};

// Gallery of face-swap video templates. Session-gated by middleware; the
// studio itself is Care-subscription-gated at the API layer.
export default async function VideoGalleryPage() {
  const lang = await getLang();
  const configured = videoConfigured();

  return (
    <section className="wrap py-10 sm:py-16">
      <div className="max-w-2xl">
        <div className="eyebrow mb-3">{tr(lang, "video.eyebrow")}</div>
        <h1 className="text-4xl font-semibold">{tr(lang, "video.title")}</h1>
        <p className="mt-4 text-ink-soft">{tr(lang, "video.subtitle")}</p>
        <p className="mt-3 text-[13px] text-muted">{tr(lang, "video.needsSub")}</p>
        {!configured && (
          <p className="mt-3 rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-accent">
            {tr(lang, "video.unconfigured")}
          </p>
        )}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {VIDEO_TEMPLATES.map((t) => (
          <div key={t.id} className="card flex flex-col">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[15px] font-semibold">
                {t.name[lang] ?? t.name.en}
              </span>
              <span className="text-[12px] text-muted">{t.durationSec}s</span>
            </div>
            <div className="mt-1 text-[13px] text-ink-soft">
              {t.tag[lang] ?? t.tag.en}
            </div>
            <div className="mt-2 flex gap-1.5">
              {t.aspects.map((a) => (
                <span
                  key={a}
                  className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted"
                >
                  {a}
                </span>
              ))}
            </div>
            <div className="mt-auto pt-4 text-[12px] text-muted">
              {templateSourceUrl(t) ? "✓" : "—"}{" "}
              {tr(lang, "video.templateLabel")}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <Link href="/video/studio" className="btn-solid">
          {tr(lang, "video.submit")}
        </Link>
      </div>
    </section>
  );
}
