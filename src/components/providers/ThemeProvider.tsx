"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
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

function isTheme(value: string | null | undefined): value is Theme {
    return value === "light" || value === "dark" || value === "system";
}

function persistTheme(storageKey: string, theme: Theme) {
    try {
        localStorage.setItem(storageKey, theme);
    } catch {
        // Storage can be unavailable in hardened browser contexts.
    }
}

export function ThemeProvider({
    children,
    defaultTheme = "system",
    enableSystem = true,
    storageKey = "vite-ui-theme",
    ...props
}: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>(defaultTheme);
    const [isMounted, setIsMounted] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const skipNextSyncRef = useRef(true);

    useEffect(() => {
        let cancelled = false;

        const hydrateTheme = async () => {
            setIsMounted(true);

            try {
                const supabase = supabaseBrowser;
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    if (!cancelled) {
                        persistTheme(storageKey, defaultTheme);
                        setThemeState(defaultTheme);
                        setIsHydrated(true);
                    }
                    return;
                }

                const { data: profile } = await supabase
                    .from("profiles")
                    .select("theme_preference")
                    .eq("id", user.id)
                    .maybeSingle();

                const dbTheme = profile?.theme_preference;

                if (!cancelled) {
                    setThemeState(isTheme(dbTheme) ? dbTheme : defaultTheme);
                    setIsHydrated(true);
                }
            } catch {
                if (!cancelled) {
                    persistTheme(storageKey, defaultTheme);
                    setThemeState(defaultTheme);
                    setIsHydrated(true);
                }
            }
        };

        hydrateTheme();

        return () => {
            cancelled = true;
        };
    }, [defaultTheme, storageKey]);

    useEffect(() => {
        if (!isMounted) return;

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const applyTheme = () => {
            const root = window.document.documentElement;
            root.classList.remove("light", "dark");

            if (theme === "system" && enableSystem) {
                root.classList.add(mediaQuery.matches ? "dark" : "light");
            } else {
                root.classList.add(theme);
            }
        };

        applyTheme();

        if (theme !== "system" || !enableSystem) return;

        mediaQuery.addEventListener("change", applyTheme);
        return () => mediaQuery.removeEventListener("change", applyTheme);
    }, [theme, isMounted, enableSystem]);

    useEffect(() => {
        if (!isHydrated) return;

        persistTheme(storageKey, theme);

        if (skipNextSyncRef.current) {
            skipNextSyncRef.current = false;
            return;
        }

        const syncTheme = async () => {
            const supabase = supabaseBrowser;
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from("profiles").update({ theme_preference: theme }).eq("id", user.id);
            }
        };

        const timeoutId = setTimeout(() => {
            syncTheme();
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [theme, isHydrated, storageKey]);

    const value = {
        theme,
        setTheme: (theme: Theme) => {
            setThemeState(theme);
        },
    };

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
