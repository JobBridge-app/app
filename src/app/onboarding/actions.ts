"use server";

import { supabaseServer } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Profile } from "@/lib/types";

export type OnboardingData = {
    full_name: string;
    birthdate: string;
    city: string;
    market_id: string | null;
    role: "youth" | "adult" | "company";
    company_name?: string;
    company_email?: string;
    company_message?: string;
};

export async function completeOnboarding(data: OnboardingData) {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Keine aktive Session gefunden." };
    }

    // Map onboarding role to DB types
    let account_type = "job_seeker";
    let provider_kind = null;

    if (data.role === "company") {
        account_type = "job_provider";
        provider_kind = "company";
    } else if (data.role === "adult") {
        account_type = "job_provider";
        provider_kind = "private";
    }

    // Prepare payload
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
        id: user.id,
        full_name: data.full_name,
        birthdate: data.birthdate,
        city: data.city,
        market_id: data.market_id,
        account_type,
        provider_kind,
        company_name: data.role === "company" ? data.company_name : null,
        company_contact_email: data.role === "company" ? data.company_email : null,
        company_message: data.role === "company" ? data.company_message : null,
        updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
        .from("profiles")
        .upsert(payload)
        .select()
        .single();

    if (error) {
        console.error("Onboarding Error:", error);
        return { error: "Fehler beim Speichern des Profils." };
    }

    // Force cache revalidation to ensure the layout updates
    revalidatePath("/", "layout");
    revalidatePath("/app-home", "layout");

    return { success: true };
}
