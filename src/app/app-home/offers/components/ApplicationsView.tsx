"use client";

import { Clock, FileText, User } from "lucide-react";
import { Database } from "@/lib/types/supabase";

type ApplicationWithRelations = Database['public']['Tables']['applications']['Row'] & {
    job: { title: string } | null;
    applicant?: { full_name: string | null; city: string | null } | null;
};

export function ApplicationsView({ applications }: { applications: ApplicationWithRelations[] }) {
    if (applications.length === 0) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-16 text-center backdrop-blur-sm">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileText size={32} className="text-slate-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Keine Bewerbungen</h3>
                <p className="text-slate-400">Aktuell liegen keine Bewerbungen für deine Inserate vor.</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4">
            {applications.map((app) => (
                <div key={app.id} className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm hover:border-white/20 transition-all">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                    <User size={16} />
                                </div>
                                <h3 className="text-lg font-semibold text-white">
                                    {app.applicant?.full_name || "Bewerber"}
                                </h3>
                            </div>

                            <p className="text-sm text-slate-400 ml-11 mb-3">
                                Bewerbung für <span className="text-white font-medium">{app.job?.title}</span>
                            </p>

                            {app.message && (
                                <div className="ml-11 p-3 bg-black/20 rounded-lg text-sm text-slate-300 italic border border-white/5 relative">
                                    <div className="absolute left-0 top-3 -ml-1.5 w-3 h-3 bg-black/20 rotate-45 border-l border-b border-white/5 text-transparent">.</div>
                                    "{app.message}"
                                </div>
                            )}

                            <div className="flex items-center gap-4 text-xs text-slate-500 mt-4 ml-11">
                                <span className="flex items-center gap-1.5"><Clock size={12} /> {new Date(app.created_at).toLocaleDateString()}</span>
                                <span className={`px-2 py-0.5 rounded uppercase font-bold tracking-wider border ${app.status === 'accepted' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                                        app.status === 'rejected' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                                            'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                    }`}>
                                    {app.status}
                                </span>
                            </div>
                        </div>

                        {/* Actions Placeholder */}
                        <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 ml-11 sm:ml-0">
                            <button className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors border border-white/10">
                                Details
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
