"use server";

import { supabaseServer } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDemoStatus, getTable } from "@/lib/demo";

const createJobSchema = z.object({
    title: z.string().min(5, "Titel muss mindestens 5 Zeichen lang sein."),
    description: z.string().min(20, "Beschreibung muss mindestens 20 Zeichen lang sein."),
    address_full: z.string().min(5, "Bitte gib eine Adresse an"),
    lat: z.string().optional(),
    lng: z.string().optional(),
});

export async function createJob(prevState: any, formData: FormData) {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Nicht authentifiziert" };
    }

    const { isEnabled: isDemo } = await getDemoStatus(user.id);

    // Get User Profile for Market ID
    const { data: profile } = await (supabase.from("profiles") as any).select("market_id").eq("id", user.id).single();
    if (!profile?.market_id) {
        return { error: "Kein Markt ausgewählt. Bitte Profil aktualisieren." };
    }

    const rawData = {
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        address_full: formData.get("address_full") as string,
        lat: "50.625",
        lng: "6.945",
    };

    const validated = createJobSchema.safeParse(rawData);

    if (!validated.success) {
        return { error: validated.error.issues[0].message };
    }

    const jobsTable = getTable("jobs", isDemo);

    // Insert Job
    const { data: job, error: jobError } = await (supabase.from(jobsTable) as any).insert({
        title: validated.data.title,
        description: validated.data.description,
        posted_by: user.id,
        status: "open",
        market_id: profile.market_id,
        public_location_label: isDemo ? "[DEMO] Rheinbach" : "Rheinbach (Zentrum)",
        public_lat: 50.63,
        public_lng: 6.95,
        address_reveal_policy: "after_apply"
    }).select().single();

    if (jobError || !job) {
        console.error("Create Job Error:", jobError);
        return { error: "Fehler beim Erstellen des Inserats." };
    }

    // Insert Private Details (Skip for Demo to avoid complex FK issues for MVP)
    if (!isDemo) {
        const { error: privateError } = await (supabase.from("job_private_details") as any).insert({
            job_id: job.id,
            address_full: validated.data.address_full,
            private_lat: 50.6255,
            private_lng: 6.9455,
            notes: "Private Access Only"
        });

        if (privateError) {
            console.error("Create Private Details Error:", privateError);
            // Attempt rollback
            await supabase.from("jobs").delete().eq("id", job.id);
            return { error: "Fehler beim Speichern der Details." };
        }
    }

    revalidatePath("/app-home/offers");
    redirect("/app-home/offers");
}
