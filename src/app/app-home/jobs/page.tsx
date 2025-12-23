import { requireCompleteProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ApplyButton } from "@/components/jobs/ApplyButton";
import { supabaseServer } from "@/lib/supabaseServer";
import { getDemoStatus } from "@/lib/demo";
import { Database } from "@/lib/types/supabase";

type JobRow = Database['public']['Tables']['jobs']['Row'] & {
    market_name?: string | null;  // RPC or Join often adds extra fields
    public_location_label?: string | null;
    distance_km?: number | null;
};

export default async function JobsPage() {
    const { profile } = await requireCompleteProfile();

    if (profile.user_type !== "youth") {
        redirect("/app-home/offers");
    }

    const isVerified = !!profile.is_verified;
    const { isEnabled: isDemo } = await getDemoStatus(profile.id);

    const supabase = await supabaseServer();
    let jobs: JobRow[] = [];

    if (isDemo) {
        const { data } = await supabase.from("demo_jobs").select("*").eq("status", "open");
        // demo_jobs lacks some calculated fields, but compatible enough base
        jobs = (data as unknown as JobRow[]) || [];
    } else {
        // Real Mode: Use RPC
        const { data, error } = await supabase.rpc("get_jobs_feed", {
            p_market_id: profile.market_id!,
            p_user_lat: null, // TODO: Get from geo-location if available
            p_user_lng: null
        });

        if (!error && data) {
            jobs = data as JobRow[]; // RPC returns any[], cast needed or fix RPC type in generator
        } else {
            // Fallback if RPC fails or returns empty
            const { data: fallback } = await supabase
                .from("jobs")
                .select("*, market:regions_live(display_name)")
                .eq("status", "open")
                .order("created_at", { ascending: false });

            // Fallback mapper or just use as is if types overlap close enough
            jobs = (fallback as unknown as JobRow[]) || [];
        }
    }

    return (
        <div className="container mx-auto py-12 px-4 md:px-6">
            <div className="mx-auto max-w-4xl space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                        Finde deinen Job
                    </h1>
                    <p className="text-slate-400">Hier findest du aktuelle Taschengeldjobs in deiner Nähe.</p>
                </div>

                {(!jobs || jobs.length === 0) ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-sm">
                        <p className="text-slate-300">Aktuell sind keine neuen Jobs verfügbar.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {jobs.map((job) => {
                            const isPrimary = job.market_id === profile.market_id;
                            return (
                                <div key={job.id} className="relative group">
                                    <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm hover:bg-white/8 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="text-xl font-semibold text-white">{job.title}</h3>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                    <span>{job.public_location_label || "Ort unbekannt"}</span>
                                                    {job.distance_km != null && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-blue-400">{Math.round(job.distance_km * 10) / 10} km</span>
                                                        </>
                                                    )}
                                                    {job.market_name && job.market_id !== profile.market_id && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-purple-400">{job.market_name}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            {isDemo && <span className="text-[10px] border border-amber-500/50 text-amber-500 px-1 rounded">TEST</span>}
                                        </div>

                                        <p className="text-slate-400 mb-4 line-clamp-3 text-sm">{job.description}</p>

                                        <div className="flex justify-end">
                                            <div className="w-full sm:w-auto">
                                                <ApplyButton isVerified={isVerified} jobId={job.id} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
