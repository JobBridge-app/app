import { redirect } from "next/navigation";
import { fetchJobs, fetchCandidateApplications } from "@/lib/dal/jobbridge";
import { JobsList } from "@/components/jobs/JobsList";
import type { ApplicationStatus, JobsListItem } from "@/lib/types/jobbridge";
import { getAppHomeSnapshot } from "@/lib/app-shell";
import { AppRouteReady } from "@/components/layout/AppNavigationProvider";

const APPLIED_APPLICATION_STATUSES = new Set<ApplicationStatus>([
    "submitted",
    "negotiating",
    "accepted",
]);

const WAITLIST_APPLICATION_STATUSES = new Set<ApplicationStatus>([
    "waitlisted",
]);

const VISIBLE_APPLICATION_STATUSES = new Set<ApplicationStatus>([
    "submitted",
    "negotiating",
    "accepted",
    "waitlisted",
]);

export default async function JobsPage() {
    const snapshot = await getAppHomeSnapshot();
    const profile = snapshot.profile;
    const view = snapshot.effectiveView;
    if (view.viewRole === "job_provider") {
        redirect("/app-home/offers");
    }

    const userCoordinates = { lat: profile.lat ?? null, lng: profile.lng ?? null };
    const [jobsRes, appsRes] = await Promise.all([
        fetchJobs({
            mode: "feed",
            view,
            userId: profile.id,
            marketId: profile.market_id,
            userCoordinates,
            includeApplicationState: false,
            status: ["open", "reserved"],
            limit: 50,
            offset: 0,
        }),
        fetchCandidateApplications(profile.id, { userCoordinates })
    ]);

    const rawActiveJobs: JobsListItem[] = jobsRes.ok ? jobsRes.data : [];
    const allApps = appsRes.ok ? appsRes.data : [];
    const activeJobsById = new Map(rawActiveJobs.map((job) => [job.id, job]));

    const mapApplicationToJob = (application: (typeof allApps)[number]): JobsListItem | null => {
        if (!application.job) return null;
        const richJob = activeJobsById.get(application.job.id);
        return richJob
            ? { ...richJob, is_applied: true, application_status: application.status }
            : { ...application.job, is_applied: true, application_status: application.status };
    };

    // Applied jobs are active application conversations. Waitlist entries live in the waitlist tab.
    const appliedJobs = allApps
        .filter((application) => APPLIED_APPLICATION_STATUSES.has(application.status))
        .map(mapApplicationToJob)
        .filter((job): job is JobsListItem => Boolean(job));

    const userWaitlistedJobs = allApps
        .filter((application) => WAITLIST_APPLICATION_STATUSES.has(application.status))
        .map(mapApplicationToJob)
        .filter((job): job is JobsListItem => Boolean(job));

    const visibleApplicationJobIds = new Set(
        allApps
            .filter((application) => VISIBLE_APPLICATION_STATUSES.has(application.status))
            .map((application) => application.job?.id)
            .filter((jobId): jobId is string => Boolean(jobId))
    );

    /*
     * Waitlist tab:
     * - own waitlist entries first
     * - then reserved jobs where the user has no active/waitlist application yet
     */
    const waitlistedJobs = [
        ...userWaitlistedJobs,
        ...rawActiveJobs.filter((job) =>
            job.status === "reserved" &&
            !visibleApplicationJobIds.has(job.id)
        ),
    ];

    // Rejected/Withdrawn/Archived Applications could be interesting, but they should not hide open jobs here.
    const appliedJobIds = visibleApplicationJobIds;

    // Active Feed: ONLY open jobs, excluding jobs with an active or waitlist application.
    const allActiveJobs = rawActiveJobs.filter(job =>
        !appliedJobIds.has(job.id) &&
        job.status === 'open'
    );

    const localActiveJobs = allActiveJobs.filter(job => job.market_id === profile.market_id);
    const extendedActiveJobs = allActiveJobs.filter(job => job.market_id !== profile.market_id && job.reach === 'extended');

    return (
        <div className="jobs-home-surface container mx-auto py-2 px-4 md:px-6">
            <AppRouteReady href="/app-home/jobs" />
            <div className="mx-auto max-w-[78rem] space-y-8">
                <div className="jobs-home-heading">
                    <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">
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
                        isDemo={snapshot.isDemo}
                        canApply={snapshot.canApply}
                        guardianStatus={snapshot.guardianStatus}
                    />
                )}
            </div>
        </div>
    );
}
