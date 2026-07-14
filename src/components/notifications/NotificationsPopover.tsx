"use client";

import { Bell } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import type { HeaderNotificationItem } from "@/lib/types/jobbridge";
import { endPerfMark, startPerfMark } from "@/lib/perf";

type NotificationItem = HeaderNotificationItem;

function scheduleIdle(task: () => void, timeout = 2200) {
    if (typeof window === "undefined") return () => undefined;

    const idleWindow = window as typeof window & {
        requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
    };

    if (idleWindow.requestIdleCallback) {
        const id = idleWindow.requestIdleCallback(task, { timeout });
        return () => idleWindow.cancelIdleCallback?.(id);
    }

    const timeoutId = window.setTimeout(task, timeout);
    return () => window.clearTimeout(timeoutId);
}

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
    const pathname = usePathname();
    const triggerRef = useRef<HTMLButtonElement>(null);
    const warmNotificationsRoute = useCallback(() => {
        router.prefetch("/app-home/notifications");
    }, [router]);

    useEffect(() => {
        const isCoarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
        if (isCoarsePointer) return;
        const timeoutId = window.setTimeout(warmNotificationsRoute, 450);
        return () => window.clearTimeout(timeoutId);
    }, [warmNotificationsRoute]);

    const fetchNotifications = useCallback(async () => {
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

        return {
            unreadCount: countResult.count || 0,
            notifications: (rowsResult.data ?? []) as NotificationItem[],
        };
    }, []);

    useEffect(() => {
        if (hasLoadedFresh) return;
        let cancelled = false;

        const cancelIdle = scheduleIdle(() => {
            fetchNotifications()
                .then((next) => {
                    if (cancelled) return;
                    setUnreadCount(next.unreadCount);
                    setNotifications(next.notifications);
                    setHasLoadedFresh(true);
                })
                .catch(() => {
                    if (!cancelled) setHasLoadedFresh(true);
                });
        });

        return () => {
            cancelled = true;
            cancelIdle();
        };
    }, [fetchNotifications, hasLoadedFresh]);

    useEffect(() => {
        if (!open || hasLoadedFresh) return;
        let cancelled = false;

        fetchNotifications()
            .then((next) => {
                if (cancelled) return;
                setUnreadCount(next.unreadCount);
                setNotifications(next.notifications);
                setHasLoadedFresh(true);
            })
            .catch(() => {
                if (!cancelled) setHasLoadedFresh(true);
            });

        return () => {
            cancelled = true;
        };
    }, [fetchNotifications, hasLoadedFresh, open]);

    useEffect(() => {
        if (!open) return;
        const frameId = requestAnimationFrame(() => {
            endPerfMark("notifications-open");
        });
        return () => cancelAnimationFrame(frameId);
    }, [open]);

    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    useEffect(() => {
        const handleOtherPopover = (event: Event) => {
            if ((event as CustomEvent<string>).detail !== "notifications") setOpen(false);
        };

        window.addEventListener("jobbridge:header-popover-open", handleOtherPopover);
        return () => window.removeEventListener("jobbridge:header-popover-open", handleOtherPopover);
    }, []);

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            setOpen(false);
            requestAnimationFrame(() => triggerRef.current?.focus());
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
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
            window.dispatchEvent(new CustomEvent("jobbridge:header-popover-open", { detail: "notifications" }));
        }
        setOpen((current) => !current);
    };

    return (
        <div className="notifications-popover-root relative">
            <button
                ref={triggerRef}
                type="button"
                onClick={toggleOpen}
                aria-label={open
                    ? "Benachrichtigungen schließen"
                    : unreadCount > 0
                        ? `Benachrichtigungen öffnen, ${unreadCount} ungelesen`
                        : "Benachrichtigungen öffnen"}
                aria-expanded={open}
                aria-controls="app-notifications-panel"
                className={cn(
                    "notifications-trigger relative flex h-[52px] w-[52px] items-center justify-center rounded-full border border-transparent text-slate-300 outline-none",
                    "transition-[box-shadow,color,scale] duration-150 ease-out active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 motion-reduce:transition-none motion-reduce:active:scale-100",
                    open && "is-open"
                )}
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span aria-hidden="true" className="notification-unread-dot absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full" />
                )}
            </button>

            <AnimatePresence initial={false}>
                {open ? (
                    <>
                        <motion.div
                            key="notifications-backdrop"
                            aria-hidden="true"
                            className="app-header-popover-backdrop fixed inset-x-0 bottom-0 z-40 cursor-default appearance-none border-0 bg-transparent p-0"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.12, ease: "easeOut" }}
                            onClick={() => setOpen(false)}
                        />
                        <motion.div
                            key="notifications-panel"
                            id="app-notifications-panel"
                            role="dialog"
                            aria-label="Benachrichtigungen"
                            className={cn(
                                "notifications-panel fixed left-4 right-4 z-50 flex origin-top-right flex-col rounded-2xl border border-transparent p-1.5",
                                "md:absolute md:left-auto md:right-0 md:top-[calc(100%+0.5rem)] md:w-[22rem]"
                            )}
                            initial={{ opacity: 0, y: -6, scale: 0.985 }}
                            animate={{
                                opacity: 1,
                                y: 0,
                                scale: 1,
                                transition: { duration: 0.18, ease: [0.2, 0, 0, 1] },
                            }}
                            exit={{
                                opacity: 0,
                                y: -4,
                                scale: 0.99,
                                transition: { duration: 0.13, ease: "easeIn" },
                            }}
                        >
                        <div className="notifications-panel-header flex items-center justify-between border-b px-3 pb-2.5 pt-2.5">
                            <h4 className="notifications-panel-title font-semibold text-white">Benachrichtigungen</h4>
                            <span aria-live="polite" className="notifications-panel-count text-xs tabular-nums text-slate-400">
                                {unreadCount > 0 ? `${unreadCount} ungelesen` : "Alles gelesen"}
                            </span>
                        </div>

                        <div className="notifications-list min-h-0 max-h-[320px] flex-1 overflow-y-auto py-1">
                            {notifications.length === 0 ? (
                                <div className="notifications-empty py-8 text-center text-sm text-slate-500">
                                    Keine Benachrichtigungen.
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <button
                                        key={notification.id}
                                        type="button"
                                        disabled={Boolean(notification.read_at)}
                                        aria-label={`${notification.read_at ? "Gelesen" : "Ungelesen"}: ${notification.title || "Benachrichtigung"}. ${notification.body || "Kein Inhalt."}`}
                                        onClick={() => !notification.read_at && markAsRead(notification.id)}
                                        className={cn(
                                            "notification-card relative w-full rounded-[0.625rem] px-3 py-2.5 text-left outline-none transition-[background-color,color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600",
                                            notification.read_at
                                                ? "is-read cursor-default"
                                                : "is-unread"
                                        )}
                                    >
                                        <p className="notification-title text-sm font-medium text-slate-100">{notification.title || "Benachrichtigung"}</p>
                                        <p className="notification-body mt-1 line-clamp-2 text-xs text-slate-400">{notification.body || "Kein Inhalt."}</p>
                                        <div className="mt-1.5 flex items-center justify-between">
                                            <span className="notification-date text-[11px] tabular-nums text-slate-500">
                                                {new Date(notification.created_at || Date.now()).toLocaleDateString("de-DE")}
                                            </span>
                                            {!notification.read_at ? <span aria-hidden="true" className="notification-card-dot h-1.5 w-1.5 rounded-full bg-indigo-400" /> : null}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="notifications-panel-footer border-t px-1 pt-1 text-center">
                            <Link
                                href="/app-home/notifications"
                                prefetch
                                onTouchStart={warmNotificationsRoute}
                                onPointerDown={warmNotificationsRoute}
                                onMouseEnter={warmNotificationsRoute}
                                onFocus={warmNotificationsRoute}
                                className="notifications-view-all flex min-h-11 items-center justify-center rounded-[0.625rem] px-3 text-xs font-semibold outline-none transition-[background-color,color] duration-150 ease-out hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600"
                            >
                                Alle anzeigen
                            </Link>
                        </div>
                        </motion.div>
                    </>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
