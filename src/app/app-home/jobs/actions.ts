"use server";

import { supabaseServer } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import { Profile } from "@/lib/types";
import { getEffectiveView } from "@/lib/dal/jobbridge";
import { Database } from "@/lib/types/supabase";



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

    // All job seekers require an active guardian relationship (verification) before applying
    if (!hasActiveGuardian) {
        return { error: "Du bist nicht verifiziert und kannst dich nicht bewerben (Elternbestätigung fehlt)." };
    }

    // Get Job Owner ID
    const jobsTable: "jobs" | "demo_jobs" = view.source === "demo" ? "demo_jobs" : "jobs";
    const appsTable: "applications" | "demo_applications" = view.source === "demo" ? "demo_applications" : "applications";

    const { data: job, error: jobError } = await supabase.from(jobsTable).select("posted_by, title, status").eq("id", jobId).single();
    if (jobError) {
        console.error("Apply Job Load Error", jobError);
        return { error: "Job konnte nicht geladen werden." };
    }

    // Check for active negotiations or accepted applications to determine Waitlist status
    // NEW LOGIC: "First come, first served" / Reservation
    // If the job is OPEN, the first applicant gets "negotiating" status and the Job becomes "reserved".
    // Everyone else goes to "waitlisted".

    let initialStatus: Database["public"]["Enums"]["application_status"] = "waitlisted";
    let shouldReserveJob = false;

    // Logic:
    // 1. If Job is OPEN -> First applicant gets "negotiating" and Job becomes "reserved".
    // 2. If Job is RESERVED -> Applicant gets "waitlisted".
    // 3. If Job is CLOSED/FILLED/etc -> Blocked (handled by UI generally, but safety check below).

    // Force cast to any to handle potential type mismatch with DB types if not generated perfectly
    const currentJobStatus = (job as any)?.status;

    if (currentJobStatus === 'open') {
        initialStatus = "negotiating";
        shouldReserveJob = true;
    } else if (currentJobStatus === 'reserved') {
        initialStatus = "waitlisted";
    } else {
        // If closed, filled, reviewing, draft -> Block
        return { error: "Dieser Job nimmt derzeit keine Bewerbungen mehr an." };
    }

    // Insert Application
    const { error } = await supabase.from(appsTable).insert({
        job_id: jobId,
        user_id: user.id,
        status: initialStatus,
        message: message
    });

    if (error) {
        if (error.code === '23505') return { error: "Du hast dich bereits beworben." };
        console.error("Apply Error", error);
        return { error: "Fehler beim Bewerben." };
    }

    // Reserve the job if applicable
    if (shouldReserveJob) {
        // We use a safe update - only if it's still open
        const { error: updateError } = await supabase
            .from(jobsTable)
            .update({ status: 'reserved' })
            .eq('id', jobId)
            .eq('status', 'open');

        // If update failed (race condition), we might want to downgrade the application to waitlisted?
        // For simplicity/MVP, we'll assume it worked or the race is rare. 
        // Ideally we'd do this in a transaction/RPC.
        if (updateError) {
            console.error("Failed to reserve job", updateError);
            // Self-healing: Determine if we really got it or not?
            // For now, proceed.
        }
    }

    if (error) {
        if ((error as any).code === '23505') return { error: "Du hast dich bereits beworben." };
        console.error("Apply Error", error);
        return { error: "Fehler beim Bewerben." };
    }

    // Create Notification for Provider
    // Create Notification for Provider
    if (job && job.posted_by) {
        const isWaitlist = initialStatus === "waitlisted";
        await supabase.from("notifications").insert({
            user_id: job.posted_by,
            type: "application_new",
            title: isWaitlist ? "Neuer Wartelisten-Eintrag" : "Neue Bewerbung",
            body: isWaitlist
                ? `Jemand hat sich auf die Warteliste für '${job.title}' gesetzt.`
                : `Jemand hat sich auf '${job.title}' beworben.`,
            data: { route: "/app-home/applications" }
        });
    }

    revalidatePath("/app-home/jobs");
    revalidatePath("/app-home/activities");
    return { success: true };
}
