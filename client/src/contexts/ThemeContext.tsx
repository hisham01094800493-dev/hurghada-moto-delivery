import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";

export function getNextTheme(theme: Theme): Theme {
  return theme === "light" ? "dark" : "light";
}

export function resolveInitialTheme(storedTheme: string | null, systemPrefersDark: boolean, defaultTheme: Theme = "light"): Theme {
  if (storedTheme === "light" || storedTheme === "dark") return storedTheme;
  return systemPrefersDark ? "dark" : defaultTheme;
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [hasUserChoice, setHasUserChoice] = useState(() => {
    if (!switchable || typeof window === "undefined") return false;
    const stored = window.localStorage.getItem("theme");
    return stored === "light" || stored === "dark";
  });
  const [theme, setTheme] = useState<Theme>(() => {
    if (!switchable || typeof window === "undefined") return defaultTheme;
    const stored = window.localStorage.getItem("theme");
    return resolveInitialTheme(stored, Boolean(window.matchMedia?.("(prefers-color-scheme: dark)")?.matches), defaultTheme);
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    if (switchable && hasUserChoice) {
      window.localStorage.setItem("theme", theme);
    }
  }, [theme, switchable, hasUserChoice]);

  const toggleTheme = switchable
    ? () => {
        document.documentElement.classList.add("theme-transition");
        window.setTimeout(() => document.documentElement.classList.remove("theme-transition"), 320);
        setHasUserChoice(true);
        setTheme(getNextTheme);
      }
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
