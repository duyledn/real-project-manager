"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
const LS_THEME = "re_theme";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Inline script string that applies the persisted theme before first paint,
 *  avoiding a light→dark flash. Rendered in <head> by the root layout. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${LS_THEME}');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  // Sync from whatever the init script (or a prior session) set on <html>.
  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setThemeState(current === "dark" ? "dark" : "light");
  }, []);

  function apply(t: Theme) {
    setThemeState(t);
    if (t === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    try {
      localStorage.setItem(LS_THEME, t);
    } catch {
      /* ignore */
    }
  }

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme: apply, toggleTheme: () => apply(theme === "dark" ? "light" : "dark") }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}
