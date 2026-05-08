"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";

const themeOptions = [
  { value: "dark", label: "Dunkel", icon: Moon },
  { value: "light", label: "Hell", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeModeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid grid-cols-3 gap-1 rounded-[1.15rem] border border-white/10 bg-slate-950/72 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      {themeOptions.map((option) => {
        const Icon = option.icon;
        const active = theme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            aria-pressed={active}
            className={cn(
              "flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-[0.9rem] px-2 text-[13px] font-semibold outline-none transition-[background-color,color,box-shadow] sm:gap-2 sm:px-3 sm:text-sm",
              "focus-visible:ring-2 focus-visible:ring-indigo-200/35",
              active
                ? "bg-white text-slate-950 shadow-[0_12px_32px_rgba(255,255,255,0.12)]"
                : "text-slate-500 hover:bg-white/[0.055] hover:text-slate-200"
            )}
          >
            <Icon size={15} strokeWidth={2.3} className="shrink-0 sm:h-4 sm:w-4" />
            <span className="whitespace-nowrap">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
