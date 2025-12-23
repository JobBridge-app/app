"use server";

import { supabaseServer } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

export async function updateApplicationStatus(applicationId: string, newStatus: 'accepted' | 'rejected') {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Nicht authentifiziert" };

    // Verify ownership of the job related to this application (implied by policy or explicit check)
    // We'll rely on RLS update policy policy "Provider update application status" or do explicit check

    const { data: app } = await supabase
        .from("applications")
        .select("user_id, status, job:jobs(posted_by, title)")
        .eq("id", applicationId)
        .single<any>();

    if (!app || app.job.posted_by !== user.id) {
        return { error: "Nicht berechtigt." };
    }

    const { error } = await supabase
        .from("applications")
        .update({ status: newStatus })
        .eq("id", applicationId);

    if (error) {
        console.error("Update Status Error", error);
        return { error: "Fehler beim Aktualisieren." };
    }

    // Notify Seeker
    const title = newStatus === 'accepted' ? "Glückwunsch! Zusage erhalten." : "Bewerbungsstatus aktualisiert";
    const body = newStatus === 'accepted'
        ? `Du hast eine Zusage für '${app.job.title}' erhalten!`
        : `Deine Bewerbung für '${app.job.title}' wurde abgelehnt.`;

    await (supabase.from("notifications") as any).insert({
        user_id: app.user_id,
        type: "application_status",
        title: title,
        body: body,
        data: { route: "/app-home/activity" }
    });

    revalidatePath("/app-home/applications");
    return { success: true };
}
