"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAppNavigation } from "@/components/layout/AppNavigationProvider";

export default function AppHomeError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const pathname = usePathname() || "/app-home";
    const { pendingHref, completeNavigation } = useAppNavigation();
    const recoveryHrefRef = useRef(pendingHref || pathname);

    useEffect(() => {
        completeNavigation(recoveryHrefRef.current);
        console.error("App page failed to load", error);
    }, [completeNavigation, error]);

    return (
        <div className="container mx-auto px-4 py-10 md:px-6" role="alert">
            <div className="mx-auto max-w-xl rounded-3xl border border-slate-200/80 bg-white/90 p-6 text-slate-950 shadow-sm dark:border-white/10 dark:bg-slate-950/80 dark:text-white">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Seite konnte nicht geladen werden
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Deine Auswahl bleibt erhalten. Versuche es bitte noch einmal.
                </p>
                <button
                    type="button"
                    onClick={reset}
                    className="mt-5 min-h-11 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                    Erneut versuchen
                </button>
            </div>
        </div>
    );
}
