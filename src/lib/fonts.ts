import localFont from "next/font/local";

// Self-hosted, loaded via next/font so URLs respect the base path (GitHub Pages)
// and there's no layout shift. These expose the --font-serif / --font-sans CSS
// variables the design tokens in globals.css build on.
export const fraunces = localFont({
  variable: "--font-serif",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
  src: [
    { path: "../fonts/fraunces-var.woff2", weight: "100 900", style: "normal" },
    { path: "../fonts/fraunces-var-italic.woff2", weight: "100 900", style: "italic" },
  ],
});

export const geist = localFont({
  variable: "--font-sans",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
  src: [{ path: "../fonts/geist-var.woff2", weight: "100 900", style: "normal" }],
});
