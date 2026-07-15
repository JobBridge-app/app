"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";

type ApplicationPayload = {
    ok?: boolean;
    error?: string;
    application?: Record<string, unknown>;
    is_primary?: boolean;
    queue_position?: number;
};

export async function applyToJob(formData: FormData | string) {
    const jobId = typeof formData === "string"
        ? formData
        : String(formData.get("jobId") ?? "");
    const inputMessage = typeof formData === "string"
        ? "Ich interessiere mich für diesen Job."
        : String(formData.get("message") ?? "").trim();
    const message = inputMessage || "Ich interessiere mich für diesen Job.";

    if (!jobId) return { error: "Job nicht gefunden." };
    if (message.length < 3) return { error: "Bitte schreibe eine kurze Bewerbungsnachricht." };
    if (message.length > 1200) return { error: "Die Bewerbungsnachricht darf höchstens 1.200 Zeichen lang sein." };

    const supabase = await supabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: "Nicht authentifiziert." };

    const { data, error } = await (supabase.rpc as any)("submit_job_application", {
        p_job_id: jobId,
        p_message: message,
    });
    const payload = (data ?? {}) as ApplicationPayload;

    if (error) {
        console.error("Atomic application RPC failed:", error);
        return { error: "Die Bewerbung konnte nicht gesendet werden." };
    }
    if (payload.ok === false) return { error: payload.error || "Die Bewerbung konnte nicht gesendet werden." };

    revalidatePath("/app-home/jobs");
    revalidatePath("/app-home/activities");
    revalidatePath("/app-home/offers");

    return {
        success: true,
        application: payload.application,
        isPrimary: Boolean(payload.is_primary),
        queuePosition: payload.queue_position,
    };
}
