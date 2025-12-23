"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { Bell, Mail, Smartphone, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotificationSettingsPage() {
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const router = useRouter();

    // Mock state for now as 'notification_preferences' table might not exist or be structured differently.
    // Ideally we fetch this from profile or a separate table.
    const [prefs, setPrefs] = useState({
        email_jobs: true,
        email_security: true,
        push_messages: false
    });

    const handleSave = async () => {
        setLoading(true);
        // Simulate DB call or make real one if table exists
        // await supabaseBrowser.from('profiles').update({...})...
        await new Promise(r => setTimeout(r, 800));

        setSaved(true);
        setLoading(false);
        setTimeout(() => {
            router.back();
        }, 1000); // Auto return after save
    };

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 max-w-2xl">
            <Link href="/app-home/settings" className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft size={16} />
                <span>Zurück</span>
            </Link>

            <h1 className="text-2xl font-bold text-white mb-2">Benachrichtigungen</h1>
            <p className="text-slate-400 mb-8">Steuere, wie und worüber wir dich informieren.</p>

            <div className="space-y-6">
                <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Mail size={18} className="text-indigo-400" />
                        Email Benachrichtigungen
                    </h3>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-200 font-medium">Neue Jobangebote</p>
                                <p className="text-slate-500 text-xs">Wenn neue Jobs in deiner Region erscheinen.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={prefs.email_jobs} onChange={e => setPrefs({ ...prefs, email_jobs: e.target.checked })} className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-200 font-medium">Sicherheitsupdates</p>
                                <p className="text-slate-500 text-xs">Login-Warnungen und Passwortänderungen.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={prefs.email_security} onChange={e => setPrefs({ ...prefs, email_security: e.target.checked })} className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Smartphone size={18} className="text-emerald-400" />
                        Push Benachrichtigungen
                    </h3>
                    <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <p className="text-emerald-200 text-sm">
                            Push-Benachrichtigungen werden über die Systemeinstellungen deines Geräts verwaltet.
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading || saved}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all flex items-center justify-center gap-2"
                >
                    {saved ? <><CheckCircle2 size={20} /> Gespeichert</> : (loading ? "Speichert..." : "Änderungen speichern")}
                </button>
            </div>
        </div>
    );
}
