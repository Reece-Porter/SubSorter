import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0f172a",
          800: "#1e293b",
          700: "#334155",
          600: "#475569",
          500: "#64748b",
          400: "#94a3b8",
        },
        canvas: {
          DEFAULT: "#f8fafc",
          card: "#ffffff",
          sunken: "#f1f5f9",
        },
        line: "#e2e8f0",
        brand: {
          50: "#eef4ff",
          100: "#dbe6fe",
          500: "#3457d5",
          600: "#2c47b8",
          700: "#243a97",
        },
        positive: { 50: "#ecfdf5", 500: "#0f9d6a", 600: "#0b7d54" },
        caution: { 50: "#fffbeb", 500: "#d19a00", 600: "#a67c00" },
        urgent: { 50: "#fef2f2", 500: "#dc2626", 600: "#b91c1c" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(15,23,42,0.04), 0 1px 3px 0 rgba(15,23,42,0.06)",
        cardHover: "0 4px 12px -2px rgba(15,23,42,0.10)",
        pop: "0 10px 30px -8px rgba(15,23,42,0.18)",
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
