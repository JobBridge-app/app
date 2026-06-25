"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Monitor, Moon, Sun } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { normalizeThemePreference, type ThemePreference } from "@/lib/theme-preference";
import { useTheme } from "@/components/providers/ThemeProvider";

type ThemePreferenceControlProps = {
    initialPreference: ThemePreference;
};

const options: Array<{
    value: ThemePreference;
    label: string;
    icon: typeof Monitor;
}> = [
    {
        value: "system",
        label: "System",
        icon: Monitor,
    },
    {
        value: "light",
        label: "Hell",
        icon: Sun,
    },
    {
        value: "dark",
        label: "Dunkel",
        icon: Moon,
    },
];

export function ThemePreferenceControl({ initialPreference }: ThemePreferenceControlProps) {
    const router = useRouter();
    const { setTheme } = useTheme();
    const [preference, setPreference] = useState(() => normalizeThemePreference(initialPreference));
    const [pendingPreference, setPendingPreference] = useState<ThemePreference | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        const nextPreference = normalizeThemePreference(initialPreference);
        setPreference(nextPreference);
        setTheme(nextPreference);
    }, [initialPreference, setTheme]);

    const syncPreference = async (nextPreference: ThemePreference) => {
        if (nextPreference === preference || pendingPreference) return;

        const previousPreference = preference;
        setError(null);
        setPendingPreference(nextPreference);
        setPreference(nextPreference);
        setTheme(nextPreference);

        const { data: { user } } = await supabaseBrowser.auth.getUser();
        if (!user) {
            setPreference(previousPreference);
            setTheme(previousPreference);
            setPendingPreference(null);
            setError("Bitte melde dich erneut an.");
            return;
        }

        const { error: updateError } = await supabaseBrowser
            .from("profiles")
            .update({ theme_preference: nextPreference })
            .eq("id", user.id);

        if (updateError) {
            setPreference(previousPreference);
            setTheme(previousPreference);
            setError("Die Auswahl konnte nicht gespeichert werden.");
        } else {
            startTransition(() => router.refresh());
        }

        setPendingPreference(null);
    };

    return (
        <div className="space-y-2">
            <div className="theme-mode-grid">
                {options.map((option) => {
                    const active = preference === option.value;
                    const saving = pendingPreference === option.value || (isPending && active);
                    const Icon = option.icon;

                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => syncPreference(option.value)}
                            disabled={Boolean(pendingPreference)}
                            aria-pressed={active}
                            data-active={active}
                            className="theme-mode-option disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            <Icon size={15} aria-hidden="true" />
                            <span className="theme-mode-option-label">{option.label}</span>
                            {active && (
                                <span className="theme-mode-option-check">
                                    {saving ? (
                                        <Loader2 size={11} className="animate-spin" />
                                    ) : (
                                        <Check size={11} strokeWidth={3} />
                                    )}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {error && (
                <p className="mobile-nav-error rounded-xl border px-3 py-2 text-xs font-medium">
                    {error}
                </p>
            )}
        </div>
    );
}
