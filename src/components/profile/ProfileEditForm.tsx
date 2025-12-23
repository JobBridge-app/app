"use client";

import { Profile } from "@/lib/types";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Save, Loader2 } from "lucide-react";

export function ProfileEditForm({ profile }: { profile: Profile }) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsLoading(true);

        const formData = new FormData(event.currentTarget);
        const updates = {
            full_name: formData.get("full_name") as string,
            city: formData.get("city") as string,
            // Bio would go here if schema had it. For now updating confirmed columns.
        };

        const { error } = await supabaseBrowser
            .from("profiles")
            .update(updates)
            .eq("id", profile.id);

        if (error) {
            alert("Fehler beim Speichern!"); // Simple feedback for now
        } else {
            router.refresh(); // Refresh server component
        }
        setIsLoading(false);
    }

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
                <h3 className="text-lg font-semibold text-white mb-6">Öffentliches Profil bearbeiten</h3>

                <div className="grid gap-6">
                    <div className="space-y-2">
                        <label htmlFor="full_name" className="text-sm font-medium text-slate-300">Anzeigename</label>
                        <input
                            type="text"
                            name="full_name"
                            id="full_name"
                            defaultValue={profile.full_name || ""}
                            className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder:text-slate-600"
                            placeholder="Dein Name"
                        />
                        <p className="text-xs text-slate-500">Dieser Name wird anderen Nutzern angezeigt.</p>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="city" className="text-sm font-medium text-slate-300">Stadt / Ort</label>
                        <div className="relative">
                            <input
                                type="text"
                                name="city"
                                id="city"
                                readOnly
                                defaultValue={profile.city || "Rheinbach"}
                                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 cursor-not-allowed focus:outline-none"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-500/80 font-medium px-2 py-0.5 rounded border border-amber-500/20 bg-amber-500/10">
                                Fixiert: Rheinbach
                            </div>
                        </div>
                    </div>

                    {/* Bio Field Placeholder - Schema update needed for persistence */}
                    <div className="space-y-2 opacity-50 pointer-events-none">
                        <label htmlFor="bio" className="text-sm font-medium text-slate-300">Über mich (Bio)</label>
                        <textarea
                            name="bio"
                            id="bio"
                            rows={4}
                            className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder:text-slate-600 resize-none"
                            placeholder="Erzähle etwas über dich..."
                            defaultValue=""
                        />
                        <p className="text-xs text-slate-500">Coming soon in DB Schema update.</p>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Speichern
                    </button>
                </div>
            </div>
        </form>
    );
}
