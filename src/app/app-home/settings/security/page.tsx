"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { Shield, Key, History, ArrowLeft, Laptop, Smartphone } from "lucide-react";
import Link from "next/link";
import { SecurityEvent } from "@/lib/types";

export default function SecuritySettingsPage() {
    const [events, setEvents] = useState<SecurityEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        const { data: { user } } = await supabaseBrowser.auth.getUser();
        if (user) {
            const { data } = await supabaseBrowser
                .from("security_events")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(5);
            if (data) setEvents(data);
        }
        setLoading(false);
    };

    const handlePasswordReset = async () => {
        const { data: { user } } = await supabaseBrowser.auth.getUser();
        if (user?.email) {
            await supabaseBrowser.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/auth/update-password`,
            });
            alert("Email zum Zurücksetzen gesendet!");
        }
    };

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 max-w-2xl">
            <Link href="/app-home/settings" className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft size={16} />
                <span>Zurück</span>
            </Link>

            <h1 className="text-2xl font-bold text-white mb-2">Sicherheit</h1>
            <p className="text-slate-400 mb-8">Schütze deinen Account.</p>

            <div className="space-y-6">
                {/* Login History */}
                <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <History size={18} className="text-blue-400" />
                        Login Historie
                    </h3>
                    <div className="space-y-3">
                        {loading ? (
                            <p className="text-slate-500 text-sm">Lädt...</p>
                        ) : events.length === 0 ? (
                            <p className="text-slate-500 text-sm">Keine Einträge gefunden.</p>
                        ) : (
                            events.map(event => (
                                <div key={event.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/5 rounded-lg text-slate-400">
                                            {event.user_agent?.includes("Mobile") ? <Smartphone size={16} /> : <Laptop size={16} />}
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-200 font-medium capitalize">{event.event_type.replace(/_/g, " ")}</p>
                                            <p className="text-xs text-slate-500">{new Date(event.created_at).toLocaleString('de-DE')}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-500 font-mono">{event.ip_address || "IP Hidden"}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Password Management */}
                <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Key size={18} className="text-amber-400" />
                        Passwort ändern
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                        Wenn du denkst, dass dein Account gefährdet ist, ändere sofort dein Passwort.
                    </p>
                    <button
                        onClick={handlePasswordReset}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm font-medium transition-colors"
                    >
                        Passwort zurücksetzen (Email senden)
                    </button>
                </div>
            </div>
        </div>
    );
}
