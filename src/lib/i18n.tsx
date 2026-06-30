"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { VI } from "./translations";

/** Supported interface languages. This is purely a UI-text concern — it never
 *  touches currency, exchange rates, or any stored project data. */
export type Lang = "en" | "vi";

const LS_LANG = "re_lang";

type Vars = Record<string, string | number>;

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Translate a UI string. English text is the key; in English mode (or when a
   *  phrase isn't in the dictionary) the key itself is returned, so coverage
   *  degrades gracefully. `{name}` placeholders are filled from `vars`. */
  t: (key: string, vars?: Vars) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function fill(s: string, vars?: Vars): string {
  if (!vars) return s;
  let out = s;
  for (const k of Object.keys(vars)) out = out.split(`{${k}}`).join(String(vars[k]));
  return out;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Restore the saved language on first client render. Defaulting to "en" on
  // both server and first client render keeps hydration stable.
  useEffect(() => {
    try {
      const v = localStorage.getItem(LS_LANG);
      if (v === "en" || v === "vi") setLangState(v);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      document.documentElement.setAttribute("lang", lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  function setLang(l: Lang) {
    setLangState(l);
    try {
      localStorage.setItem(LS_LANG, l);
    } catch {
      /* ignore */
    }
  }

  function t(key: string, vars?: Vars): string {
    if (lang === "en") return fill(key, vars);
    return fill(VI[key] ?? key, vars);
  }

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside LanguageProvider");
  return ctx;
}
