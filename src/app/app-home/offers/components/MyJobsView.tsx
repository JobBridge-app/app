"use client";

import Link from "next/link";
import { Clock, ArrowRight, Briefcase, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Database } from "@/lib/types/supabase";

type JobRow = Database['public']['Tables']['jobs']['Row'];

export function MyJobsView({ jobs }: { jobs: JobRow[] }) {
    if (jobs.length === 0) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-16 text-center backdrop-blur-sm">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Briefcase size={40} className="text-slate-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Noch keine Jobs</h3>
                <p className="text-slate-400 mb-8 max-w-md mx-auto">Erstelle jetzt dein erstes Jobangebot, um Unterstützung aus deiner Nachbarschaft zu erhalten.</p>
                <Link href="/app-home/offers/new" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl transition-colors font-medium">
                    <Plus size={20} />
                    <span>Job erstellen</span>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Link href="/app-home/offers/new" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-colors font-medium shadow-lg shadow-indigo-600/20">
                    <Plus size={20} />
                    <span>Neuer Job</span>
                </Link>
            </div>
            <div className="grid gap-4">
                {jobs.map((job) => (
                    <Link key={job.id} href={`/app-home/offers/${job.id}`} className="group block">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm hover:bg-white/10 transition-all">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-semibold text-white group-hover:text-indigo-400 transition-colors">{job.title}</h3>
                                        <span className={cn("px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border",
                                            job.status === 'open' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                                                job.status === 'closed' ? 'bg-slate-500/10 border-slate-500/30 text-slate-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                        )}>
                                            {job.status === 'open' ? 'Aktiv' : job.status === 'closed' ? 'Geschlossen' : job.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-400">
                                        <span className="flex items-center gap-1.5"><Clock size={14} /> Erstellt am {new Date(job.created_at).toLocaleDateString()}</span>
                                        <span className="hidden sm:inline text-slate-600">•</span>
                                        <span className="text-slate-500">{job.wage_hourly} € / h</span>
                                    </div>
                                </div>
                                <div className="text-slate-500 group-hover:translate-x-1 transition-transform">
                                    <ArrowRight size={20} />
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
