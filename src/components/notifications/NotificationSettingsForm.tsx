"use client";

import { useState } from "react";
import { ButtonPrimary } from "@/components/ui/ButtonPrimary";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";

export function NotificationSettingsForm({ initialPrefs, userId }: { initialPrefs: any, userId: string }) {
    const [prefs, setPrefs] = useState(initialPrefs);
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleToggle = (key: string) => {
        setPrefs((prev: any) => ({ ...prev, [key]: !prev[key] }));
        setSaved(false);
    };

    const handleSelect = (key: string, value: string) => {
        setPrefs((prev: any) => ({ ...prev, [key]: value }));
        setSaved(false);
    };

    const handleSave = async () => {
        setLoading(true);
        const { error } = await supabaseBrowser
            .from("notification_preferences")
            .upsert({ user_id: userId, ...prefs });

        setLoading(false);
        if (!error) {
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } else {
            alert("Fehler beim Speichern");
        }
    };

    return (
        <div className="space-y-8">
            {/* Global Email Toggle */}
            <div className="flex items-center justify-between pb-6 border-b border-white/5">
                <div>
                    <h3 className="text-lg font-medium text-white">Email Benachrichtigungen</h3>
                    <p className="text-sm text-slate-400">Generell Emails von JobBridge empfangen.</p>
                </div>
                <button
                    onClick={() => handleToggle('email_enabled')}
                    className={`w-12 h-6 rounded-full transition-colors relative ${prefs.email_enabled ? 'bg-blue-500' : 'bg-white/10'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${prefs.email_enabled ? 'left-7' : 'left-1'}`} />
                </button>
            </div>

            {/* Granular Settings */}
            <div className={`space-y-6 ${!prefs.email_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center justify-between">
                    <label className="text-slate-300">Bewerbungs-Updates</label>
                    <input
                        type="checkbox"
                        checked={prefs.email_application_updates}
                        onChange={() => handleToggle('email_application_updates')}
                        className="w-5 h-5 rounded border-white/10 bg-white/5 text-blue-500"
                    />
                </div>
                <div className="flex items-center justify-between">
                    <label className="text-slate-300">Nachrichten</label>
                    <input
                        type="checkbox"
                        checked={prefs.email_messages}
                        onChange={() => handleToggle('email_messages')}
                        className="w-5 h-5 rounded border-white/10 bg-white/5 text-blue-500"
                    />
                </div>
                <div className="flex items-center justify-between">
                    <label className="text-slate-300">Neue Jobs in meiner Nähe</label>
                    <input
                        type="checkbox"
                        checked={prefs.email_job_updates}
                        onChange={() => handleToggle('email_job_updates')}
                        className="w-5 h-5 rounded border-white/10 bg-white/5 text-blue-500"
                    />
                </div>
            </div>

            {/* Frequency */}
            <div className="pt-6 border-t border-white/5">
                <label className="block text-sm font-medium text-slate-300 mb-3">Häufigkeit</label>
                <div className="grid grid-cols-3 gap-3">
                    {['instant', 'daily', 'weekly'].map((opt) => (
                        <div
                            key={opt}
                            onClick={() => handleSelect('digest_frequency', opt)}
                            className={`cursor-pointer text-center py-2 rounded-lg border text-sm capitalize ${prefs.digest_frequency === opt ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                        >
                            {opt === 'instant' ? 'Sofort' : opt === 'daily' ? 'Täglich' : 'Wöchentlich'}
                        </div>
                    ))}
                </div>
            </div>

            <ButtonPrimary onClick={handleSave} disabled={loading} className="w-full">
                {loading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                {saved ? "Gespeichert!" : "Einstellungen speichern"}
            </ButtonPrimary>
        </div>
    );
}
