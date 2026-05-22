"use client";

import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import type { HeaderNotificationItem } from "@/lib/types/jobbridge";
import { endPerfMark, startPerfMark } from "@/lib/perf";

type NotificationItem = HeaderNotificationItem;

export function NotificationsPopover({
    initialUnreadCount = 0,
    initialNotifications = [],
}: {
    initialUnreadCount?: number;
    initialNotifications?: NotificationItem[];
}) {
    const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
    const [hasLoadedFresh, setHasLoadedFresh] = useState(false);
    const router = useRouter();
    const skipNextClickRef = useRef(false);
    const warmNotificationsRoute = useCallback(() => {
        router.prefetch("/notifications");
    }, [router]);

    useEffect(() => {
        const isCoarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
        const timeoutId = window.setTimeout(warmNotificationsRoute, isCoarsePointer ? 1200 : 450);
        return () => window.clearTimeout(timeoutId);
    }, [warmNotificationsRoute]);

    const refreshNotifications = useCallback(async () => {
        const supabase = supabaseBrowser;
        const [countResult, rowsResult] = await Promise.all([
            supabase
                .from("notifications")
                .select("*", { count: "exact", head: true })
                .is("read_at", null),
            supabase
                .from("notifications")
                .select("id, type, title, body, created_at, read_at")
                .order("created_at", { ascending: false })
                .limit(10),
        ]);

        setUnreadCount(countResult.count || 0);
        setNotifications((rowsResult.data ?? []) as NotificationItem[]);
    }, []);

    useEffect(() => {
        if (!open || hasLoadedFresh) return;

        const fetchNotifications = async () => {
            await refreshNotifications();
            setHasLoadedFresh(true);
        };

        fetchNotifications();
    }, [hasLoadedFresh, open, refreshNotifications]);

    useEffect(() => {
        if (!open) return;
        const frameId = requestAnimationFrame(() => {
            endPerfMark("notifications-open");
        });
        return () => cancelAnimationFrame(frameId);
    }, [open]);

    const markAsRead = async (id: string) => {
        const supabase = supabaseBrowser;
        await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
        setNotifications((prev) => prev.map((notification) => (
            notification.id === id
                ? { ...notification, read_at: new Date().toISOString() }
                : notification
        )));
        setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    const toggleOpen = () => {
        if (!open) {
            startPerfMark("notifications-open");
        }
        setOpen((current) => !current);
    };

    return (
        <div className="notifications-popover-root relative">
            <button
                type="button"
                onClick={() => {
                    if (skipNextClickRef.current) {
                        skipNextClickRef.current = false;
                        return;
                    }
                    toggleOpen();
                }}
                onTouchStart={() => {
                    skipNextClickRef.current = true;
                    toggleOpen();
                }}
                aria-label={open ? "Benachrichtigungen schließen" : "Benachrichtigungen öffnen"}
                className={cn(
                    "notifications-trigger relative flex h-[52px] w-[52px] items-center justify-center rounded-full border text-slate-300",
                    "border-white/10 bg-slate-900/40 shadow-xl backdrop-blur-md",
                    "transition-all duration-200 hover:border-white/20 hover:bg-slate-900/50 hover:text-white"
                )}
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="notification-unread-dot absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border border-slate-950 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.55)]" />
                )}
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className={cn(
                        "notifications-panel z-50 rounded-2xl border border-white/10 bg-slate-950/90 p-4 shadow-2xl shadow-black/50 backdrop-blur-md",
                        "fixed left-4 right-4 top-[72px] md:absolute md:left-auto md:right-0 md:top-[calc(100%+0.5rem)] md:w-[22rem]"
                    )}>
                        <div className="notifications-panel-header mb-4 flex items-center justify-between border-b border-white/10 pb-2">
                            <h4 className="notifications-panel-title font-semibold text-white">Benachrichtigungen</h4>
                            <span className="notifications-panel-count text-xs text-slate-400">{unreadCount} neu</span>
                        </div>

                        <div className="notifications-list max-h-[300px] space-y-2 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="notifications-empty py-8 text-center text-sm text-slate-500">
                                    Keine Benachrichtigungen.
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <button
                                        key={notification.id}
                                        type="button"
                                        onClick={() => !notification.read_at && markAsRead(notification.id)}
                                        className={cn(
                                            "notification-card w-full cursor-pointer rounded-xl border p-3 text-left transition-all",
                                            notification.read_at
                                                ? "is-read border-transparent bg-slate-950/40 opacity-70"
                                                : "is-unread border-white/10 bg-slate-900/70 hover:border-indigo-400/35 hover:bg-slate-900/90"
                                        )}
                                    >
                                        <p className="notification-title text-sm font-medium text-slate-100">{notification.title || "Benachrichtigung"}</p>
                                        <p className="notification-body mt-1 line-clamp-2 text-xs text-slate-400">{notification.body || "Kein Inhalt."}</p>
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="notification-date text-[10px] text-slate-500">
                                                {new Date(notification.created_at || Date.now()).toLocaleDateString("de-DE")}
                                            </span>
                                            {!notification.read_at && <span className="notification-card-dot h-1.5 w-1.5 rounded-full bg-indigo-400" />}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="notifications-panel-footer mt-4 border-t border-white/10 pt-2 text-center">
                            <Link
                                href="/notifications"
                                prefetch
                                onTouchStart={warmNotificationsRoute}
                                onPointerDown={warmNotificationsRoute}
                                onMouseEnter={warmNotificationsRoute}
                                onFocus={warmNotificationsRoute}
                                className="notifications-view-all text-xs font-medium text-indigo-300 hover:text-indigo-200"
                            >
                                Alle anzeigen
                            </Link>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
