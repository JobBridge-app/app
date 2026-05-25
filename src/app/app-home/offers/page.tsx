import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { MyJobsView } from "./components/MyJobsView";
import { fetchJobs } from "@/lib/dal/jobbridge";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ApplicationStatus, DataSource, JobsListItem } from "@/lib/types/jobbridge";
import { getAppHomeSnapshot } from "@/lib/app-shell";
import type { ProviderJobApplicationSummary } from "./components/MyJobsView";

type ApplicationSummaryRow = {
    job_id: string;
    status: ApplicationStatus;
    created_at: string;
};

const ACTIONABLE_APPLICATION_STATUSES = new Set<ApplicationStatus>([
    "submitted",
    "negotiating",
    "accepted",
    "waitlisted",
]);

async function fetchApplicationSummaries(
    jobIds: string[],
    source: DataSource,
): Promise<Record<string, ProviderJobApplicationSummary> | null> {
    if (jobIds.length === 0) return {};

    const supabase = await supabaseServer();
    let client: typeof supabase | ReturnType<typeof getSupabaseAdminClient> = supabase;
    try {
        client = getSupabaseAdminClient();
    } catch {
        client = supabase;
    }

    const table = source === "demo" ? "demo_applications" : "applications";
    const { data, error } = await (client.from(table) as any)
        .select("job_id, status, created_at")
        .in("job_id", jobIds);

    if (error || !data) return null;

    const summaries: Record<string, ProviderJobApplicationSummary> = {};

    for (const item of data as ApplicationSummaryRow[]) {
        const current = summaries[item.job_id] ?? {
            total: 0,
            attention: 0,
            submitted: 0,
            latestAt: null,
        };

        current.total += 1;
        if (ACTIONABLE_APPLICATION_STATUSES.has(item.status)) current.attention += 1;
        if (item.status === "submitted") current.submitted += 1;
        if (!current.latestAt || new Date(item.created_at) > new Date(current.latestAt)) {
            current.latestAt = item.created_at;
        }

        summaries[item.job_id] = current;
    }

    return summaries;
}

export default async function OffersPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const snapshot = await getAppHomeSnapshot();
    const profile = snapshot.profile;
    const effectiveView = snapshot.effectiveView;
    if (effectiveView.viewRole === "job_seeker") {
        redirect("/app-home/jobs");
    }

    const params = await searchParams;
    if (params.view === "region") {
        redirect("/app-home/offers");
    }
    if (params.view === "applications") {
        redirect("/app-home/activities");
    }

    let jobs: JobsListItem[] = [];
    let regionName: string | null = snapshot.market?.display_name || snapshot.market?.brand_prefix || null;
    const regionId = profile.market_id;
    let jobsError: { code?: string; message: string } | null = null;
    let applicationSummaries: Record<string, ProviderJobApplicationSummary> | null = {};

    const res = await fetchJobs({
        mode: "my_jobs",
        view: effectiveView,
        userId: profile.id,
        userCoordinates: { lat: profile.lat ?? null, lng: profile.lng ?? null },
        includeApplicationState: false,
        limit: 100,
        offset: 0,
    });

    if (res.ok) {
        jobs = res.data;
        applicationSummaries = await fetchApplicationSummaries(
            jobs.map((job) => job.id),
            effectiveView.source,
        );
    } else {
        jobsError = { code: res.error.code, message: res.error.message };
    }

    const marketLabel = regionName || "deiner Region";

    return (
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
            <div className="mb-7 md:mb-9">
                <div className="max-w-2xl">
                    <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">Jobs</h1>
                </div>
            </div>

            <div className="min-h-[400px]">
                {jobsError ? (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-10 text-center">
                        <p className="text-red-200 font-semibold">Jobs konnten nicht geladen werden.</p>
                        <p className="mt-2 text-xs text-red-200/80 font-mono break-words">
                            {jobsError.code ? `${jobsError.code}: ` : ""}{jobsError.message}
                        </p>
                    </div>
                ) : (
                    <MyJobsView
                        jobs={jobs}
                        marketName={marketLabel}
                        isVerified={snapshot.isVerified}
                        applicationSummaries={applicationSummaries}
                    />
                )}
            </div>
        </div>
    );
}
