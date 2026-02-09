"use server";

import { supabaseServer } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import { Profile } from "@/lib/types";
import { getEffectiveView } from "@/lib/dal/jobbridge";

function isMinor(birthdate: string | null): boolean {
    if (!birthdate) return true;
    const d = new Date(birthdate);
    if (Number.isNaN(d.getTime())) return true;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age < 18;
}

export async function applyToJob(formData: FormData | string) {
    // Determine if input is formData or just ID (legacy support/direct call)
    let jobId: string;
    let message: string = "Ich habe Interesse!";

    if (typeof formData === 'string') {
        jobId = formData;
    } else {
        jobId = formData.get("jobId") as string;
        const msgInput = formData.get("message") as string;
        if (msgInput && msgInput.trim().length > 0) {
            message = msgInput.trim();
        }
    }

    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Nicht authentifiziert" };
    }

    // Double check profile/verification
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
    const viewRes = await getEffectiveView({ userId: user.id, baseAccountType: profile?.account_type ?? null });
    if (!viewRes.ok) {
        return { error: `${viewRes.error.code ? `${viewRes.error.code}: ` : ""}${viewRes.error.message}` };
    }
    const view = viewRes.data;

    if (!profile || view.viewRole !== "job_seeker") {
        return { error: "Du bist nicht berechtigt, dich zu bewerben." };
    }

    // Check effective guardian status (Self-healing)
    // CRITICAL: We enforce that an ACTUAL relationship exists.
    // If the profile says "linked" but no relationship is found, we deny the application.
    const { count } = await (supabase as any)
        .from("guardian_relationships")
        .select("*", { count: 'exact', head: true })
        .eq("child_id", user.id)
        .eq("status", "active");

    const hasActiveGuardian = count !== null && count > 0;

    // If minor and no active guardian, block
    if (isMinor(profile.birthdate ?? null) && !hasActiveGuardian) {
        return { error: "Du bist nicht berechtigt, dich zu bewerben (Elternbestätigung fehlt)." };
    }

    // Get Job Owner ID
    const jobsTable: "jobs" | "demo_jobs" = view.source === "demo" ? "demo_jobs" : "jobs";
    const appsTable: "applications" | "demo_applications" = view.source === "demo" ? "demo_applications" : "applications";

    const { data: job, error: jobError } = await supabase.from(jobsTable).select("posted_by, title").eq("id", jobId).single();
    if (jobError) {
        console.error("Apply Job Load Error", jobError);
        return { error: "Job konnte nicht geladen werden." };
    }

    const { error } = await supabase.from(appsTable).insert({
        job_id: jobId,
        user_id: user.id,
        status: "submitted",
        message: message
    });

    if (error) {
        if (error.code === '23505') return { error: "Du hast dich bereits beworben." }; // Unique violation
        console.error("Apply Error", error);
        return { error: "Fehler beim Bewerben." };
    }

    // Create Notification for Provider
    if (job && job.posted_by) {
        await supabase.from("notifications").insert({
            user_id: job.posted_by,
            type: "application_new",
            title: "Neue Bewerbung",
            body: `Jemand hat sich auf '${job.title}' beworben.`,
            data: { route: "/app-home/applications" }
        });
    }

    revalidatePath("/app-home/jobs");
    revalidatePath("/app-home/activities");
    return { success: true };
}
