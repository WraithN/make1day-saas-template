"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  dict,
  LANGS,
  applyMarkup,
  interpolate,
  I18N_STORAGE_KEY,
  type Lang,
} from "./i18n-core";

export { LANGS, type Lang } from "./i18n-core";

export function useDict() {
  return dict;
}

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string };
const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({
  children,
  initialLang = "en",
}: {
  children: ReactNode;
  initialLang?: Lang;
}) {
  const pathname = usePathname();
  const [lang, setLangState] = useState<Lang>(initialLang);

  // Restore saved language on mount (user's explicit choice wins over cookie).
  useEffect(() => {
    const saved = localStorage.getItem(I18N_STORAGE_KEY) as Lang | null;
    if (saved && dict[saved] && saved !== initialLang) setLangState(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Translate every [data-i18n] node whenever language or route changes. This
  // keeps server-rendered text (emitted via <Trans>) in sync after a switch.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      let vars: Record<string, string> | undefined;
      const rawVars = el.getAttribute("data-i18n-vars");
      if (rawVars) {
        try {
          vars = JSON.parse(rawVars) as Record<string, string>;
        } catch {
          vars = undefined;
        }
      }
      const val = dict[lang]?.[key] ?? dict.en[key] ?? el.textContent ?? key;
      el.innerHTML = applyMarkup(interpolate(val, vars));
    });
  }, [lang, pathname]);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(I18N_STORAGE_KEY, l);
    // Keep the server cookie in sync so the next server render matches the UI.
    if (typeof document !== "undefined") {
      document.cookie = `${I18N_STORAGE_KEY}=${l}; path=/; max-age=31536000; samesite=lax`;
    }
  };

  const t = (k: string) => dict[lang]?.[k] ?? dict.en[k] ?? k;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx)
    throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}

/**
 * Server-rendered translation. Renders the string for `lang` (resolved on the
 * server from the cookie) with the brand `{{g}}` gradient markup applied, and
 * keeps `data-i18n` so the client effect can re-translate on language switch.
 */
export function Trans({
  k,
  lang,
  vars,
}: {
  k: string;
  lang: Lang;
  vars?: Record<string, string | number>;
}) {
  const val = dict[lang]?.[k] ?? dict.en[k] ?? k;
  return (
    <span
      dangerouslySetInnerHTML={{ __html: applyMarkup(interpolate(val, vars)) }}
      data-i18n={k}
      data-i18n-vars={vars ? JSON.stringify(vars) : undefined}
    />
  );
}
