import type { Metadata } from "next";
import { getLang, tr } from "@/lib/i18n-server";
import { STYLE_OPTIONS, type StyleId } from "@/lib/generator/config";
import { PALETTES, themeVars, textureStyle } from "@/lib/generator/themes";
import { StylePlayground, type StyleItem } from "@/components/StylePlayground";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Styles — make1day design system",
  description:
    "Preview all sixteen make1day themes — including the hand-drawn Doodle palette, Y2K, pixel and neon — every template ships with a full set of CSS variables. Pick a look, then carry it into the builder.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/styles" },
};

export default async function StylesPage() {
  const lang = await getLang();

  const items: StyleItem[] = STYLE_OPTIONS.map((o) => {
    const id = o.id as StyleId;
    const p = PALETTES[id];
    return {
      id: o.id,
      label: o.label,
      note: o.note,
      scheme: p.scheme,
      radius: p.radius,
      texture: p.texture,
      vars: themeVars(id),
      textureStyle: textureStyle(id),
    };
  });

  return (
    <div className="wrap py-10 sm:py-14">
      <div className="mb-8 max-w-2xl">
        <div className="eyebrow">{tr(lang, "styles.eyebrow")}</div>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
          {tr(lang, "styles.title")}
        </h1>
        <p className="mt-3 text-ink-soft">{tr(lang, "styles.subtitle")}</p>
      </div>
      <StylePlayground items={items} />
    </div>
  );
}
