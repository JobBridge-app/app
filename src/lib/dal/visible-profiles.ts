import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountType, ProviderVerificationStatus } from "@/lib/types";
import type { Database } from "@/lib/types/supabase";

const PROFILE_RPC_BATCH_SIZE = 100;

export type VisibleJobCreatorSummary = {
    job_id: string;
    creator_id: string;
    full_name: string | null;
    company_name: string | null;
    account_type: AccountType | null;
    avatar_url: string | null;
    bio: string | null;
    city: string | null;
    country: string | null;
    created_at: string | null;
    provider_verification_status: ProviderVerificationStatus | null;
    is_staff: boolean;
};

export type ActivityPartnerProfile = {
    application_id: string;
    profile_id: string;
    full_name: string | null;
    company_name: string | null;
    account_type: AccountType | null;
    avatar_url: string | null;
    bio: string | null;
    city: string | null;
    country: string | null;
    skills: string | null;
    interests: string | null;
    created_at: string | null;
    provider_verification_status: ProviderVerificationStatus | null;
    age_years: number | null;
    is_staff: boolean;
};

function uniqueIds(values: string[]) {
    return [...new Set(values.filter(Boolean))];
}

function batches(values: string[]) {
    const unique = uniqueIds(values);
    return Array.from(
        { length: Math.ceil(unique.length / PROFILE_RPC_BATCH_SIZE) },
        (_, index) => unique.slice(index * PROFILE_RPC_BATCH_SIZE, (index + 1) * PROFILE_RPC_BATCH_SIZE),
    );
}

async function fetchBatchedProfiles<T>(
    client: SupabaseClient<Database>,
    rpcName: "get_visible_job_creator_summaries" | "get_activity_partner_profiles",
    argumentName: "p_job_ids" | "p_application_ids",
    ids: string[],
) {
    const idBatches = batches(ids);
    if (idBatches.length === 0) return { data: [] as T[], error: null as { message: string } | null };

    const results = await Promise.all(idBatches.map((batch) => (
        rpcName === "get_visible_job_creator_summaries" && argumentName === "p_job_ids"
            ? client.rpc("get_visible_job_creator_summaries", { p_job_ids: batch })
            : client.rpc("get_activity_partner_profiles", { p_application_ids: batch })
    )));
    const failed = results.find((result) => result.error);
    if (failed?.error) return { data: [] as T[], error: failed.error as { message: string } };

    return {
        data: results.flatMap((result) => (result.data ?? []) as T[]),
        error: null,
    };
}

export function fetchVisibleJobCreatorSummaries(
    client: SupabaseClient<Database>,
    jobIds: string[],
) {
    return fetchBatchedProfiles<VisibleJobCreatorSummary>(
        client,
        "get_visible_job_creator_summaries",
        "p_job_ids",
        jobIds,
    );
}

export function fetchActivityPartnerProfiles(
    client: SupabaseClient<Database>,
    applicationIds: string[],
) {
    return fetchBatchedProfiles<ActivityPartnerProfile>(
        client,
        "get_activity_partner_profiles",
        "p_application_ids",
        applicationIds,
    );
}
