import { requireCompleteProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import { Activity } from "lucide-react";
import { ApplicationsView } from "../offers/components/ApplicationsView";
import { Database } from "@/lib/types/supabase";

type ApplicationWithRelations = Database['public']['Tables']['applications']['Row'] & {
    job: { title: string } | null;
    applicant?: { full_name: string | null; city: string | null } | null;
};

export default async function ActivitiesPage() {
    const { profile } = await requireCompleteProfile();
    const isProvider = profile.user_type === "company";
    const supabase = await supabaseServer();

    let applications: ApplicationWithRelations[] = [];

    if (isProvider) {
        // Fetch provider's received applications
        const { data: myJobs } = await supabase.from("jobs").select("id").eq("posted_by", profile.id);
        const jobIds = myJobs?.map(j => j.id) || [];

        if (jobIds.length > 0) {
            const { data: apps } = await supabase
                .from("applications")
                .select("*, job:jobs(title), applicant:profiles!applicant_id(full_name, city)")
                .in("job_id", jobIds)
                .order("created_at", { ascending: false });

            if (apps) applications = apps as unknown as ApplicationWithRelations[];
        }
    } else {
        // Fetch seeker's sent applications
        const { data: apps } = await supabase
            .from("applications")
            .select("*, job:jobs(title), applicant:profiles!applicant_id(full_name, city)")
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false });
        if (apps) applications = apps as unknown as ApplicationWithRelations[];
    }

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 max-w-6xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                        Aktivitäten
                    </h1>
                    <p className="text-slate-400">
                        {isProvider ? "Bewerbungen und Ereignisse verwalten." : "Deine Bewerbungen und Status."}
                    </p>
                </div>
            </div>

            <div className="space-y-8">
                {/* Applications Section */}
                <section>
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        Bewerbungen
                        <span className="text-sm font-normal text-slate-500 bg-white/5 py-0.5 px-2 rounded-full border border-white/5">{applications.length}</span>
                    </h2>
                    <ApplicationsView applications={applications} />
                </section>

                {/* Events / Timeline Placeholder */}
                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">Ereignisse</h2>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
                        <p className="text-slate-400 text-sm">Keine weiteren Ereignisse.</p>
                    </div>
                </section>
            </div>
        </div>
    );
}
