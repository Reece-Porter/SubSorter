/** @type {import('next').NextConfig} */

// For GitHub Pages the app is served from https://<user>.github.io/<repo>/,
// so it needs a base path. Set NEXT_PUBLIC_BASE_PATH="/<repo>" at build time
// (the deploy workflow does this); locally it stays empty for a root-served app.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  output: "export", // static HTML export — no server needed (fully client-side)
  trailingSlash: true, // emit /import/index.html so GitHub Pages serves clean URLs
  basePath: basePath || undefined,
  images: { unoptimized: true },
};

export default nextConfig;
