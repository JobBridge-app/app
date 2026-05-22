"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

type Theme = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: Theme;
    enableSystem?: boolean;
    storageKey?: string;
};

type ThemeProviderState = {
    theme: Theme;
    resolvedTheme: ResolvedTheme;
    isHydrated: boolean;
    setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
    theme: "system",
    resolvedTheme: "dark",
    isHydrated: false,
    setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function isTheme(value: string | null | undefined): value is Theme {
    return value === "light" || value === "dark" || value === "system";
}

function readStoredTheme(storageKey: string): Theme | null {
    try {
        const storedTheme = localStorage.getItem(storageKey);
        return isTheme(storedTheme) ? storedTheme : null;
    } catch {
        return null;
    }
}

function persistTheme(storageKey: string, theme: Theme) {
    try {
        localStorage.setItem(storageKey, theme);
    } catch {
        // Storage can be unavailable in hardened browser contexts.
    }
}

function getResolvedTheme(theme: Theme, enableSystem: boolean): ResolvedTheme {
    if (theme !== "system" || !enableSystem) {
        return theme === "light" ? "light" : "dark";
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
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
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");
    const skipNextSyncRef = useRef(true);

    useEffect(() => {
        let cancelled = false;

        const hydrateTheme = async () => {
            const storedTheme = readStoredTheme(storageKey);
            const immediateTheme = storedTheme ?? defaultTheme;
            setThemeState(immediateTheme);
            setResolvedTheme(getResolvedTheme(immediateTheme, enableSystem));
            setIsMounted(true);

            try {
                const supabase = supabaseBrowser;
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    if (!cancelled) {
                        persistTheme(storageKey, immediateTheme);
                        setThemeState(immediateTheme);
                        setResolvedTheme(getResolvedTheme(immediateTheme, enableSystem));
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
                    const nextTheme = isTheme(dbTheme) ? dbTheme : immediateTheme;
                    persistTheme(storageKey, nextTheme);
                    setThemeState(nextTheme);
                    setResolvedTheme(getResolvedTheme(nextTheme, enableSystem));
                    setIsHydrated(true);
                }
            } catch {
                if (!cancelled) {
                    persistTheme(storageKey, immediateTheme);
                    setThemeState(immediateTheme);
                    setResolvedTheme(getResolvedTheme(immediateTheme, enableSystem));
                    setIsHydrated(true);
                }
            }
        };

        hydrateTheme();

        return () => {
            cancelled = true;
        };
    }, [defaultTheme, enableSystem, storageKey]);

    useEffect(() => {
        if (!isMounted) return;

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const applyTheme = () => {
            const root = window.document.documentElement;
            const nextResolvedTheme = getResolvedTheme(theme, enableSystem);

            root.classList.remove("light", "dark");
            root.classList.add(nextResolvedTheme);
            root.dataset.themePreference = theme;
            root.dataset.themeResolved = nextResolvedTheme;
            root.style.colorScheme = nextResolvedTheme;
            setResolvedTheme(nextResolvedTheme);

        };

        applyTheme();

        if (theme !== "system" || !enableSystem) return;

        mediaQuery.addEventListener("change", applyTheme);
        return () => mediaQuery.removeEventListener("change", applyTheme);
    }, [theme, isMounted, enableSystem]);

    useEffect(() => {
        if (!isHydrated) return;

        persistTheme(storageKey, theme);
        setResolvedTheme(getResolvedTheme(theme, enableSystem));

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
    }, [theme, enableSystem, isHydrated, storageKey]);

    const value = useMemo<ThemeProviderState>(() => ({
        theme,
        resolvedTheme,
        isHydrated,
        setTheme: (theme: Theme) => {
            setThemeState(theme);
        },
    }), [isHydrated, resolvedTheme, theme]);

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
