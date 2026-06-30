"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/** What the user picked. "auto" resolves to light/dark by the time of day. */
export type ThemeMode = "light" | "dark" | "auto";
/** The concrete theme actually applied to <html>. */
export type Theme = "light" | "dark";

const LS_THEME = "re_theme";
/** Night hours for "auto": dark from 18:00 up to (but not including) 06:00. */
const NIGHT_START = 18;
const NIGHT_END = 6;

interface ThemeContextValue {
  /** The resolved theme currently on screen. */
  theme: Theme;
  /** The user's chosen mode (may be "auto"). */
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isNight(d = new Date()): boolean {
  const h = d.getHours();
  return h >= NIGHT_START || h < NIGHT_END;
}

/** Resolve a mode into the concrete theme to apply right now. */
export function resolveTheme(mode: ThemeMode): Theme {
  if (mode === "auto") return isNight() ? "dark" : "light";
  return mode;
}

/** Inline script string that applies the persisted theme before first paint,
 *  avoiding a light→dark flash. Handles the time-of-day "auto" mode too.
 *  Rendered in <head> by the root layout. */
export const themeInitScript = `(function(){try{var m=localStorage.getItem('${LS_THEME}')||'light';var dark=m==='dark';if(m==='auto'){var h=new Date().getHours();dark=h>=${NIGHT_START}||h<${NIGHT_END};}if(dark){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [theme, setThemeState] = useState<Theme>("light");
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  function applyResolved(m: ThemeMode) {
    const resolved = resolveTheme(m);
    setThemeState(resolved);
    if (resolved === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
  }

  // Restore the saved mode on first load and sync state to whatever the init
  // script already painted.
  useEffect(() => {
    let saved: ThemeMode = "light";
    try {
      const v = localStorage.getItem(LS_THEME);
      if (v === "light" || v === "dark" || v === "auto") saved = v;
    } catch {
      /* ignore */
    }
    setModeState(saved);
    applyResolved(saved);
  }, []);

  // While in "auto", re-check the clock every minute so the theme flips at
  // dawn/dusk without a reload. Clean up whenever the mode changes.
  useEffect(() => {
    if (tick.current) clearInterval(tick.current);
    if (mode === "auto") {
      tick.current = setInterval(() => applyResolved("auto"), 60_000);
    }
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [mode]);

  function setMode(m: ThemeMode) {
    setModeState(m);
    applyResolved(m);
    try {
      localStorage.setItem(LS_THEME, m);
    } catch {
      /* ignore */
    }
  }

  return (
    <ThemeContext.Provider
      value={{ theme, mode, setMode, toggleTheme: () => setMode(theme === "dark" ? "light" : "dark") }}
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
