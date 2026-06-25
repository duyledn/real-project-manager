import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Existing token names are kept but re-pointed at the warm-glass
        // CSS variables so every screen re-skins (and gains dark mode) for free.
        paper: "var(--glass-2)",
        panel: "var(--surface-solid)",
        ink: "var(--text)",
        "ink-muted": "var(--muted)",
        faint: "var(--faint)",
        blueprint: "var(--accent)", // the old "primary" is now terracotta
        accent: "var(--accent)",
        "accent-2": "var(--accent-2)",
        amber: "var(--accent-2)",
        warn: "var(--warn)",
        green: "var(--pos)",
        red: "var(--neg)",
        hair: "var(--border)",
        glass: "var(--glass)",
        "glass-strong": "var(--glass-strong)",
      },
      fontFamily: {
        display: ["Plus Jakarta Sans", "sans-serif"],
        sans: ["Plus Jakarta Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        glass: "20px",
        card: "22px",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(.32,.72,0,1)",
      },
    },
  },
  plugins: [],
};

export default config;
