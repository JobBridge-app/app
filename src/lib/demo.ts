import { supabaseServer } from "@/lib/supabaseServer";

export async function getDemoStatus(userId: string) {
    const supabase = await supabaseServer();
    const { data } = await (supabase.from("demo_sessions") as any)
        .select("enabled, demo_view")
        .eq("user_id", userId)
        .single();

    return {
        isEnabled: data?.enabled || false,
        view: data?.demo_view || 'job_seeker'
    };
}

export function getTable(tableName: string, isDemo: boolean): string {
    if (!isDemo) return tableName;
    return `demo_${tableName}`;
}

export const DEMO_TABLES = {
    JOBS: 'demo_jobs',
    APPLICATIONS: 'demo_applications',
    PRIVATE_DETAILS: 'demo_job_private_details',
    SETTINGS: 'demo_settings'
} as const;
