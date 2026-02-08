"use server";

import { supabaseServer } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createJob as createJobDAL, getEffectiveView, retrySaveJobPrivateDetails } from "@/lib/dal/jobbridge";
import type { ErrorInfo } from "@/lib/types/jobbridge";
import type { AccountType } from "@/lib/types";

const createJobSchema = z.object({
    title: z.string().min(5, "Titel muss mindestens 5 Zeichen lang sein."),
    description: z.string().min(20, "Beschreibung muss mindestens 20 Zeichen lang sein."),
    address_full: z.string().optional(),
    wage: z.number().optional(),
    lat: z.string().optional(),
    lng: z.string().optional(),
});

type CreateJobActionState =
    | null
    | { status: "error"; error: ErrorInfo; debug?: Record<string, unknown> }
    | { status: "partial"; jobId: string; error: ErrorInfo; debug?: Record<string, unknown> };

export async function createJob(_prevState: CreateJobActionState, formData: FormData) {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        const state: CreateJobActionState = { status: "error", error: { message: "Nicht authentifiziert" } };
        return state;
    }

    const intent = (formData.get("intent") as string | null) ?? "create";
    const existingJobId = (formData.get("job_id") as string | null) ?? null;

    // Get User Profile for Market ID
    const { data: profile } = await supabase.from("profiles").select("market_id, account_type").eq("id", user.id).single();

    let marketId = profile?.market_id;

    if (!marketId) {
        // Fallback: Fetch "Rheinbach" market
        const { data: defaultMarket } = await supabase.from("markets" as never).select("id").ilike("name", "%Rheinbach%").maybeSingle();
        marketId = (defaultMarket as unknown as { id?: string } | null)?.id;
    }

    if (!marketId) {
        // Ultimate fallback if even DB fetch fails (should not happen in prod)
        const state: CreateJobActionState = { status: "error", error: { message: "Systemfehler: Kein Markt zuweisbar." } };
        return state;
    }

    const baseAccountType = (profile as unknown as { account_type?: AccountType | null } | null)?.account_type ?? null;
    const viewRes = await getEffectiveView({ userId: user.id, baseAccountType });
    if (!viewRes.ok) {
        const state: CreateJobActionState = { status: "error", error: viewRes.error, debug: viewRes.debug };
        return state;
    }

    const view = viewRes.data;
    const isDemo = view.source === "demo";

    if (view.viewRole !== "job_provider") {
        const state: CreateJobActionState = { status: "error", error: { message: "Nicht berechtigt: Nur Jobanbieter können Jobs erstellen." } };
        return state;
    }

    const useDefault = formData.get("use_default_location") === "true";
    let addressFull = formData.get("address_full") as string;
    let locationId: string | null = null;
    let publicLabel = isDemo ? "[DEMO] Rheinbach" : "Rheinbach (Zentrum)"; // Fallback

    if (useDefault) {
        // Fetch default location
        const { data: defLocRaw } = await supabase.from("provider_locations" as never)
            .select("id, address_line1, postal_code, city, public_label")
            .eq("provider_id", user.id)
            .eq("is_default", true)
            .maybeSingle();
        const defLoc = defLocRaw as unknown as {
            id: string;
            address_line1: string;
            postal_code: string;
            city: string;
            public_label: string | null;
        } | null;

        if (defLoc) {
            addressFull = `${defLoc.address_line1}, ${defLoc.postal_code} ${defLoc.city}`;
            locationId = defLoc.id;
            publicLabel = defLoc.public_label || publicLabel;
        } else {
            const state: CreateJobActionState = { status: "error", error: { message: "Kein Standard-Ort gefunden. Bitte Adresse eingeben." } };
            return state;
        }
    } else {
        if (!addressFull || addressFull.length < 5) {
            const state: CreateJobActionState = { status: "error", error: { message: "Bitte gib eine Adresse ein oder wähle Standard-Ort." } };
            return state;
        }
    }

    const rawData = {
        title: (formData.get("title") as string)?.trim(),
        description: (formData.get("description") as string)?.trim(),
        address_full: addressFull,
        wage: parseFloat(formData.get("wage") as string) || 12.00,
        lat: "50.625",
        lng: "6.945",
    };

    const validated = createJobSchema.safeParse(rawData);

    if (!validated.success) {
        const state: CreateJobActionState = { status: "error", error: { message: validated.error.issues[0].message } };
        return state;
    }

    const privateDetails = {
        address_full: validated.data.address_full || null,
        private_lat: 50.6255,
        private_lng: 6.9455,
        notes: "Private Access Only",
        location_id: locationId
    };

    // Retry-only path: job already exists, only (re)save private details.
    if (intent === "retry_private_details") {
        if (!existingJobId) {
            const state: CreateJobActionState = { status: "error", error: { message: "Fehlender job_id für Retry." } };
            return state;
        }

        const retryRes = await retrySaveJobPrivateDetails({ jobId: existingJobId, privateDetails });
        if (!retryRes.ok) {
            const state: CreateJobActionState = { status: "partial", jobId: existingJobId, error: retryRes.error, debug: retryRes.debug };
            return state;
        }

        revalidatePath("/app-home/offers");
        revalidatePath("/app-home/jobs");
        redirect("/app-home/offers");
    }

    const res = await createJobDAL({
        view,
        userId: user.id,
        job: {
            posted_by: user.id,
            market_id: marketId,
            title: validated.data.title,
            description: validated.data.description,
            wage_hourly: validated.data.wage ?? 12.00,
            status: "open",
            category: "other",
            public_location_label: publicLabel,
            public_lat: 50.63,
            public_lng: 6.95,
            address_reveal_policy: "after_apply"
        },
        privateDetails,
    });

    if (!res.ok) {
        const state: CreateJobActionState = { status: "error", error: res.error, debug: res.debug };
        return state;
    }

    if (res.data.outcome === "partial") {
        const state: CreateJobActionState = { status: "partial", jobId: res.data.jobId, error: res.data.privateError, debug: res.debug };
        return state;
    }

    revalidatePath("/app-home/offers");
    revalidatePath("/app-home/jobs");
    redirect("/app-home/offers");
}
