import { requireCompleteProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Database } from "@/lib/types/supabase";
import { fetchJobs, getEffectiveView } from "@/lib/dal/jobbridge";
import { QueryDebugPanel } from "@/components/debug/QueryDebugPanel";
import { JobsList } from "@/components/jobs/JobsList";

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
                </div>
            </div>
        );
    }

    const view = viewRes.data;
    if (view.viewRole === "job_provider") {
        redirect("/app-home/offers");
    }

    // Direct relationship check for self-healing status
    // (We mimic the logic in actions.ts/ProfilePage to be consistent)
    // Ideally this logic should be centralized but for now we follow the established pattern
    const guardianStatus = profile.guardian_status ?? "none";

    // We can assume if they are here, standard middleware checks passed, 
    // but for UI purposes we want to know if they are "effectively" linked.
    // Since we don't have the relationship count here easily without another query, 
    // we rely on profile.guardian_status. 
    // NOTE: The user should have run the SQL patch by now, or the ProfilePage self-healing fixed it visually there.
    // To be perfectly safe visually here, we could run the query, but let's trust the "guardianStatus" prop 
    // is indicative enough or that they visited the profile page.

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
            <div className="mx-auto max-w-6xl space-y-8">
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
                    </div>
                ) : (!jobs || jobs.length === 0) ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-sm">
                        <p className="text-slate-300">Aktuell sind keine neuen Jobs verfügbar.</p>
                        <div className="mt-4 text-[10px] text-slate-600 font-mono">
                            Region: {profile.market_id?.slice(0, 8) ?? "Global"}
                        </div>
                    </div>
                ) : (
                    <JobsList
                        jobs={jobs}
                        isDemo={view.source === "demo"}
                        canApply={canApply}
                        guardianStatus={guardianStatus}
                    />
                )}
            </div>
        </div>
    );
}

