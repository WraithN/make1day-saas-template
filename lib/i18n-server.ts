// Server-side i18n helpers. This module is NOT "use client" so it can read
// cookies via next/headers. Pages use `getLang()` to render the right language
// on the server (no flash, crawlable), and import `tr`/`trMarkup` for markup.

import { cookies, headers } from "next/headers";
import { dict, applyMarkup, type Lang } from "./i18n-core";

export type { Lang } from "./i18n-core";

const LANGS: Lang[] = ["en", "zh", "ja", "fr", "de"];

export function isLang(v: string | null | undefined): v is Lang {
  return !!v && (LANGS as string[]).includes(v);
}

/**
 * Resolve the active language on the server.
 * Priority:
 *   1. `x-sk-lang` request header — set by middleware from `?lang=` so crawlers
 *      following the hreflang URLs get localized, crawlable HTML (crawlers
 *      don't persist cookies, and the root layout can't read searchParams).
 *   2. `sk_lang` cookie — remembers the choice for human return visits.
 *   3. English default.
 */
export async function getLang(): Promise<Lang> {
  const h = await headers();
  const fromHeader = h.get("x-sk-lang");
  if (isLang(fromHeader)) return fromHeader;
  const store = await cookies();
  const v = store.get("sk_lang")?.value;
  return isLang(v) ? v : "en";
}

/** Raw translated string (no markup). */
export function tr(lang: Lang, key: string): string {
  return dict[lang]?.[key] ?? dict.en[key] ?? key;
}

/** Translate + apply the `{{g}}…{{/g}}` gradient-markup used by brand copy. */
export function trMarkup(lang: Lang, key: string): string {
  return applyMarkup(tr(lang, key));
}
