"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import type { JobsListItem } from "@/lib/types/jobbridge";
import { JobCard } from "@/components/jobs/JobCard";
import { useRouter } from "next/navigation";

export function MyJobsView({ jobs }: { jobs: JobsListItem[] }) {
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');

    const activeJobs = jobs.filter(j => j.status !== 'closed');
    const closedJobs = jobs.filter(j => j.status === 'closed');

    const displayedJobs = activeTab === 'active' ? activeJobs : closedJobs;

    if (jobs.length === 0) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-16 text-center backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                    <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-white/10">
                        <Briefcase size={40} className="text-slate-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Noch keine Jobs</h3>
                    <p className="text-slate-400 mb-8 max-w-md mx-auto">Erstelle jetzt dein erstes Jobangebot, um Unterstützung aus deiner Nachbarschaft zu erhalten.</p>
                    <Link href="/app-home/offers/new" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl transition-all font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5">
                        <Plus size={20} />
                        <span>Jetzt Job erstellen</span>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-12">
            {/* Active Jobs Section */}
            <section>
                {activeJobs.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
                        <p className="text-slate-500">Aktuell keine offenen Stellen.</p>
                        <Link href="/app-home/offers/new" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium mt-2 inline-block">
                            + Jetzt inserieren
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeJobs.map((job) => (
                            <JobCard
                                key={job.id}
                                job={job}
                                isDemo={false}
                                isApplied={false}
                                providerStatus={job.status}
                                href={`/app-home/offers/${job.id}`}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Past Jobs Section */}
            {closedJobs.length > 0 && (
                <section className="opacity-80 hover:opacity-100 transition-opacity pt-8 border-t border-white/5">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">
                        Vergangene Aufträge
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 grayscale-[0.3] hover:grayscale-0 transition-all duration-500">
                        {closedJobs.map((job) => (
                            <JobCard
                                key={job.id}
                                job={job}
                                isDemo={false}
                                isApplied={false}
                                providerStatus={job.status}
                                href={`/app-home/offers/${job.id}`}
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

