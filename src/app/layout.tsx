import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Subscription Ghost — find & cancel forgotten subscriptions",
  description:
    "Track recurring subscriptions, spot the ones you've forgotten, and stop paying for what you don't use. Private and on-device.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Sub Ghost", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0eee8" },
    { media: "(prefers-color-scheme: dark)", color: "#141210" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <StoreProvider>
            <AppShell>{children}</AppShell>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
