"use client";

import { Building2, MapPin, Euro, Clock } from "lucide-react";
import type { Database } from "@/lib/types/supabase";

type JobRow = Database['public']['Tables']['jobs']['Row'] & {
    market_name?: string | null;
    public_location_label?: string | null;
    distance_km?: number | null;
};

// We will pass the full job object so the parent can handle the click/selection
interface JobCardProps {
    job: JobRow;
    isDemo?: boolean;
    onClick: () => void;
}

export function JobCard({ job, isDemo, onClick }: JobCardProps) {
    return (
        <div
            onClick={onClick}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm p-6 transition-all duration-300 hover:border-indigo-500/50 hover:bg-black/60 hover:shadow-2xl hover:-translate-y-1 cursor-pointer"
        >
            {/* Subtle Gradient Glow at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-indigo-900/20 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-5">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-white/5 text-indigo-400 border border-white/5 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 transition-colors">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white leading-tight mb-1 group-hover:text-indigo-200 transition-colors">
                                {job.title}
                            </h3>
                            <p className="text-sm text-slate-400 font-medium flex items-center gap-2">
                                {job.market_name || "Privater Auftraggeber"}
                                {isDemo && (
                                    <span className="text-[10px] uppercase tracking-wider font-bold text-amber-500 border border-amber-500/30 px-1.5 py-0.5 rounded bg-amber-500/10 ml-2">
                                        Demo
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                <p className="text-slate-300 text-base line-clamp-2 mb-6 leading-relaxed flex-grow font-light">
                    {job.description}
                </p>

                <div className="flex flex-wrap gap-4 text-sm text-slate-400 mt-auto pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        <Euro size={16} className="text-emerald-400" />
                        <span className="font-semibold text-white">{job.wage_hourly} € / Std.</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-blue-400" />
                        <span className="truncate max-w-[150px]">{job.public_location_label || "Rheinbach"}</span>
                    </div>
                    {job.distance_km != null && (
                        <div className="flex items-center gap-2 ml-auto">
                            <Clock size={16} className="text-amber-400" />
                            <span className="text-slate-500">{Math.round(job.distance_km * 10) / 10} km</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
