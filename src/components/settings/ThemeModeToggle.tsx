"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";

const themeOptions = [
  { value: "light", label: "Hell", icon: Sun },
  { value: "dark", label: "Dunkel", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeModeToggle() {
  const { theme, isHydrated, setTheme } = useTheme();

  return (
    <div className="theme-mode-grid" aria-label="Design-Modus auswählen">
      {themeOptions.map((option) => {
        const Icon = option.icon;
        const active = theme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            aria-pressed={active}
            data-active={active}
            disabled={!isHydrated}
            className={cn("theme-mode-option", !isHydrated && "cursor-wait opacity-70")}
          >
            <Icon size={17} strokeWidth={2.35} className="theme-mode-option-icon" />
            <span className="theme-mode-option-label">{option.label}</span>
            <span
              className={cn(
                "theme-mode-option-check",
                active ? "scale-100 opacity-100" : "scale-75 opacity-0"
              )}
              aria-hidden="true"
            >
              <Check size={12} strokeWidth={3} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
