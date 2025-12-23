"use server";

import { requireCompleteProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import { getDemoStatus } from "@/lib/demo";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { JobStatus } from "@/lib/types";
import { createJobService } from "@/lib/services/jobs";

export async function createJob(prevState: any, formData: FormData) {
    const { profile } = await requireCompleteProfile();
    const { isEnabled: isDemo } = await getDemoStatus(profile.id);

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const wage = parseFloat(formData.get("wage") as string) || 0;

    // Market defaults
    const marketId = profile.market_id;

    if (!title || !marketId) {
        return { error: "Titel und Markt sind erforderlich." };
    }

    const { error } = await createJobService(
        profile.id,
        {
            posted_by: profile.id,
            market_id: marketId,
            title,
            description,
            wage_hourly: wage,
            status: 'open',
            category: 'other', // Default to 'other' until UI supports selection
            address_reveal_policy: 'after_apply', // Default policy
            public_location_label: 'Rheinbach', // Default location label
        },
        null, // No private params in this form yet
        isDemo
    );

    if (error) return { error };

    revalidatePath("/app-home/offers");
    redirect("/app-home/offers");
}
