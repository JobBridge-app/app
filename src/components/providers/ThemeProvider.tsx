"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: Theme;
    enableSystem?: boolean;
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

function getResolvedTheme(theme: Theme, enableSystem: boolean): ResolvedTheme {
    if (theme !== "system" || !enableSystem) {
        return theme === "light" ? "light" : "dark";
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({
    children,
    defaultTheme = "dark",
    enableSystem = true,
}: ThemeProviderProps) {
    const systemTheme = enableSystem ? "system" : defaultTheme;
    const [theme, setThemeState] = useState<Theme>(systemTheme);
    const [isMounted, setIsMounted] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

    useEffect(() => {
        const immediateTheme = enableSystem ? "system" : defaultTheme;
        setThemeState(immediateTheme);
        setResolvedTheme(getResolvedTheme(immediateTheme, enableSystem));
        setIsMounted(true);
        setIsHydrated(true);
    }, [defaultTheme, enableSystem]);

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

    const value = useMemo<ThemeProviderState>(() => ({
        theme,
        resolvedTheme,
        isHydrated,
        setTheme: () => {
            const nextTheme = enableSystem ? "system" : defaultTheme;
            setThemeState(nextTheme);
        },
    }), [defaultTheme, enableSystem, isHydrated, resolvedTheme, theme]);

    return (
        <ThemeProviderContext.Provider value={value}>
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
