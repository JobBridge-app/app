"use server";

import { supabaseServer } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

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

    // Authoritative account fields are written atomically by the database.
    let accountType: "job_seeker" | "job_provider" = "job_seeker";
    let providerKind: "private" | "company" | null = null;

    if (data.role === "company") {
        accountType = "job_provider";
        providerKind = "company";
    } else if (data.role === "adult") {
        accountType = "job_provider";
        providerKind = "private";
    }

    const { data: result, error } = await supabase.rpc("complete_profile_onboarding", {
        p_full_name: data.full_name,
        p_birthdate: data.birthdate,
        p_city: data.city,
        p_market_id: data.market_id,
        p_account_type: accountType,
        p_provider_kind: providerKind,
        p_company_name: data.role === "company" ? data.company_name ?? null : null,
        p_company_contact_email: data.role === "company" ? data.company_email ?? null : null,
        p_company_message: data.role === "company" ? data.company_message ?? null : null,
    });

    if (error) {
        console.error("Onboarding Error:", error);
        return { error: "Fehler beim Speichern des Profils." };
    }

    const response = result && typeof result === "object" && !Array.isArray(result)
        ? result as { ok?: boolean; error?: string }
        : null;

    if (!response?.ok) {
        const messages: Record<string, string> = {
            profile_already_complete: "Dein Profil wurde bereits eingerichtet.",
            seeker_age_out_of_range: "Ein Jobsuchenden-Konto ist für Jugendliche von 14 bis 20 Jahren vorgesehen.",
            provider_must_be_adult: "Ein Anbieter-Konto ist erst ab 18 Jahren möglich.",
            invalid_birthdate: "Bitte prüfe dein Geburtsdatum.",
            invalid_market: "Bitte wähle einen gültigen Standort.",
            company_name_required: "Bitte gib den Namen des Unternehmens an.",
            invalid_company_email: "Bitte prüfe die Kontakt-E-Mail des Unternehmens.",
        };

        return {
            error: messages[response?.error ?? ""] ?? "Das Profil konnte nicht eingerichtet werden.",
        };
    }

    // Force cache revalidation to ensure the layout updates
    revalidatePath("/", "layout");
    revalidatePath("/app-home", "layout");

    return { success: true };
}
