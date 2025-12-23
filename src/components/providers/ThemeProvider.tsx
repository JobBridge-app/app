"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: Theme;
    enableSystem?: boolean;
    storageKey?: string;
};

type ThemeProviderState = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
    theme: "system",
    setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
    children,
    defaultTheme = "system",
    enableSystem = true,
    storageKey = "vite-ui-theme",
    ...props
}: ThemeProviderProps) {
    // 1. Initialize state lazily to avoid heavy work in render
    // However, for hydration mismatch prevention, we must start with a known state or 'undefined'
    // but that causes layout shifts.
    // The best Next.js pattern is to render the script in Head (next-themes does this).
    // Here we are rolling our own. We will start with "dark" (safe default) or whatever defaultTheme is passed.
    // To properly support system, we need to check window.matchMedia on client.

    // Simplest hydration fix: Use stored value if available, else default.
    // BUT we wrap in useEffect to only access localStorage on client.

    const [theme, setThemeState] = useState<Theme>(defaultTheme);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const stored = typeof window !== 'undefined' ? localStorage.getItem(storageKey) as Theme : null;
        if (stored) setThemeState(stored);
    }, [storageKey]);

    useEffect(() => {
        if (!isMounted) return;

        const root = window.document.documentElement;
        root.classList.remove("light", "dark");

        if (theme === "system" && enableSystem) {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";
            root.classList.add(systemTheme);
        } else {
            root.classList.add(theme);
        }

        localStorage.setItem(storageKey, theme);
    }, [theme, isMounted, storageKey]);

    // DB Syncer
    useEffect(() => {
        if (!isMounted) return;

        const syncTheme = async () => {
            const supabase = supabaseBrowser;
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Save preference if changed. We map 'system' to 'system' in DB too (if allowed) or resolve it.
                // The DB type allows: "light" | "dark" | "system"
                await supabase.from("profiles").update({ theme_preference: theme }).eq("id", user.id);
            }
        };

        // Debounce sync to avoid spamming DB on rapid toggles
        const timeoutId = setTimeout(() => {
            syncTheme();
        }, 2000);

        return () => clearTimeout(timeoutId);
    }, [theme, isMounted]);

    const value = {
        theme,
        setTheme: (theme: Theme) => {
            setThemeState(theme);
        },
    };

    // Prevent hydration mismatch if we want, OR just render.
    // Rending children immediately is usually better for UX even if theme flicks slightly.
    // But since we defaulted to 'system' or 'dark' and layout is dark by default, it's fine.

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider");

    return context;
};

