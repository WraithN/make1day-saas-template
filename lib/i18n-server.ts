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
 *   1. `x-sk-lang` request header — set by middleware when the URL carries a
 *      locale path prefix (`/zh/pricing`) so crawlers following the hreflang
 *      URLs get localized, crawlable HTML (crawlers don't persist cookies).
 *   2. `sk_lang` cookie — remembers the choice for human return visits on the
 *      bare path.
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

/**
 * The locale carried by the URL itself (path prefix), if any. Canonical and
 * hreflang tags must describe the URL being served, not the visitor's cookie:
 * a cookie-switched visitor on `/pricing` still gets `pricing` (EN) as the
 * canonical — the localized variant lives at `/zh/pricing` and is only
 * self-canonical when THAT is the requested URL.
 */
export async function getCanonicalLang(): Promise<Lang | null> {
  const h = await headers();
  const v = h.get("x-sk-locale");
  return isLang(v) ? v : null;
}

/** Raw translated string (no markup). */
export function tr(lang: Lang, key: string): string {
  return dict[lang]?.[key] ?? dict.en[key] ?? key;
}

/** Translate + apply the `{{g}}…{{/g}}` gradient-markup used by brand copy. */
export function trMarkup(lang: Lang, key: string): string {
  return applyMarkup(tr(lang, key));
}
