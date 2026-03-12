"use client";

import { startTransition, useEffect, useState } from "react";
import { User, MessageSquare, Check, X, Clock, AlertTriangle } from "lucide-react";
import { ApplicationRow } from "@/lib/types/jobbridge";
import { acceptApplicant, rejectApplicant } from "@/app/app-home/offers/actions";
import { RejectionModal } from "./RejectionModal";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { sendMessage } from "@/app/app-home/applications/actions";
import dynamic from "next/dynamic";

const ApplicationChatModal = dynamic(
    () => import("@/components/activity/ApplicationChatModal").then((mod) => mod.ApplicationChatModal),
    { loading: () => null },
);

export function ApplicantList({ applications, jobTitle }: { applications: ApplicationRow[], jobTitle: string }) {
    const router = useRouter();
    const [items, setItems] = useState(applications);
    const [selectedApplicant, setSelectedApplicant] = useState<ApplicationRow | null>(null);
    const [selectedChatApp, setSelectedChatApp] = useState<any | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [confirmAcceptId, setConfirmAcceptId] = useState<string | null>(null);
    const [acceptResult, setAcceptResult] = useState<{ auto_rejected_count: number } | null>(null);

    useEffect(() => {
        setItems(applications);
    }, [applications]);

    const submittedCount = items.filter((a) => a.status === "submitted").length;

    const handleAcceptClick = (appId: string) => {
        // Show confirmation if there are other submitted applications
        if (submittedCount > 1) {
            setConfirmAcceptId(appId);
        } else {
            executeAccept(appId);
        }
    };

    const executeAccept = async (appId: string) => {
        setConfirmAcceptId(null);
        setLoadingId(appId);
        try {
            const previousItems = items;
            setItems((current) =>
                current.map((app) => {
                    if (app.id === appId) {
                        return { ...app, status: "accepted" as ApplicationRow["status"] };
                    }

                    if (["submitted", "negotiating", "waitlisted"].includes(app.status)) {
                        return { ...app, status: "auto_rejected" as ApplicationRow["status"] };
                    }

                    return app;
                }),
            );

            const res = await acceptApplicant(appId);
            if (res.ok) {
                setAcceptResult({ auto_rejected_count: res.data.auto_rejected_count });
                setTimeout(() => setAcceptResult(null), 5000);
            } else {
                setItems(previousItems);
                console.error("Accept error:", res.error);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingId(null);
            startTransition(() => {
                router.refresh();
            });
        }
    };

    const handleRejectClick = (app: ApplicationRow) => {
        setSelectedApplicant(app);
        setIsRejectionModalOpen(true);
    };

    const handleRejectConfirm = async (reasonId: string, message: string) => {
        if (!selectedApplicant) return;
        setLoadingId(selectedApplicant.id);
        try {
            const reasonText = message || reasonId;
            const selectedId = selectedApplicant.id;
            const previousItems = items;
            setItems((current) =>
                current.map((app) =>
                    app.id === selectedId
                        ? { ...app, status: "rejected" as ApplicationRow["status"], rejection_reason: reasonText }
                        : app,
                ),
            );

            const res = await rejectApplicant(selectedId, reasonText);
            if (!res.ok) {
                setItems(previousItems);
                throw new Error(res.error.message);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingId(null);
            startTransition(() => {
                router.refresh();
            });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "accepted":
                return { label: "Akzeptiert", icon: <Check size={14} />, className: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" };
            case "rejected":
                return { label: "Abgesagt", icon: <X size={14} />, className: "bg-red-500/10 border-red-500/20 text-red-400" };
            case "auto_rejected":
                return { label: "Auto-Absage", icon: <X size={14} />, className: "bg-orange-500/10 border-orange-500/20 text-orange-400" };
            case "withdrawn":
                return { label: "Zurückgezogen", icon: null, className: "bg-slate-500/10 border-slate-500/20 text-slate-400" };
            case "completed":
                return { label: "Abgeschlossen", icon: <Check size={14} />, className: "bg-blue-500/10 border-blue-500/20 text-blue-400" };
            case "cancelled":
                return { label: "Storniert", icon: <X size={14} />, className: "bg-slate-500/10 border-slate-500/20 text-slate-400" };
            default:
                return { label: status, icon: null, className: "bg-slate-500/10 border-slate-500/20 text-slate-400" };
        }
    };

    if (items.length === 0) {
        return (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-white/5">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                    <User size={32} />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Noch keine Bewerber</h3>
                <p className="text-slate-400 text-sm max-w-sm mx-auto">
                    Sobald sich jemand auf diesen Job bewirbt, erscheinen die Profile hier.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Success banner after accepting */}
            {acceptResult && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <Check size={20} className="text-emerald-400 shrink-0" />
                    <p className="text-sm text-emerald-300">
                        Bewerber akzeptiert!
                        {acceptResult.auto_rejected_count > 0 && (
                            <span className="text-emerald-400/70">
                                {" "}· {acceptResult.auto_rejected_count} andere Bewerbung{acceptResult.auto_rejected_count > 1 ? "en" : ""} automatisch abgesagt.
                            </span>
                        )}
                    </p>
                </div>
            )}

            {items.map((app) => (
                <div key={app.id} className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col md:flex-row items-center gap-6 group hover:border-white/20 transition-all">
                    {/* Avatar / User Info */}
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-white/10 shrink-0">
                            <div className="w-full h-full flex items-center justify-center text-slate-500">
                                <User size={24} />
                            </div>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className="text-white font-semibold truncate">
                                {app.applicant?.full_name || "Unbekannter Nutzer"}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                <Clock size={12} />
                                <span>{new Date(app.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Message Preview (if any) */}
                    <div className="flex-1 w-full md:w-auto">
                        {app.message ? (
                            <div className="bg-black/20 p-3 rounded-lg text-sm text-slate-300 italic line-clamp-2 md:line-clamp-1 border border-white/5">
                                &quot;{app.message}&quot;
                            </div>
                        ) : (
                            <span className="text-sm text-slate-500 italic">Keine Nachricht</span>
                        )}
                    </div>

                    {/* Status / Actions */}
                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        {['submitted', 'negotiating', 'accepted'].includes(app.status) ? (
                            <>
                                <button
                                    onClick={() => handleRejectClick(app)}
                                    disabled={loadingId === app.id}
                                    className="p-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors disabled:opacity-50"
                                    title={app.status === 'submitted' ? "Absagen" : "Beenden/Kündigen"}
                                >
                                    <X size={18} />
                                </button>
                                {app.status === 'submitted' && (
                                    <button
                                        onClick={() => handleAcceptClick(app.id)}
                                        disabled={loadingId === app.id}
                                        className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-medium shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {loadingId === app.id ? (
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Check size={18} />
                                                <span>Zusagen</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </>
                        ) : (
                            (() => {
                                const badge = getStatusBadge(app.status);
                                return (
                                    <div className={cn("px-3 py-1.5 rounded-lg text-sm font-medium border flex items-center gap-2", badge.className)}>
                                        {badge.icon}
                                        {badge.label}
                                    </div>
                                );
                            })()
                        )}
                        <button
                            onClick={() => {
                                setSelectedChatApp({ ...app, job: { title: jobTitle } });
                                setIsChatOpen(true);
                            }}
                            className="p-2.5 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 transition-colors"
                            title="Chat"
                        >
                            <MessageSquare size={18} />
                        </button>
                    </div>
                </div>
            ))}

            {/* Confirmation Dialog for Accept */}
            {confirmAcceptId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                                <AlertTriangle size={20} className="text-amber-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Bewerber zusagen?</h3>
                        </div>
                        <p className="text-slate-300 text-sm mb-2">
                            Wenn du diesen Bewerber akzeptierst:
                        </p>
                        <ul className="text-sm text-slate-400 space-y-1 mb-6 ml-4 list-disc">
                            <li>Der Job wird als <span className="text-emerald-400 font-medium">vergeben</span> markiert</li>
                            <li>{submittedCount - 1} andere Bewerbung{submittedCount - 1 > 1 ? "en werden" : " wird"} automatisch <span className="text-orange-400 font-medium">abgesagt</span></li>
                            <li>Alle Bewerber werden benachrichtigt</li>
                        </ul>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmAcceptId(null)}
                                className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 transition-colors font-medium"
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={() => executeAccept(confirmAcceptId)}
                                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-medium shadow-lg shadow-emerald-500/20 transition-all"
                            >
                                Ja, zusagen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <RejectionModal
                isOpen={isRejectionModalOpen}
                onClose={() => setIsRejectionModalOpen(false)}
                onConfirm={handleRejectConfirm}
                applicantName={selectedApplicant?.applicant?.full_name || "Bewerber"}
            />

            <ApplicationChatModal
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                onClosed={() => setSelectedChatApp(null)}
                application={selectedChatApp}
                currentUserRole="provider"
                onReject={async (reason) => {
                    const selectedId = selectedChatApp.id;
                    const previousItems = items;
                    setItems((current) =>
                        current.map((app) =>
                            app.id === selectedId
                                ? { ...app, status: "rejected" as ApplicationRow["status"], rejection_reason: reason }
                                : app,
                        ),
                    );

                    const res = await rejectApplicant(selectedId, reason);
                    if (!res.ok) {
                        setItems(previousItems);
                        throw new Error(res.error.message);
                    }

                    setIsChatOpen(false);
                    startTransition(() => {
                        router.refresh();
                    });
                }}
                onSendMessage={sendMessage}
            />
        </div>
    );
}
