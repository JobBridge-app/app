"use client";

import { updateApplicationStatus } from "@/app/app-home/applications/actions";
import { useState } from "react";
import { Loader2, Check, X } from "lucide-react";

export function ApplicationCard({ application }: { application: any }) {
    const [loading, setLoading] = useState<string | null>(null); // 'accepted' | 'rejected' | null

    const handleUpdate = async (status: 'accepted' | 'rejected') => {
        if (confirm(`Bewerbung wirklich ${status === 'accepted' ? 'annehmen' : 'ablehnen'}?`)) {
            setLoading(status);
            await updateApplicationStatus(application.id, status);
            setLoading(null);
        }
    };

    const isPending = application.status === 'submitted';

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                        {application.applicant?.full_name || "Unbekannter Bewerber"}
                    </h3>
                    <p className="text-sm text-slate-400">
                        Bewerbung für <span className="text-white font-medium">{application.job?.title}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        {new Date(application.created_at).toLocaleDateString()}
                    </p>
                </div>
                <div>
                    {application.status === 'submitted' && <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">Offen</span>}
                    {application.status === 'accepted' && <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-full border border-emerald-500/30">Angenommen</span>}
                    {application.status === 'rejected' && <span className="px-3 py-1 bg-red-500/20 text-red-300 text-xs rounded-full border border-red-500/30">Abgelehnt</span>}
                </div>
            </div>

            <div className="bg-white/5 p-3 rounded-lg text-sm text-slate-300 mb-4">
                {application.message || "Keine Nachricht."}
            </div>

            {isPending && (
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={() => handleUpdate('rejected')}
                        disabled={!!loading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
                    >
                        {loading === 'rejected' ? <Loader2 className="animate-spin h-4 w-4" /> : <X size={16} />}
                        Ablehnen
                    </button>
                    <button
                        onClick={() => handleUpdate('accepted')}
                        disabled={!!loading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors text-sm font-medium"
                    >
                        {loading === 'accepted' ? <Loader2 className="animate-spin h-4 w-4" /> : <Check size={16} />}
                        Annehmen
                    </button>
                </div>
            )}
        </div>
    );
}
