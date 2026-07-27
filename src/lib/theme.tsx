"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemePref = "system" | "light" | "dark";
export const THEME_KEY = "subghost-theme";

interface ThemeCtx {
  /** The user's preference. */
  theme: ThemePref;
  /** The actual theme in effect right now ("light" | "dark"). */
  resolved: "light" | "dark";
  setTheme: (t: ThemePref) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

function systemResolved(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Apply (or clear) the data-theme attribute that overrides the media query. */
function apply(theme: ThemePref) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // Hydrate the preference (the inline head script already applied it pre-paint).
  useEffect(() => {
    let stored: ThemePref = "system";
    try {
      const v = localStorage.getItem(THEME_KEY);
      if (v === "light" || v === "dark") stored = v;
    } catch {
      /* ignore */
    }
    setThemeState(stored);
    setResolved(stored === "system" ? systemResolved() : stored);
  }, []);

  // Track OS changes while on "system".
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (theme === "system") setResolved(mq.matches ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((t: ThemePref) => {
    setThemeState(t);
    setResolved(t === "system" ? systemResolved() : t);
    apply(t);
    try {
      if (t === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<ThemeCtx>(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/** Inline script string that sets data-theme before first paint (no flash). */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;
