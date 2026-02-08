import { requireCompleteProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { ProviderTabs } from "./components/ProviderTabs";
import { MyJobsView } from "./components/MyJobsView";
import { RegionView } from "./components/RegionView";
import { fetchJobs, getEffectiveView } from "@/lib/dal/jobbridge";
import { QueryDebugPanel } from "@/components/debug/QueryDebugPanel";
import type { JobsListItem } from "@/lib/types/jobbridge";

export default async function OffersPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { profile } = await requireCompleteProfile();

    const viewRes = await getEffectiveView({ userId: profile.id, baseAccountType: profile.account_type });
    if (!viewRes.ok) {
        return (
            <div className="container mx-auto py-8 px-4 md:px-6 max-w-6xl">
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
                    <p className="font-semibold">Fehler beim Bestimmen der Datenquelle/Rolle</p>
                    <p className="mt-2 text-sm font-mono break-words">
                        {viewRes.error.code ? `${viewRes.error.code}: ` : ""}{viewRes.error.message}
                    </p>
                    <QueryDebugPanel
                        title="Offers Debug"
                        summary={{ source: "unknown", role: "unknown" }}
                        debug={viewRes.debug}
                        error={viewRes.error}
                    />
                </div>
            </div>
        );
    }

    const effectiveView = viewRes.data;
    if (effectiveView.viewRole === "job_seeker") {
        redirect("/app-home/jobs");
    }

    const isDemo = effectiveView.source === "demo";

    // Determine View
    const params = await searchParams;
    const tab = typeof params.view === 'string' ? params.view : 'jobs';

    // Data Fetching
    let jobs: JobsListItem[] = [];
    let regionName = null;
    const regionId = profile.market_id;
    let jobsError: { code?: string; message: string } | null = null;
    let jobsDebug: Record<string, unknown> | null = null;

    if (tab === 'region') {
        const supabase = await supabaseServer();
        if (regionId) {
            const { data } = await supabase.from("regions_live").select("display_name").eq("id", regionId).single();
            if (data) regionName = data.display_name;
        }
    } else {
        const res = await fetchJobs({
            mode: "my_jobs",
            view: effectiveView,
            userId: profile.id,
            limit: 100,
            offset: 0,
        });

        jobsDebug = res.debug;
        if (res.ok) {
            jobs = res.data;
        } else {
            jobsError = { code: res.error.code, message: res.error.message };
        }
    }

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 max-w-6xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                        Meine Jobs
                    </h1>
                    <p className="text-slate-400">Verwalte deine Jobs für {isDemo ? "Demo User" : "Rheinbach"}.</p>
                </div>
                {/* Global 'New Job' button removed per requirements. Use internal CTA if needed or rely on tabs/empty states. */}
            </div>

            {/* Navigation Tabs */}
            <ProviderTabs />

            {/* Content Area */}
            <div className="min-h-[400px]">
                {tab === 'jobs' && (
                    jobsError ? (
                        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-10 text-center">
                            <p className="text-red-200 font-semibold">Jobs konnten nicht geladen werden.</p>
                            <p className="mt-2 text-xs text-red-200/80 font-mono break-words">
                                {jobsError.code ? `${jobsError.code}: ` : ""}{jobsError.message}
                            </p>
                            {jobsDebug && (
                                <QueryDebugPanel
                                    title="My Jobs Debug"
                                    summary={{ source: effectiveView.source, role: effectiveView.viewRole }}
                                    debug={jobsDebug}
                                    error={{ message: jobsError.message, code: jobsError.code }}
                                />
                            )}
                        </div>
                    ) : (
                        <>
                            <MyJobsView jobs={jobs} />
                            {jobsDebug && (
                                <QueryDebugPanel
                                    title="My Jobs Debug"
                                    summary={{ source: effectiveView.source, role: effectiveView.viewRole }}
                                    debug={jobsDebug}
                                />
                            )}
                        </>
                    )
                )}
                {tab === 'region' && <RegionView regionName={regionName || "Rheinbach"} />}
            </div>
        </div>
    );
}
