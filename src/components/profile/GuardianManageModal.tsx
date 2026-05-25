"use client";

import { X, ShieldCheck, Lock, Activity, Users, Settings, Bell, ChevronRight, AlertTriangle, Construction } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

type GuardianManageModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

export function GuardianManageModal({ isOpen, onClose }: GuardianManageModalProps) {
    const [activeTab, setActiveTab] = useState("overview");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="guardian-manage-backdrop absolute inset-0 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className="guardian-manage-panel relative z-10 w-full max-w-4xl bg-[#0A0A0C] border border-white/10 text-slate-200 overflow-hidden sm:rounded-[2rem] shadow-2xl"
                    >
                        {/* 
                          Construction Overlay 
                          This sits on top of the "fake" UI to show it's work in progress.
                        */}
                        <div className="guardian-manage-overlay absolute inset-0 z-50 backdrop-blur-sm bg-[#0A0A0C]/60 flex items-center justify-center p-6">
                            <div className="guardian-manage-alert-card max-w-md w-full bg-[#15151A] border border-indigo-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                                <div className="relative z-10 flex flex-col items-center text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/5 mx-auto">
                                        <Construction className="text-indigo-400 w-8 h-8" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
                                        In Entwicklung
                                    </h2>
                                    <p className="text-slate-400 text-sm leading-relaxed mb-6">
                                        Wir arbeiten gerade an einer umfassenden Verwaltungskonsole für Erziehungsberechtigte. Hier wirst du bald detaillierte Einsicht und volle Kontrolle haben.
                                    </p>
                                    <button
                                        onClick={onClose}
                                        className="guardian-manage-action px-6 py-2.5 rounded-full bg-white text-black font-bold text-sm hover:bg-slate-200 transition-colors"
                                    >
                                        Verstanden
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 
                           "Fake" Background UI 
                           This is the complex UI that the user "sees" behind the blur.
                        */}
                        <div className="guardian-manage-preview relative flex h-[600px] pointer-events-none select-none opacity-50 filter grayscale-[0.3]">
                            {/* Sidebar */}
                            <div className="w-64 border-r border-white/5 bg-[#0F0F12] p-6 flex flex-col gap-6">
                                <div className="flex items-center gap-3 px-2">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                                        <ShieldCheck className="text-white w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-white tracking-tight">Guardian<span className="text-indigo-500">Core</span></span>
                                </div>
                                <div className="space-y-1">
                                    <div className="px-3 py-2 rounded-xl bg-white/5 text-white text-sm font-medium flex items-center gap-3">
                                        <Activity size={16} className="text-indigo-400" /> Übersicht
                                    </div>
                                    <div className="px-3 py-2 rounded-xl text-slate-500 text-sm font-medium flex items-center gap-3">
                                        <Users size={16} /> Berechtigungen
                                    </div>
                                    <div className="px-3 py-2 rounded-xl text-slate-500 text-sm font-medium flex items-center gap-3">
                                        <Bell size={16} /> Benachrichtigungen
                                    </div>
                                    <div className="px-3 py-2 rounded-xl text-slate-500 text-sm font-medium flex items-center gap-3">
                                        <Settings size={16} /> Einstellungen
                                    </div>
                                </div>
                                <div className="mt-auto p-4 rounded-xl bg-slate-900 border border-white/5">
                                    <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Status</div>
                                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        System aktiv
                                    </div>
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 bg-[#0A0A0C] p-8 flex flex-col gap-8">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h1 className="text-2xl font-bold text-white">Dashboard Übersicht</h1>
                                        <p className="text-slate-500 text-sm mt-1">Verwalte deine verknüpften Accounts und Berechtigungen.</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs text-slate-400">
                                            Letztes Update: Gerade eben
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="p-5 rounded-2xl bg-[#0F0F12] border border-white/5">
                                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Aktive Verknüpfungen</div>
                                        <div className="text-3xl font-black text-white">3</div>
                                    </div>
                                    <div className="p-5 rounded-2xl bg-[#0F0F12] border border-white/5">
                                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Ausstehende Anfragen</div>
                                        <div className="text-3xl font-black text-white">0</div>
                                    </div>
                                    <div className="p-5 rounded-2xl bg-[#0F0F12] border border-white/5">
                                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Gesicherte Events</div>
                                        <div className="text-3xl font-black text-white">124</div>
                                    </div>
                                </div>
                                <div className="flex-1 rounded-2xl bg-[#0F0F12] border border-white/5 overflow-hidden">
                                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-white">Letzte Aktivitäten</h3>
                                        <MoreHorizontal className="text-slate-600 w-4 h-4" />
                                    </div>
                                    <div className="p-6 space-y-4">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-full bg-slate-800" />
                                                <div className="flex-1 space-y-1">
                                                    <div className="h-2 w-32 bg-slate-800 rounded-full" />
                                                    <div className="h-2 w-20 bg-slate-800/50 rounded-full" />
                                                </div>
                                                <div className="h-2 w-16 bg-slate-800/50 rounded-full" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}

function MoreHorizontal({ className }: { className?: string }) {
    return (
        <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
        </svg>
    );
}
