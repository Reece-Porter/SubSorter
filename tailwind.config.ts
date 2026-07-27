import type { Config } from "tailwindcss";

// All colours resolve to CSS variables defined in globals.css, so light/dark
// theming and any future re-tint happen in one place.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        card: "var(--card)",
        sunken: "var(--sunken)",
        hairline: "var(--hairline)",
        ink: {
          DEFAULT: "var(--ink)",
          900: "var(--ink)",
          800: "var(--ink-80)",
          700: "var(--ink-70)",
          600: "var(--ink-60)",
          500: "var(--ink-50)",
          400: "var(--ink-40)",
          300: "var(--ink-30)",
        },
        accent: {
          50: "var(--accent-50)",
          100: "var(--accent-100)",
          500: "var(--accent)",
          600: "var(--accent-600)",
          700: "var(--accent-700)",
          ink: "var(--accent-ink)",
        },
        positive: {
          50: "var(--positive-50)",
          500: "var(--positive)",
          600: "var(--positive-600)",
        },
        danger: {
          50: "var(--danger-50)",
          600: "var(--danger)",
        },

        /* ---- legacy aliases (pages not yet restyled inherit the new system) ---- */
        canvas: { DEFAULT: "var(--paper)", card: "var(--card)", sunken: "var(--sunken)" },
        line: "var(--hairline)",
        brand: {
          50: "var(--ink-05)",
          100: "var(--ink-10)",
          500: "var(--ink)",
          600: "var(--ink-80)",
          700: "#000000",
        },
        caution: { 50: "var(--accent-50)", 500: "var(--accent)", 600: "var(--accent-ink)" },
        urgent: { 50: "var(--accent-50)", 500: "var(--accent)", 600: "var(--accent-700)" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "var(--shadow)",
        cardHover: "var(--shadow-lift)",
        pop: "var(--shadow-pop)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
    },
  },
  plugins: [],
};
export default config;
