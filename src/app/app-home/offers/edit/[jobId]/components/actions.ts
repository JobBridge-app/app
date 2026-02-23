"use server";

import { requireCompleteProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/types/supabase";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function updateJobAction(jobId: string, formData: FormData) {
    const { profile } = await requireCompleteProfile();

    // Extract data
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const wage_hourly = parseFloat(formData.get("wage_hourly") as string);
    const status = formData.get("status") as Database["public"]["Enums"]["job_status"];
    const reach = (formData.get("reach") as string) || "internal_rheinbach";
    const category = formData.get("category") as string;
    const payment_type = (formData.get("payment_type") as "hourly" | "fixed") || "hourly";

    // Validate (basic)
    if (!title || !description || isNaN(wage_hourly)) {
        return { success: false, error: "Bitte fülle alle Pflichtfelder aus." };
    }

    const supabase = await supabaseServer();

    // Verify ownership first (security)
    // Use regular client for ownership check as it respects RLS for 'select' usually, or simple query
    const { data: existingJob } = await supabase
        .from("jobs")
        .select("posted_by")
        .eq("id", jobId)
        .single();

    if (!existingJob || existingJob.posted_by !== profile.id) {
        return { success: false, error: "Du hast keine Berechtigung, diesen Job zu bearbeiten." };
    }

    // Update using Admin Client to bypass RLS on UPDATE if necessary
    const adminClient = getSupabaseAdminClient() || supabase;
    const { error } = await adminClient
        .from("jobs")
        .update({
            title,
            description,
            wage_hourly,
            category,
            payment_type,
            status,
            reach,
            updated_at: new Date().toISOString()
        })
        .eq("id", jobId);

    if (error) {
        console.error("Job update error:", error);
        return { success: false, error: "Datenbankfehler beim Speichern." };
    }

    revalidatePath("/app-home/offers");
    revalidatePath(`/app-home/offers/${jobId}`);

    return { success: true };
}
