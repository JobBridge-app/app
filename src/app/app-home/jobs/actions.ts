"use server";

import { supabaseServer } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import { Profile } from "@/lib/types";

export async function applyToJob(jobId: string) {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Nicht authentifiziert" };
    }

    // Double check profile/verification
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();

    if (!profile || !profile.is_verified || profile.user_type !== "youth") {
        return { error: "Du bist nicht berechtigt, dich zu bewerben (Elternbestätigung fehlt)." };
    }

    // Get Job Owner ID
    const { data: job } = await supabase.from("jobs").select("posted_by, title").eq("id", jobId).single();

    const { error } = await supabase.from("applications").insert({
        job_id: jobId,
        user_id: user.id,
        status: "submitted",
        message: "Ich habe Interesse!" // Hardcoded for now, can be expandable
    });

    if (error) {
        if (error.code === '23505') return { error: "Du hast dich bereits beworben." }; // Unique violation
        console.error("Apply Error", error);
        return { error: "Fehler beim Bewerben." };
    }

    // Create Notification for Provider
    if (job && job.posted_by) {
        await (supabase.from("notifications") as any).insert({
            user_id: job.posted_by,
            type: "application_new",
            title: "Neue Bewerbung",
            body: `Jemand hat sich auf '${job.title}' beworben.`,
            data: { route: "/app-home/applications" }
        });
    }

    revalidatePath("/app-home/jobs");
    revalidatePath("/app-home/activity");
    return { success: true };
}
