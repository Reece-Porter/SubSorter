"use client";

import { useTheme } from "@/lib/theme";
import { IconMoon, IconSun } from "./icons";

/** Compact header toggle — flips between light and dark. Full 3-way control lives in Settings. */
export function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  const next = resolved === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className="grid h-9 w-9 place-items-center rounded-xl border border-hairline bg-card text-ink-600 transition-colors hover:bg-sunken hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40"
    >
      {resolved === "dark" ? <IconSun width={17} height={17} /> : <IconMoon width={17} height={17} />}
    </button>
  );
}
