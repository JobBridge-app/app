import { requireCompleteProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchJobs, fetchCandidateApplications, getEffectiveView } from "@/lib/dal/jobbridge";
import { QueryDebugPanel } from "@/components/debug/QueryDebugPanel";
import { JobsList } from "@/components/jobs/JobsList";
import type { JobsListItem } from "@/lib/types/jobbridge";

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

    const guardianStatus = profile.guardian_status ?? "none";
    const canApply = !isMinor(profile.birthdate ?? null) || guardianStatus === "linked";

    const [jobsRes, appsRes] = await Promise.all([
        fetchJobs({
            mode: "feed",
            view,
            userId: profile.id,
            marketId: profile.market_id,
            status: ["open", "reserved"],
            limit: 50,
            offset: 0,
        }),
        fetchCandidateApplications(profile.id)
    ]);

    const rawActiveJobs: JobsListItem[] = jobsRes.ok ? jobsRes.data : [];
    const allApps = appsRes.ok ? appsRes.data : [];

    // Applied Jobs: 'submitted', 'pending', 'negotiating', 'accepted', AND 'waitlisted'
    const appliedJobs = allApps
        .filter(a => ['submitted', 'pending', 'negotiating', 'accepted', 'waitlisted'].includes(a.status))
        .map(a => {
            const richJob = rawActiveJobs.find(rj => rj.id === a.job?.id);
            return richJob ? { ...richJob, is_applied: true, application_status: a.status } : { ...a.job, is_applied: true, application_status: a.status };
        })
        .filter(j => !!j) as JobsListItem[];

    // Rejected/Withdrawn/Archived Applications could be interesting but usually not "Active"
    // For now, we focus on Active Apps.

    const appliedJobIds = new Set(appliedJobs.map(j => j.id));

    // Active Feed: ONLY Open jobs
    // EXCLUDING any job I already have an application for (waitlist or active)
    const allActiveJobs = rawActiveJobs.filter(job =>
        !appliedJobIds.has(job.id) &&
        job.status === 'open'
    );

    const localActiveJobs = allActiveJobs.filter(job => job.market_id === profile.market_id);
    const extendedActiveJobs = allActiveJobs.filter(job => job.market_id !== profile.market_id && job.reach === 'extended');

    // Waitlist Opportunities: Reserved jobs that I haven't applied to or waitlisted for
    const waitlistedJobs = rawActiveJobs.filter(job =>
        !appliedJobIds.has(job.id) &&
        job.status === 'reserved'
    );

    return (
        <div className="container mx-auto py-2 px-4 md:px-6">
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
                ) : (
                    <JobsList
                        localActiveJobs={localActiveJobs}
                        extendedActiveJobs={extendedActiveJobs}
                        waitlistedJobs={waitlistedJobs}
                        appliedJobs={appliedJobs}
                        isDemo={view.source === "demo"}
                        canApply={canApply}
                        guardianStatus={guardianStatus}
                    />
                )}
            </div>
        </div>
    );
}
