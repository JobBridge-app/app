import { supabaseServer } from "@/lib/supabaseServer";

export async function getJobByIdService(jobId: string) {
    const supabase = await supabaseServer();
    const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();

    if (error) return { data: null, error: error.message };
    if (!data) return { data: null, error: "Job nicht gefunden." };
    return { data, error: null };
}
