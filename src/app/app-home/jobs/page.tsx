import { requireCompleteProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ApplyButton } from "@/components/jobs/ApplyButton";
import { Database } from "@/lib/types/supabase";
import { fetchJobs, getEffectiveView } from "@/lib/dal/jobbridge";
import { QueryDebugPanel } from "@/components/debug/QueryDebugPanel";

type JobRow = Database['public']['Tables']['jobs']['Row'] & {
    market_name?: string | null;  // RPC or Join often adds extra fields
    public_location_label?: string | null;
    distance_km?: number | null;
};

function isMinor(birthdate: string | null): boolean {
    if (!birthdate) return true;
    const d = new Date(birthdate);
    if (Number.isNaN(d.getTime())) return true;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age < 18;
}

export default async function JobsPage() {
    const { profile } = await requireCompleteProfile();

    const viewRes = await getEffectiveView({ userId: profile.id, baseAccountType: profile.account_type });
    if (!viewRes.ok) {
        return (
            <div className="container mx-auto py-12 px-4 md:px-6">
                <div className="mx-auto max-w-4xl space-y-6">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Finde deinen Job</h1>
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
                        <p className="font-semibold">Fehler beim Bestimmen der Datenquelle/Rolle</p>
                        <p className="mt-2 text-sm font-mono">
                            {viewRes.error.code ? `${viewRes.error.code}: ` : ""}{viewRes.error.message}
                        </p>
                    </div>
                    <QueryDebugPanel
                        title="Jobs Feed Debug"
                        summary={{ source: "unknown", role: "unknown" }}
                        debug={viewRes.debug}
                        error={viewRes.error}
                    />
                </div>
            </div>
        );
    }

    const view = viewRes.data;
    if (view.viewRole === "job_provider") {
        redirect("/app-home/offers");
    }

    const guardianStatus = profile.guardian_status ?? "none";
    const canApply = !isMinor(profile.birthdate ?? null) || guardianStatus === "linked";

    const jobsRes = await fetchJobs({
        mode: "feed",
        view,
        userId: profile.id,
        marketId: profile.market_id,
        status: "open",
        limit: 50,
        offset: 0,
    });

    const jobs: JobRow[] = jobsRes.ok ? (jobsRes.data as unknown as JobRow[]) : [];

    return (
        <div className="container mx-auto py-12 px-4 md:px-6">
            <div className="mx-auto max-w-4xl space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                        Finde deinen Job
                    </h1>
                    <p className="text-slate-400">Hier findest du aktuelle Taschengeldjobs in deiner Nähe.</p>
                </div>

                {!jobsRes.ok ? (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-12 text-center backdrop-blur-sm">
                        <p className="text-red-200 font-semibold">Jobs konnten nicht geladen werden.</p>
                        <p className="mt-2 text-xs text-red-200/80 font-mono break-words">
                            {jobsRes.error.code ? `${jobsRes.error.code}: ` : ""}{jobsRes.error.message}
                        </p>
                        <QueryDebugPanel
                            title="Jobs Feed Debug"
                            summary={{ source: view.source, role: view.viewRole, status: "open", market_id: profile.market_id ?? "null" }}
                            debug={jobsRes.debug}
                            error={jobsRes.error}
                        />
                    </div>
                ) : (!jobs || jobs.length === 0) ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-sm">
                        <p className="text-slate-300">Aktuell sind keine neuen Jobs verfügbar.</p>
                        <div className="mt-4 text-[10px] text-slate-600 font-mono">
                            Debug: {profile.market_id?.slice(0, 8)} | Joined: {profile.created_at?.slice(0, 10)}
                        </div>
                        <QueryDebugPanel
                            title="Jobs Feed Debug"
                            summary={{ source: view.source, role: view.viewRole, status: "open", market_id: profile.market_id ?? "null" }}
                            debug={jobsRes.debug}
                        />
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {jobs.map((job) => {
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
                                            {view.source === "demo" && <span className="text-[10px] border border-amber-500/50 text-amber-500 px-1 rounded">TEST</span>}
                                        </div>

                                        <p className="text-slate-400 mb-4 line-clamp-3 text-sm">{job.description}</p>

                                        <div className="flex justify-end">
                                            <div className="w-full sm:w-auto">
                                                <ApplyButton canApply={canApply} guardianStatus={guardianStatus} jobId={job.id} />
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
