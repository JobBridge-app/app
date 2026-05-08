"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import {
    normalizeMobileNavPreference,
    type MobileNavPreference,
} from "@/lib/mobile-nav-preference";

type MobileNavPreferenceControlProps = {
    initialPreference: MobileNavPreference;
};

const options: Array<{
    value: MobileNavPreference;
    title: string;
    status: string;
}> = [
    {
        value: "top",
        title: "Tabs oben",
        status: "Standard",
    },
    {
        value: "bottom",
        title: "Dock unten",
        status: "Daumenfreundlich",
    },
];

export function MobileNavPreferenceControl({ initialPreference }: MobileNavPreferenceControlProps) {
    const router = useRouter();
    const [preference, setPreference] = useState(initialPreference);
    const [error, setError] = useState<string | null>(null);
    const [pendingPreference, setPendingPreference] = useState<MobileNavPreference | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        setPreference(initialPreference);
    }, [initialPreference]);

    const syncPreference = async (nextPreference: MobileNavPreference) => {
        if (nextPreference === preference || pendingPreference) return;

        const previousPreference = preference;
        setError(null);
        setPendingPreference(nextPreference);
        setPreference(nextPreference);
        window.dispatchEvent(new CustomEvent("jobbridge:mobile-nav-preference", {
            detail: { preference: nextPreference },
        }));

        const { data: { user } } = await supabaseBrowser.auth.getUser();
        if (!user) {
            setPreference(previousPreference);
            setPendingPreference(null);
            setError("Bitte melde dich erneut an.");
            window.dispatchEvent(new CustomEvent("jobbridge:mobile-nav-preference", {
                detail: { preference: previousPreference },
            }));
            return;
        }

        const { error: updateError } = await supabaseBrowser
            .from("profiles")
            .update({ mobile_nav_preference: nextPreference })
            .eq("id", user.id);

        if (updateError) {
            setPreference(previousPreference);
            setError("Die Auswahl konnte nicht gespeichert werden.");
            window.dispatchEvent(new CustomEvent("jobbridge:mobile-nav-preference", {
                detail: { preference: previousPreference },
            }));
        } else {
            startTransition(() => router.refresh());
        }

        setPendingPreference(null);
    };

    return (
        <div className="space-y-2">
            {options.map((option) => {
                const active = preference === option.value;
                const saving = pendingPreference === option.value || (isPending && active);

                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => syncPreference(option.value)}
                        disabled={Boolean(pendingPreference)}
                        aria-pressed={active}
                        className={cn(
                            "group grid w-full grid-cols-[4.6rem_minmax(0,1fr)_1.7rem] items-center gap-3 rounded-[1.05rem] border p-2.5 text-left outline-none transition-[border-color,background-color,box-shadow]",
                            "focus-visible:ring-2 focus-visible:ring-indigo-200/35 disabled:cursor-not-allowed disabled:opacity-70",
                            active
                                ? "border-indigo-200/28 bg-indigo-400/[0.075] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
                                : "border-white/[0.075] bg-white/[0.022] hover:border-white/[0.13] hover:bg-white/[0.04]"
                        )}
                    >
                        <NavigationPreview preference={option.value} active={active} />

                        <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-white">{option.title}</span>
                            <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">{option.status}</span>
                        </span>

                        <span className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                            active
                                ? "border-white bg-white text-slate-950"
                                : "border-white/[0.08] bg-white/[0.025] text-transparent group-hover:text-slate-600"
                        )}>
                            {saving ? (
                                <Loader2 size={13} className="animate-spin text-slate-950" />
                            ) : (
                                <Check size={13} strokeWidth={3} />
                            )}
                        </span>
                    </button>
                );
            })}

            {error && (
                <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-medium text-rose-200">
                    {error}
                </p>
            )}
        </div>
    );
}

function NavigationPreview({ preference, active }: { preference: MobileNavPreference; active: boolean }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                "relative h-12 overflow-hidden rounded-xl border bg-[#060812]",
                active ? "border-indigo-200/22" : "border-white/[0.07]"
            )}
        >
            <span className="absolute left-2 right-2 top-2 h-1 rounded-full bg-white/[0.09]" />
            <span className="absolute left-2 top-5 h-4 w-7 rounded-md border border-white/[0.06] bg-white/[0.035]" />
            <span className="absolute right-2 top-5 h-4 w-7 rounded-md border border-white/[0.06] bg-white/[0.035]" />

            {preference === "top" ? (
                <span className="absolute left-1/2 top-1.5 flex h-4 w-11 -translate-x-1/2 items-center gap-0.5 rounded-full border border-white/[0.08] bg-slate-950/88 p-0.5">
                    <span className="h-full flex-1 rounded-full bg-indigo-300/80" />
                    <span className="h-full flex-1 rounded-full bg-white/[0.11]" />
                    <span className="h-full flex-1 rounded-full bg-white/[0.11]" />
                </span>
            ) : (
                <>
                    <span className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-slate-950 to-transparent" />
                    <span className="absolute bottom-1.5 left-1/2 flex h-4 w-12 -translate-x-1/2 items-center gap-0.5 rounded-full border border-white/[0.08] bg-slate-950/92 p-0.5">
                        <span className="h-full flex-1 rounded-full bg-indigo-300/80" />
                        <span className="h-full flex-1 rounded-full bg-white/[0.11]" />
                        <span className="h-full flex-1 rounded-full bg-white/[0.11]" />
                    </span>
                </>
            )}
        </span>
    );
}
