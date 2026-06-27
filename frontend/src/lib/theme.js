// Global app chrome theme (light/dark). Persisted; toggles `dark` class on <html>.
import { createContext, useContext, useEffect, useState, useCallback } from "react";

const ThemeCtx = createContext(null);
const KEY = "vibedeck_theme";

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(KEY) || "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (mode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  const toggle = useCallback(() => setMode((m) => (m === "dark" ? "light" : "dark")), []);

  return <ThemeCtx.Provider value={{ mode, setMode, toggle }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx) || { mode: "light", setMode: () => {}, toggle: () => {} };
}
