"use client";

import { useMemo, useState } from "react";
import { Profile } from "@/lib/types";
import { BRAND_EMAIL } from "@/lib/constants";
import { LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabaseBrowser } from "@/lib/supabaseClient";

type ProfileEditFormProps = {
    profile: Profile;
    className?: string;
};

export function ProfileEditForm({ profile, className }: ProfileEditFormProps) {
    const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || BRAND_EMAIL;
    const supportMailto = `mailto:${contactEmail}?subject=${encodeURIComponent("Profilkorrektur: Name oder Stadt/Ort")}`;

    const [bio, setBio] = useState(profile.bio?.trim() || "");
    const [interests, setInterests] = useState(profile.interests?.trim() || "");
    const [skills, setSkills] = useState((profile.skills ?? "").trim());
    const [availabilityNote, setAvailabilityNote] = useState((profile.availability_note ?? "").trim());
    const [saving, setSaving] = useState(false);
    const [saveState, setSaveState] = useState<null | { type: "ok" | "error"; message: string }>(null);

    const savePayload = useMemo(() => {
        const toNull = (v: string) => {
            const t = v.trim();
            return t.length > 0 ? t : null;
        };
        return {
            bio: toNull(bio),
            interests: toNull(interests),
            skills: toNull(skills),
            availability_note: toNull(availabilityNote),
        };
    }, [bio, interests, skills, availabilityNote]);

    const onSave = async () => {
        setSaving(true);
        setSaveState(null);
        try {
            const { error } = await supabaseBrowser
                .from("profiles")
                .update(savePayload)
                .eq("id", profile.id);

            if (error) throw error;
            setSaveState({ type: "ok", message: "Gespeichert." });
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
            setSaveState({ type: "error", message: msg });
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className={cn("flex h-full flex-col rounded-2xl border border-white/10 bg-[#121217] p-6 shadow-xl md:p-8", className)}>
            <div className="mb-5">
                <h2 className="text-xl font-semibold text-white">Profil bearbeiten</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Name</label>
                    <input
                        readOnly
                        value={profile.full_name ?? "Nicht hinterlegt"}
                        className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-slate-200 outline-none"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Stadt / Ort</label>
                    <input
                        readOnly
                        value={profile.city ?? "Nicht hinterlegt"}
                        className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-slate-200 outline-none"
                    />
                </div>
            </div>

            <p className="mt-3 inline-flex items-center gap-2 text-xs text-slate-400">
                <LockKeyhole size={13} />
                Name und Stadt/Ort sind fixiert.
                <a href={supportMailto} className="text-blue-300 underline underline-offset-4 hover:text-blue-200">
                    Support kontaktieren
                </a>
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5 space-y-4">
                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Über mich</label>
                    <textarea
                        rows={5}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Was sollte man über dich wissen?"
                        className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-slate-200 outline-none placeholder:text-slate-500 focus:border-white/20"
                    />
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Interessen</label>
                    <input
                        value={interests}
                        onChange={(e) => setInterests(e.target.value)}
                        placeholder="z.B. Nachhilfe, Garten, Hunde..."
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-slate-200 outline-none placeholder:text-slate-500 focus:border-white/20"
                    />
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Skills</label>
                    <input
                        value={skills}
                        onChange={(e) => setSkills(e.target.value)}
                        placeholder="z.B. Babysitting, Mathe (8. Klasse), Rasenmaehen..."
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-slate-200 outline-none placeholder:text-slate-500 focus:border-white/20"
                    />
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Verfuegbarkeit</label>
                    <input
                        value={availabilityNote}
                        onChange={(e) => setAvailabilityNote(e.target.value)}
                        placeholder="z.B. Mo-Fr ab 16 Uhr, Sa vormittags"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-slate-200 outline-none placeholder:text-slate-500 focus:border-white/20"
                    />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={saving}
                        className={cn(
                            "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                            "bg-indigo-500/90 text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        )}
                    >
                        {saving ? "Speichern..." : "Speichern"}
                    </button>
                    {saveState && (
                        <div
                            className={cn(
                                "text-xs rounded-lg px-3 py-2 border",
                                saveState.type === "ok"
                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                                    : "border-rose-500/20 bg-rose-500/10 text-rose-200"
                            )}
                        >
                            {saveState.message}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
