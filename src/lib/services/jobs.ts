import { supabaseServer } from "@/lib/supabaseServer";
import { getTable } from "@/lib/demo";
import { JobStatus } from "@/lib/types";

export type CreateJobParams = {
    posted_by: string;
    market_id: string;
    title: string;
    description: string;
    wage_hourly: number;
    status: JobStatus;
    category: string;
    address_reveal_policy?: 'after_apply' | 'after_accept';
    public_location_label?: string;
    public_lat?: number;
    public_lng?: number;
};

export type JobPrivateParams = {
    address_full?: string;
    private_lat?: number;
    private_lng?: number;
    notes?: string;
};

export async function createJobService(
    userId: string,
    jobParams: CreateJobParams,
    privateParams: JobPrivateParams | null,
    isDemo: boolean
) {
    const supabase = await supabaseServer();
    const jobTable = getTable("jobs", isDemo);

    // 1. Prepare Payload (filter for Demo if needed)
    let payload = { ...jobParams };

    if (isDemo) {
        // demo_jobs table has limited columns
        const {
            category,
            address_reveal_policy,
            public_location_label,
            public_lat,
            public_lng,
            ...demoPayload
        } = payload;
        payload = demoPayload as any;
    }

    // 2. Insert Job
    // 2. Insert Job
    const { data: jobData, error: jobError } = await supabase
        .from(jobTable as any)
        .insert([payload])
        .select()
        .single();

    if (jobError) return { error: jobError.message };
    if (!jobData) return { error: "Failed to create job" };

    // 2. Insert Private Details (if provided)
    if (privateParams) {
        const detailsTable = getTable("job_private_details", isDemo);
        const { error: detailsError } = await supabase
            .from(detailsTable as any)
            .insert([{
                job_id: (jobData as any).id,
                ...privateParams
            }]);

        if (detailsError) {
            // Optional: Rollback job (manual delete) if strict atomicity needed, 
            // but for MVP logging error is okay-ish or returning it.
            return { error: `Job created but details failed: ${detailsError.message}`, job: jobData };
        }
    }

    return { data: jobData };
}

export async function getProviderJobsService(userId: string, isDemo: boolean) {
    const supabase = await supabaseServer();
    const table = getTable("jobs", isDemo);

    const { data, error } = await supabase
        .from(table as any)
        .select("*")
        .eq("posted_by", userId)
        .order("created_at", { ascending: false });

    if (error) return { error: error.message };
    return { data };
}

export async function getJobByIdService(jobId: string, isDemo: boolean) {
    const supabase = await supabaseServer();
    const table = getTable("jobs", isDemo);

    const { data, error } = await supabase
        .from(table as any)
        .select("*")
        .eq("id", jobId)
        .single();

    if (error) return { error: error.message };
    return { data };
}
