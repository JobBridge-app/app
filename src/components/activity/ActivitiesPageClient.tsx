"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { ActivityItem } from "@/components/activity/ActivityItem";
import { withdrawApplication, sendMessage } from "@/app/app-home/applications/actions";
import { MessageSquare, CheckCircle2, XCircle, ArrowRight, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const ApplicationChat = dynamic(
    () => import("@/components/activity/ApplicationChat").then((mod) => mod.ApplicationChat),
    { loading: () => null },
);

interface ActivitiesPageClientProps {
    applications: any[];
    userId: string;
}

export function ActivitiesPageClient({ applications, userId }: ActivitiesPageClientProps) {
    const router = useRouter();
    const [items, setItems] = useState(applications);
    const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

    useEffect(() => {
        setItems(applications);
    }, [applications]);

    const selectedApp = useMemo(() =>
        items.find(a => a.id === selectedAppId),
        [items, selectedAppId]);

    const handleWithdraw = async (reason: string) => {
        if (!selectedAppId) return;
        const previousItems = items;
        setItems((current) =>
            current.map((app) =>
                app.id === selectedAppId
                    ? { ...app, status: "withdrawn", rejection_reason: reason }
                    : app,
            ),
        );

        const result = await withdrawApplication(selectedAppId, reason);
        if (result?.error) {
            setItems(previousItems);
            throw new Error(result.error);
        }

        startTransition(() => {
            router.refresh();
        });
    };

    const stats = useMemo(() => {
        return {
            negotiating: items.filter(a => ['negotiating', 'submitted', 'waitlisted'].includes(a.status)).length,
            accepted: items.filter(a => a.status === 'accepted').length,
            rejected: items.filter(a => ['rejected', 'withdrawn', 'cancelled'].includes(a.status)).length
        };
    }, [items]);

    if (items.length === 0) {
        return (
            <div className="text-center py-20 px-4 rounded-3xl border border-dashed border-slate-800 bg-slate-900/20">
                <div className="bg-slate-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                    <Briefcase size={24} />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Keine Aktivitäten</h3>
                <p className="text-slate-400 max-w-sm mx-auto mb-6">
                    Du hast dich noch auf keine Jobs beworben. Stöbere in den Angeboten und finde deinen ersten Job!
                </p>
                <a href="/app-home" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                    Zu den Angeboten <ArrowRight size={16} />
                </a>
            </div>
        );
    }

    return (
        <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
            {/* Stats Overview - Only visible on desktop or if space permits? */}
            {/* Actually, let's keep stats at the top but make them compact */}
            <div className="grid grid-cols-3 gap-4 shrink-0">
                <div className="bg-[#111116] border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <MessageSquare size={32} />
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Offen</div>
                    <div className="text-2xl font-bold text-white">{stats.negotiating}</div>
                </div>
                <div className="bg-[#111116] border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CheckCircle2 size={32} className="text-emerald-500" />
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Zusage</div>
                    <div className="text-2xl font-bold text-emerald-400">{stats.accepted}</div>
                </div>
                <div className="bg-[#111116] border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <XCircle size={32} className="text-red-500" />
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Absage</div>
                    <div className="text-2xl font-bold text-slate-400">{stats.rejected}</div>
                </div>
            </div>

            {/* Split View Container */}
            <div className="flex-1 flex bg-[#09090b] rounded-3xl border border-white/10 overflow-hidden shadow-2xl min-h-0">

                {/* LIST View (Sidebar on Desktop, Full on Mobile if no selection) */}
                <div className={cn(
                    "w-full md:w-[350px] lg:w-[400px] border-r border-white/5 flex flex-col bg-[#111116]",
                    selectedAppId ? "hidden md:flex" : "flex"
                )}>
                    <div className="p-4 border-b border-white/5 bg-[#111116] z-10">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Verlauf</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {items.map((app) => (
                            <div key={app.id} onClick={() => setSelectedAppId(app.id)} className="cursor-pointer">
                                <ActivityItem
                                    app={app}
                                    onSelect={() => setSelectedAppId(app.id)}
                                    isSelected={selectedAppId === app.id}
                                    compact={true}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* CHAT View (Main on Desktop, Full on Mobile if selection) */}
                <div className={cn(
                    "flex-1 flex flex-col bg-[#09090b]",
                    selectedAppId ? "flex" : "hidden md:flex"
                )}>
                    {selectedApp ? (
                        <ApplicationChat
                            application={selectedApp}
                            currentUserRole="seeker"
                            onWithdraw={handleWithdraw}
                            onSendMessage={sendMessage}
                            onClose={() => setSelectedAppId(null)}
                            embedded={true}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center bg-[#09090b]">
                            <div className="w-16 h-16 rounded-full bg-[#111116] border border-white/5 flex items-center justify-center mb-4 text-slate-600">
                                <MessageSquare size={32} />
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">Wähle eine Bewerbung</h3>
                            <p className="text-slate-400 max-w-xs">
                                Klicke auf eine Bewerbung in der Liste, um den Chat und Details zu sehen.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
