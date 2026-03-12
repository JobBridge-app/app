"use client";

import { useTheme } from "@/components/providers/ThemeProvider";

export function ThemeModeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center p-1 bg-black/40 rounded-lg border border-white/5">
      <button
        onClick={() => setTheme("dark")}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${theme === "dark" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
      >
        Dark
      </button>
      <button
        onClick={() => setTheme("light")}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${theme === "light" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
      >
        Light
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${theme === "system" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
      >
        System
      </button>
    </div>
  );
}
