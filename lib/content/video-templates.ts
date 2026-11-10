// Video template catalog for the studio module.
//
// Source clips are CUSTOMER ASSETS: each template reads its hosted mp4 URL
// from `VIDEO_TEMPLATE_<ID>_URL` (studio shows an "unconfigured" state until
// set). Shipping placeholder binaries would bloat every ZIP and license a
// clip we don't own — see skills/video.md for the asset checklist.

import type { Lang } from "@/lib/i18n-core";

export interface VideoTemplate {
  id: string;
  name: Record<Lang, string>;
  tag: Record<Lang, string>;
  durationSec: number;
}

export const VIDEO_TEMPLATES: VideoTemplate[] = [
  {
    id: "dance-hook",
    durationSec: 15,
    name: { en: "Dance hook", zh: "舞蹈开场", ja: "ダンスフック", fr: "Accroche danse", de: "Tanz-Hook" },
    tag: { en: "High-energy opener", zh: "高能量开场", ja: "高エネルギー開幕", fr: "Ouverture énergique", de: "Energetischer Opener" },
  },
  {
    id: "unboxing",
    durationSec: 20,
    name: { en: "Unboxing", zh: "开箱种草", ja: "開封レビュー", fr: "Unboxing", de: "Unboxing" },
    tag: { en: "Product showcase", zh: "产品展示", ja: "商品紹介", fr: "Vitrine produit", de: "Produkt-Showcase" },
  },
  {
    id: "talking-head",
    durationSec: 25,
    name: { en: "Talking head", zh: "口播讲解", ja: "トークヘッド", fr: "Face caméra", de: "Talking Head" },
    tag: { en: "Explainer / opinion", zh: "讲解/观点", ja: "解説／意見", fr: "Explication / avis", de: "Erklärer / Meinung" },
  },
];

export function getVideoTemplate(id: string): VideoTemplate | undefined {
  return VIDEO_TEMPLATES.find((t) => t.id === id);
}

/** Hosted source clip for a template; empty until the operator configures it. */
export function templateSourceUrl(t: VideoTemplate): string {
  return (
    process.env[`VIDEO_TEMPLATE_${t.id.toUpperCase().replaceAll("-", "_")}_URL`]
      ?.trim() ?? ""
  );
}
