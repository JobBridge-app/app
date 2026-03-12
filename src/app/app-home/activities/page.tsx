import { supabaseServer } from "@/lib/supabaseServer";
import type { Database } from "@/lib/types/supabase";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ActivitiesPageClient } from "@/components/activity/ActivitiesPageClient";
import { ProviderActivityList } from "@/components/activity/ProviderActivityList";
import { getAppHomeSnapshot } from "@/lib/app-shell";

export default async function ActivityPage() {
    const snapshot = await getAppHomeSnapshot();
    const profile = snapshot.profile;
    const viewRole = snapshot.effectiveView.viewRole;
    const source = snapshot.effectiveView.source;

    const supabase = await supabaseServer();
    const appsTable: "applications" | "demo_applications" = source === "demo" ? "demo_applications" : "applications";
    const jobsRelation: "jobs" | "demo_jobs" = source === "demo" ? "demo_jobs" : "jobs";

    let client = supabase;
    try {
        const admin = getSupabaseAdminClient();
        if (admin) client = admin;
    } catch (e) {
        console.warn("Admin client not available for activity page", e);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // JOB PROVIDER VIEW (Incoming Applications)
    // ─────────────────────────────────────────────────────────────────────────────
    if (viewRole === "job_provider") {
        // Fetch applications where the related JOB is posted by this user
        // We use !inner join on jobs to filter by posted_by
        const { data, error } = await client
            .from(appsTable)
            .select(`
                *,
                job:${jobsRelation}!inner(
                    title, 
                    status, 
                    posted_by
                ),
                applicant:profiles!user_id(
                    id,
                    full_name,
                    bio,
                    skills,
                    interests,
                    city,
                    country,
                    birthdate,
                    created_at,
                    avatar_url,
                    provider_verification_status,
                    user_system_roles(role:system_roles(name))
                )
            `)
            .eq(`${jobsRelation}.posted_by`, profile.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Provider activity fetch error:", error);
            return (
                <div className="container mx-auto py-12 px-4 text-red-400">
                    Fehler beim Laden der Aktivitäten.
                </div>
            );
        }

        // Type assertion to ensure compatibility with ProviderActivityList
        const applications: any[] = (data ?? []).map((row: any) => ({
            ...row,
            job: Array.isArray(row.job) ? row.job[0] : row.job, // Handle potential array return from join
            applicant: Array.isArray(row.applicant) ? row.applicant[0] : row.applicant
        }));

        return (
            <div className="container mx-auto py-12 px-4 md:px-6">
                <div className="mx-auto max-w-6xl space-y-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Eingehende Bewerbungen</h1>
                            <p className="text-slate-400">Verwalte Bewerbungen und kommuniziere direkt mit Talenten.</p>
                        </div>
                    </div>
                    {/* @ts-ignore - Supabase types are tricky with joins, verified manually */}
                    <ProviderActivityList applications={applications} userId={profile.id} />
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // JOB SEEKER VIEW (My Applications) - EXISTING LOGIC
    // ─────────────────────────────────────────────────────────────────────────────

    type ActivityApp = Database["public"]["Tables"]["applications"]["Row"] & {
        job: { title: string; description: string; status: Database["public"]["Enums"]["job_status"] } | null;
        message?: string | null;
    };

    const { data } = await client
        .from(appsTable)
        .select(`
            *,
            job:${jobsRelation}(
                *,
                creator:profiles!jobs_posted_by_fkey(
                    full_name, 
                    company_name, 
                    account_type, 
                    avatar_url,
                    bio,
                    city,
                    provider_verification_status,
                    user_system_roles(role:system_roles(name))
                )
            )
        `)
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

    // Cast the specific joined data to a type that includes the full job with creator
    type AppWithFullJob = Database["public"]["Tables"]["applications"]["Row"] & {
        job: (Database["public"]["Tables"]["jobs"]["Row"] & {
            creator?: {
                full_name: string | null;
                company_name: string | null;
                account_type: Database["public"]["Enums"]["account_type"] | null;
            } | null;
        }) | null;
    };

    const applications = (data ?? []) as unknown as AppWithFullJob[];

    return (
        <div className="container mx-auto py-6 px-4 md:px-6 h-[calc(100vh-80px)] overflow-hidden flex flex-col">
            <div className="mb-6 shrink-0">
                <h1 className="text-2xl font-bold tracking-tight text-white">Deine Aktivitäten</h1>
            </div>

            <ActivitiesPageClient applications={applications} userId={profile.id} />
        </div>
    );
}
