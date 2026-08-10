"use client";

import { useState, useEffect, useCallback } from "react";

export type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [theme, setTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    try {
      const stored = (localStorage.getItem("trevio-theme") as ThemeMode | null) || "system";
      setMode(stored);
    } catch {
      // Safari private browsing mode throws SecurityError on localStorage access.
      // Fall back to the default "system" theme.
    }
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const resolved: ResolvedTheme = mode === "system" ? (prefersDark ? "dark" : "light") : mode;
      setTheme(resolved);
      document.documentElement.classList.toggle("dark", resolved === "dark");
    };

    applyTheme();

    if (mode === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", applyTheme);
      return () => mediaQuery.removeEventListener("change", applyTheme);
    }
  }, [mode]);

  const setThemeMode = useCallback((next: ThemeMode) => {
    setMode(next);
    try {
      localStorage.setItem("trevio-theme", next);
    } catch {
      // Ignore storage errors in private browsing mode.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next: ThemeMode = prev === "light" ? "dark" : prev === "dark" ? "system" : "light";
      try {
        localStorage.setItem("trevio-theme", next);
      } catch {
        // Ignore storage errors in private browsing mode.
      }
      return next;
    });
  }, []);

  return { mode, theme, setThemeMode, toggleTheme };
}
