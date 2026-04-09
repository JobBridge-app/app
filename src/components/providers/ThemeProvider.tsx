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

            const stored = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
            if (isTheme(stored)) {
                if (!cancelled) {
                    setThemeState(stored);
                    setIsHydrated(true);
                }
                return;
            }

            try {
                const supabase = supabaseBrowser;
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    if (!cancelled) {
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
    }, [theme, isMounted, enableSystem]);

    useEffect(() => {
        if (!isHydrated) return;

        localStorage.setItem(storageKey, theme);

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
