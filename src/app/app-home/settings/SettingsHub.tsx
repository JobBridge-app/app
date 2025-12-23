"use client";

import { User, Bell, Shield, Moon, Sun, Monitor, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export function SettingsHub() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left Col: Core Settings Pointers */}
            <div className="lg:col-span-2 space-y-6">

                {/* Profile Card */}
                <Link href="/app-home/profile" className="group block p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                            <User size={28} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">Profil Settings</h3>
                            <p className="text-slate-400 mt-1">Manage public details, CV, and bio.</p>
                        </div>
                        <ChevronRight className="text-slate-600 group-hover:text-white transition-colors" />
                    </div>
                </Link>

                {/* Notifications Card */}
                <Link href="/notifications/settings" className="group block p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                            <Bell size={28} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">Notifications</h3>
                            <p className="text-slate-400 mt-1">Configure email alerts and push notifications.</p>
                        </div>
                        <ChevronRight className="text-slate-600 group-hover:text-white transition-colors" />
                    </div>
                </Link>

                {/* Security Card */}
                <Link href="/auth/update-password" className="group block p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                            <Shield size={28} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">Security</h3>
                            <p className="text-slate-400 mt-1">Update password and view active sessions.</p>
                        </div>
                        <ChevronRight className="text-slate-600 group-hover:text-white transition-colors" />
                    </div>
                </Link>
            </div>

            {/* Right Col: App Preferences (Immediate Actions) */}
            <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Monitor size={20} className="text-pink-400" />
                        Appearance
                    </h3>

                    {/* Theme Toggle */}
                    <div className="space-y-4">
                        <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Theme Mode</p>
                        <div className="grid grid-cols-3 gap-2 bg-black/20 p-1.5 rounded-xl border border-white/5">
                            <button
                                onClick={() => setTheme("light")}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-2 py-3 rounded-lg transition-all",
                                    theme === "light" ? "bg-white text-black shadow-lg" : "text-slate-500 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <Sun size={20} />
                                <span className="text-xs font-semibold">Light</span>
                            </button>
                            <button
                                onClick={() => setTheme("dark")}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-2 py-3 rounded-lg transition-all",
                                    theme === "dark" ? "bg-slate-700 text-white shadow-lg" : "text-slate-500 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <Moon size={20} />
                                <span className="text-xs font-semibold">Dark</span>
                            </button>
                            <button
                                onClick={() => setTheme("system")} // Assuming ThemeProvider supports this locally even if DB assumes light/dark
                                className={cn(
                                    "flex flex-col items-center justify-center gap-2 py-3 rounded-lg transition-all",
                                    (theme !== "light" && theme !== "dark") ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <Monitor size={20} />
                                <span className="text-xs font-semibold">System</span>
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-white font-medium">Reduced Motion</h4>
                                <p className="text-xs text-slate-500 mt-1">Minimize UI animations.</p>
                            </div>
                            <div className="relative">
                                {/* Visual toggle only for now */}
                                <div className="w-12 h-6 rounded-full bg-slate-700 border border-white/10" />
                                <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-slate-400" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
