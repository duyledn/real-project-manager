"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

/** Glass pill that flips between light/dark. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      onClick={toggleTheme}
      className="btn gap-2"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {dark ? <Sun size={16} className="text-accent" /> : <Moon size={16} className="text-accent" />}
      {!compact && <span>{dark ? "Light" : "Dark"}</span>}
    </button>
  );
}
