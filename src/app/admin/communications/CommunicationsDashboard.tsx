"use client";

import { useState, useCallback } from "react";
import { MessageSquare, LayoutList, RefreshCw } from "lucide-react";
import { CommunicationLogItem } from "@/lib/data/adminTypes";
import { NewMessageWizard } from "./NewMessageWizard";
import { NotificationHistoryTable } from "./NotificationHistoryTable";
import { getCommunicationLogs } from "@/lib/data/adminCommunications";

// Actually, `getCommunicationLogs` is server-side. We should use a Server Action wrapper or just router.refresh() for simplicity.

export function CommunicationsDashboard({ initialLogs }: { initialLogs: CommunicationLogItem[] }) {
    const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
    const [logs, setLogs] = useState<CommunicationLogItem[]>(initialLogs);
    // In a real app we'd use useSWR or React Query, keeping it simple here with router refresh or manual server action calls.
    // Since getCommunicationLogs is server-only, we can't call it directly here.
    // We'll rely on the parent updating or standard Next.js navigation refresh, 
    // OR we define a server action in `actions.ts` to fetch logs.

    // Let's assume we just show the initial logs in history for now, and rely on full page refresh 
    // or we add a fetchLogs action.

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5 w-fit">
                <button
                    onClick={() => setActiveTab('compose')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'compose'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <MessageSquare size={16} />
                    Compose
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'history'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <LayoutList size={16} />
                    History
                </button>
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {activeTab === 'compose' ? (
                    <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 max-w-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none" />
                        <div className="relative z-10">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <MessageSquare className="text-indigo-400" />
                                Send Message
                            </h2>
                            <NewMessageWizard onSuccess={() => {
                                // Ideally verify/refresh logs here
                                // router.refresh(); 
                                setActiveTab('history');
                            }} />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-2">
                            <h2 className="text-xl font-bold text-white">Recent Activity</h2>
                            <button
                                onClick={() => window.location.reload()} // Simple reload for now to fetch latest server data
                                className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>
                        <NotificationHistoryTable logs={logs} />
                    </div>
                )}
            </div>
        </div>
    );
}
