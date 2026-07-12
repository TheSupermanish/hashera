import type { Config } from "tailwindcss";

// Token values copied 1:1 from the reference design system (.cesto-scope +
// @theme in inspirations/src/app/globals.css), converted from hsl to hex so
// Tailwind v3 alpha modifiers (bg-card/20 etc.) keep working.
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#09110c",        // hsl(147 33% 5%)
        foreground: "#fafafa",        // hsl(0 0% 98%)
        card: "#171717",              // hsl(0 0% 9%)
        "card-foreground": "#fafafa",
        popover: "#262626",           // hsl(0 0% 14.9%)
        "popover-foreground": "#fafafa",
        primary: "#00ff6a",           // hsl(145 100% 50%)
        "primary-foreground": "#091313", // hsl(180 36% 5.5%)
        secondary: "#0c1a18",         // hsl(171 37% 7.5%)
        "secondary-foreground": "#00ff6a",
        muted: "#0c1a18",             // hsl(171 37% 7.5%)
        "muted-foreground": "#8ba79f", // hsl(162 14% 60%)
        accent: "#0c1a18",
        "accent-foreground": "#00ff6a",
        destructive: "#e9794e",       // hsl(16.5 78% 61%)
        border: "#272727",            // hsl(0 0% 15.5%)
        input: "#333333",             // hsl(0 0% 20%)
        cesto: {
          green: "#00ff6a",
          "green-400": "#4ade80",
          emerald: "#10b981",
          coral: "#ef8c6b",
          bg: "#09110c",
          border: "#1f3a31",
          "border-soft": "#123024",
          desc: "#758a80",
          muted: "#8ba79f",
          purple: "#c084fc",
          "card-top": "#051e16",
          "card-bottom": "#1f3a31",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
        geist: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        manrope: ["var(--f-manrope)", "Manrope", "system-ui", "sans-serif"],
        barlow: ["var(--f-barlow)", "Barlow", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
