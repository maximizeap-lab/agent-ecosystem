import { useEffect } from "react";
import { useUIStore } from "@store/uiStore";
import type { ThemeMode } from "@types/index";

/**
 * useTheme — Syncs the Zustand theme preference with the DOM's `data-theme`
 * attribute and the system `prefers-color-scheme` media query.
 */
export function useTheme() {
  const { theme, setTheme, toggleTheme } = useUIStore();

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (mode: "light" | "dark") => {
      root.classList.remove("light", "dark");
      root.classList.add(mode);
      root.setAttribute("data-theme", mode);
    };

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mq.matches ? "dark" : "light");

      const handler = (e: MediaQueryListEvent) =>
        applyTheme(e.matches ? "dark" : "light");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      applyTheme(theme);
    }
  }, [theme]);

  const resolvedTheme = (): "light" | "dark" => {
    if (theme !== "system") return theme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  return {
    theme,
    resolvedTheme: resolvedTheme(),
    setTheme: (t: ThemeMode) => setTheme(t),
    toggleTheme,
    isDark: resolvedTheme() === "dark",
    isLight: resolvedTheme() === "light",
  };
}
