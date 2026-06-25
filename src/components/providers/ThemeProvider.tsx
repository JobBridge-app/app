"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { normalizeThemePreference, type ThemePreference } from "@/lib/theme-preference";

type ResolvedTheme = "dark" | "light";

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: ThemePreference;
    enableSystem?: boolean;
};

type ThemeProviderState = {
    theme: ThemePreference;
    resolvedTheme: ResolvedTheme;
    isHydrated: boolean;
    setTheme: (theme: ThemePreference) => void;
};

const initialState: ThemeProviderState = {
    theme: "system",
    resolvedTheme: "dark",
    isHydrated: false,
    setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function getResolvedTheme(theme: ThemePreference, enableSystem: boolean): ResolvedTheme {
    if (theme !== "system" || !enableSystem) {
        return theme === "light" ? "light" : "dark";
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function addMediaQueryListener(mediaQuery: MediaQueryList, listener: () => void) {
    if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", listener);
        return () => mediaQuery.removeEventListener("change", listener);
    }

    const legacyMediaQuery = mediaQuery as MediaQueryList & {
        addListener?: (listener: () => void) => void;
        removeListener?: (listener: () => void) => void;
    };

    legacyMediaQuery.addListener?.(listener);
    return () => legacyMediaQuery.removeListener?.(listener);
}

export function ThemeProvider({
    children,
    defaultTheme = "system",
    enableSystem = true,
}: ThemeProviderProps) {
    const normalizedDefaultTheme = normalizeThemePreference(defaultTheme);
    const initialTheme = enableSystem ? normalizedDefaultTheme : normalizedDefaultTheme === "system" ? "dark" : normalizedDefaultTheme;
    const [theme, setThemeState] = useState<ThemePreference>(initialTheme);
    const [isMounted, setIsMounted] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

    useEffect(() => {
        const nextDefaultTheme = normalizeThemePreference(defaultTheme);
        const immediateTheme = enableSystem ? nextDefaultTheme : nextDefaultTheme === "system" ? "dark" : nextDefaultTheme;
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

        return addMediaQueryListener(mediaQuery, applyTheme);
    }, [theme, isMounted, enableSystem]);

    const setTheme = useCallback((nextThemePreference: ThemePreference) => {
        const normalizedNextTheme = normalizeThemePreference(nextThemePreference);
        const nextTheme = enableSystem ? normalizedNextTheme : normalizedNextTheme === "system" ? "dark" : normalizedNextTheme;
        setThemeState(nextTheme);
    }, [enableSystem]);

    const value = useMemo<ThemeProviderState>(() => ({
        theme,
        resolvedTheme,
        isHydrated,
        setTheme,
    }), [isHydrated, resolvedTheme, setTheme, theme]);

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
