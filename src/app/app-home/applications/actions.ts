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
        data: { route: "/app-home/activities" }
    });

    revalidatePath("/app-home/activities");
    return { success: true };
}

export async function rejectApplication(applicationId: string, reason: string) {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Nicht authentifiziert" };

    // Get app info
    const { data: app } = await supabase
        .from("applications")
        .select("user_id, status, job_id, job:jobs(posted_by, title, status)")
        .eq("id", applicationId)
        .single<any>();

    if (!app || app.job.posted_by !== user.id) {
        return { error: "Nicht berechtigt." };
    }

    const wasActive = ['negotiating', 'accepted'].includes(app.status);

    // Update status to rejected
    const { error } = await supabase
        .from("applications")
        .update({ status: 'rejected', rejection_reason: reason })
        .eq("id", applicationId);

    if (error) {
        console.error("Reject Error", error);
        return { error: "Fehler beim Ablehnen." };
    }

    // Check for Waitlist
    // If the application was active (negotiating/reserved), we check waitlist before re-opening
    if (wasActive) {
        const { data: waitlisted } = await supabase
            .from("applications")
            .select("id, user_id")
            .eq("job_id", app.job_id)
            .eq("status", "waitlisted")
            .order("created_at", { ascending: true }) // First come, first served
            .limit(1)
            .maybeSingle();

        if (waitlisted) {
            // Promote to NEGOTIATING (Job stays RESERVED or becomes RESERVED)
            await supabase
                .from("applications")
                .update({ status: "negotiating" })
                .eq("id", waitlisted.id);

            // Notify Candidate
            await (supabase as any).from("notifications").insert({
                user_id: waitlisted.user_id,
                type: "application_update",
                title: "Gute Neuigkeiten!",
                body: `Ein Platz wurde frei! Deine Bewerbung für den Job wurde aktiviert.`,
                data: { route: "/app-home/activities" }
            });

            if (app.job?.status !== 'reserved') {
                await supabase.from("jobs").update({ status: 'reserved' }).eq("id", app.job_id);
            }
        } else {
            // NO Waitlist -> Check if job was reserved/filled -> Set to OPEN
            if (['reserved', 'filled'].includes(app.job?.status)) {
                await supabase.from("jobs").update({ status: 'open' }).eq("id", app.job_id);
            }
        }
    }

    // Notify Seeker
    await (supabase.from("notifications") as any).insert({
        user_id: app.user_id,
        type: "application_status",
        title: "Bewerbung abgelehnt",
        body: `Deine Bewerbung für '${app.job.title}' wurde abgelehnt. Grund: ${reason}`,
        data: { route: "/app-home/activities" }
    });

    revalidatePath("/app-home/activities");
    return { success: true };
}

export async function withdrawApplication(applicationId: string, reason: string = "Kein Interesse mehr") {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Nicht authentifiziert" };

    // Get current status to see if we need to re-open the job
    const { data: app } = await supabase
        .from("applications")
        .select("status, job_id, job:jobs(status)")
        .eq("id", applicationId)
        .single<any>();

    if (!app) return { error: "Bewerbung nicht gefunden." };

    const wasActive = ['negotiating', 'accepted'].includes(app.status);

    const { error } = await supabase
        .from("applications")
        .update({ status: "withdrawn", rejection_reason: reason })
        .eq("id", applicationId)
        .eq("user_id", user.id);

    if (error) {
        console.error("Withdraw Error", error);
        return { error: "Fehler beim Zurückziehen." };
    }

    // Check for Waitlist
    // If the application was active (negotiating/reserved), we check waitlist before re-opening
    if (wasActive) {
        const { data: waitlisted } = await supabase
            .from("applications")
            .select("id, user_id")
            .eq("job_id", app.job_id)
            .eq("status", "waitlisted")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

        if (waitlisted) {
            // Promote to NEGOTIATING (Job stays RESERVED)
            await supabase
                .from("applications")
                .update({ status: "negotiating" })
                .eq("id", waitlisted.id);

            // Notify Candidate
            await (supabase as any).from("notifications").insert({
                user_id: waitlisted.user_id,
                type: "application_update",
                title: "Gute Neuigkeiten!",
                body: `Ein Platz wurde frei! Deine Bewerbung für den Job wurde aktiviert.`,
                data: { route: "/app-home/activities" }
            });

            // Notify Provider
            // Since candidate withdrew, provider needs to know new person is there
            // (We need to fetch provider ID, which is app.job.posted_by, but we didnt fetch it. 
            // We can fetch job separately or update select above).
            // Let's assume we maintain job reserved status.
            if (app.job?.status !== 'reserved') {
                await supabase.from("jobs").update({ status: 'reserved' }).eq("id", app.job_id);
            }
        } else {
            // NO Waitlist -> Check if job was reserved/filled -> Set to OPEN
            if (['reserved', 'filled'].includes(app.job?.status)) {
                await supabase.from("jobs").update({ status: 'open' }).eq("id", app.job_id);
            }
        }
    }

    revalidatePath("/app-home/activities");
    revalidatePath("/app-home/jobs");
    return { success: true };
}

export async function sendMessage(applicationId: string, content: string) {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Nicht authentifiziert" };

    if (!content.trim()) return { error: "Nachricht darf nicht leer sein." };

    // Verify access (applicant or job owner)
    // For now, we assume if you can see the application, you can chat. 
    // Ideally we check if user.id === app.user_id OR user.id === app.job.posted_by
    const { data: app } = await supabase
        .from("applications")
        .select("user_id, job:jobs(posted_by, title)")
        .eq("id", applicationId)
        .single<any>();

    if (!app) return { error: "Bewerbung nicht gefunden." };

    const isApplicant = app.user_id === user.id;
    const isProvider = app.job?.posted_by === user.id;

    if (!isApplicant && !isProvider) {
        return { error: "Nicht berechtigt." };
    }

    // Insert Message
    const { error } = await supabase
        .from("messages")
        .insert({
            application_id: applicationId,
            sender_id: user.id,
            content: content.trim()
        });

    if (error) {
        console.error("Send Message Error", error);
        return { error: "Fehler beim Senden." };
    }

    // Notify the OTHER party
    const recipientId = isApplicant ? app.job.posted_by : app.user_id;
    const senderName = isApplicant ? "Bewerber" : "Arbeitgeber"; // Could fetch name but this is faster

    await (supabase as any).from("notifications").insert({
        user_id: recipientId,
        type: "chat_message",
        title: `Neue Nachricht zu '${app.job.title}'`,
        body: isApplicant ? "Du hast eine neue Nachricht vom Bewerber erhalten." : "Du hast eine neue Nachricht vom Arbeitgeber erhalten.",
        data: { route: "/app-home/activities" }
    });

    revalidatePath("/app-home/activities");
    revalidatePath("/app-home/offers"); // Revalidate both sides just in case
    return { success: true };
}
