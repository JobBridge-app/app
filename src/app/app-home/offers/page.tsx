import { requireCompleteProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getDemoStatus } from "@/lib/demo";
import { Database } from "@/lib/types/supabase";
import { ProviderTabs } from "./components/ProviderTabs";
import { MyJobsView } from "./components/MyJobsView";
import { getProviderJobsService } from "@/lib/services/jobs";
import { RegionView } from "./components/RegionView";

type JobRow = Database['public']['Tables']['jobs']['Row'];

export default async function OffersPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { profile } = await requireCompleteProfile();

    if (profile.user_type !== "company") {
        redirect("/app-home/jobs");
    }

    const { isEnabled: isDemo } = await getDemoStatus(profile.id);

    // Determine View
    const params = await searchParams;
    const view = typeof params.view === 'string' ? params.view : 'jobs';

    // Data Fetching
    let jobs: JobRow[] = [];
    let regionName = null;
    let regionId = profile.market_id;

    if (view === 'region') {
        const supabase = await supabaseServer();
        if (regionId) {
            const { data } = await supabase.from("regions_live").select("display_name").eq("id", regionId).single();
            if (data) regionName = data.display_name;
        }
    } else {
        // Default: Jobs
        const { data, error } = await getProviderJobsService(profile.id, isDemo);
        if (data) {
            jobs = data as unknown as JobRow[];
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
                {view === 'jobs' && <MyJobsView jobs={jobs} />}
                {view === 'region' && <RegionView regionName={regionName || "Rheinbach"} />}
            </div>
        </div>
    );
}

