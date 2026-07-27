// The base path the app is served under (e.g. "/SubSorter" on GitHub Pages, "" locally).
// next/link and the router handle this automatically, but absolute asset URLs we
// reference from JS (service worker, pdf.js worker, Tesseract engine, manifest) do not,
// so prefix them with asset().
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Prefix an absolute app-root path with the base path. asset("/sw.js") -> "/SubSorter/sw.js" */
export function asset(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${p}`;
}
