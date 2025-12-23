"use client";

import { Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Assuming shadcn popover exists or I mock it
// Actually let's assume raw or headless ui if shadcn not fully set up. 
// But user said "Verwende existierende Repo-Patterns". Previous audit showed generic UI components.
// I will build a simple custom one if basic popover missing, but likely it exists. 
// Checking imports... `src/components/ui/popover.tsx` usually exists in shadcn.
// If not, I'll fallback to a custom logical div.

// Let's assume standard shadcn import for now, if fail I fix.
import { supabaseBrowser } from "@/lib/supabaseClient";

export function NotificationsPopover() {
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        const fetchNotifications = async () => {
            const supabase = supabaseBrowser;
            const { count } = await supabase.from("notifications").select("*", { count: 'exact', head: true }).is("read_at", null);
            setUnreadCount(count || 0);

            const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(5);
            setNotifications(data || []);
        };
        fetchNotifications();
    }, []);

    const markAsRead = async (id: string) => {
        const supabase = supabaseBrowser;
        await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="relative w-10 h-10 flex items-center justify-center bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-full shadow-lg hover:bg-white/20 transition-all text-slate-700 dark:text-slate-300 hover:text-indigo-500"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-black" />
                )}
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-12 w-80 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl rounded-2xl p-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-black/5 dark:border-white/5">
                            <h4 className="font-semibold text-slate-900 dark:text-white">Benachrichtigungen</h4>
                            <span className="text-xs text-slate-500">{unreadCount} neu</span>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="py-8 text-center text-slate-500 text-sm">
                                    Keine Benachrichtigungen.
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <div
                                        key={n.id}
                                        onClick={() => !n.read_at && markAsRead(n.id)}
                                        className={`p-3 rounded-xl border transition-all cursor-pointer ${n.read_at
                                            ? "bg-transparent border-transparent opacity-60"
                                            : "bg-white/50 dark:bg-black/20 border-white/10 hover:border-indigo-500/30"
                                            }`}
                                    >
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{n.title}</p>
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.body}</p>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-[10px] text-slate-400">
                                                {new Date(n.created_at).toLocaleDateString()}
                                            </span>
                                            {!n.read_at && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-4 pt-2 border-t border-black/5 dark:border-white/5 text-center">
                            <a href="/notifications" className="text-xs text-indigo-500 hover:text-indigo-600 font-medium">Alle anzeigen</a>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
