"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";
import { IconChart, IconFlag, IconGear, IconGhost, IconHome } from "./icons";
import { useStore } from "@/lib/store";

const NAV = [
  { href: "/", label: "Dashboard", icon: IconHome },
  { href: "/review", label: "Review", icon: IconFlag },
  { href: "/stats", label: "Stats", icon: IconChart },
  { href: "/settings", label: "Settings", icon: IconGear },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { subscriptions } = useStore();
  const flaggedCount = subscriptions.filter((s) => s.flaggedUnused && s.status === "active").length;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="min-h-screen flex flex-col">
      {/* Desktop / top header */}
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-white">
                <IconGhost width={20} height={20} />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-ink-900">Subscription Ghost</span>
                <span className="text-[11px] text-ink-500">Private · on this device only</span>
              </span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              {NAV.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cx(
                    "relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    isActive(href) ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-canvas-sunken"
                  )}
                >
                  <Icon width={18} height={18} />
                  {label}
                  {href === "/review" && flaggedCount > 0 && (
                    <span className="ml-0.5 rounded-full bg-caution-500 px-1.5 text-[10px] font-semibold text-white">
                      {flaggedCount}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 pb-28 sm:pb-16 pt-6">{children}</main>

      {/* Mobile bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-canvas-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cx(
                "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                isActive(href) ? "text-brand-600" : "text-ink-500"
              )}
            >
              <Icon width={22} height={22} />
              {label}
              {href === "/review" && flaggedCount > 0 && (
                <span className="absolute right-1/2 top-1.5 translate-x-3.5 rounded-full bg-caution-500 px-1 text-[9px] font-semibold text-white">
                  {flaggedCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
