import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F1F3F5",
        panel: "#FFFFFF",
        ink: "#1A2332",
        "ink-muted": "#64748B",
        blueprint: "#1D4ED8",
        amber: "#92400E",
        green: "#166534",
        red: "#991B1B",
        hair: "rgba(26,35,50,0.14)",
      },
      fontFamily: {
        display: ["Be Vietnam Pro", "sans-serif"],
        sans: ["Be Vietnam Pro", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
