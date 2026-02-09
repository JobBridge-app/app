"use client";

import { Bell, Moon, Shield, ChevronRight, Laptop, Smartphone, User } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/components/providers/ThemeProvider";

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 max-w-4xl">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Einstellungen</h1>
            <p className="text-slate-400 mb-8">Verwalte deine App-Einstellungen, Benachrichtigungen und Sicherheit.</p>

            <div className="space-y-6">

                {/* 0. Profile Edit Shortcut */}
                <section className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
                    <Link href="/app-home/profile" className="block hover:bg-white/5 transition-colors">
                        <div className="px-6 py-6 flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">Profil bearbeiten</h2>
                                    <p className="text-sm text-slate-400">Persönliche Daten, Lebenslauf & Erziehungsberechtigte</p>
                                </div>
                            </div>
                            <ChevronRight className="text-slate-600 group-hover:text-white transition-colors" />
                        </div>
                    </Link>
                </section>
                {/* 1. App Settings (Theme) */}
                <section className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
                    <div className="px-6 py-4 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                <Laptop size={20} />
                            </div>
                            <h2 className="text-lg font-semibold text-white">App & Darstellung</h2>
                        </div>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-white font-medium">Design Modus</h3>
                                <p className="text-sm text-slate-400">Wähle deine bevorzugte Ansicht.</p>
                            </div>
                            <div className="flex items-center p-1 bg-black/40 rounded-lg border border-white/5">
                                <button
                                    onClick={() => setTheme("dark")}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${theme === 'dark' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Dark
                                </button>
                                <button
                                    onClick={() => setTheme("light")}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${theme === 'light' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Light
                                </button>
                                <button
                                    onClick={() => setTheme("system")}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${theme === 'system' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                >
                                    System
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. Notifications */}
                <section className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
                    <Link href="/app-home/settings/notifications" className="block hover:bg-white/5 transition-colors">
                        <div className="px-6 py-6 flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                                    <Bell size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors">Benachrichtigungen</h2>
                                    <p className="text-sm text-slate-400">Email & Push Einstellungen verwalten</p>
                                </div>
                            </div>
                            <ChevronRight className="text-slate-600 group-hover:text-white transition-colors" />
                        </div>
                    </Link>
                </section>

                {/* 3. Security */}
                <section className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
                    <Link href="/app-home/settings/security" className="block hover:bg-white/5 transition-colors">
                        <div className="px-6 py-6 flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white group-hover:text-emerald-300 transition-colors">Sicherheit & Login</h2>
                                    <p className="text-sm text-slate-400">Passwort, Login-Historie und Geräte</p>
                                </div>
                            </div>
                            <ChevronRight className="text-slate-600 group-hover:text-white transition-colors" />
                        </div>
                    </Link>
                </section>

            </div>
        </div>
    );
}
