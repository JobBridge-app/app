import { requireCompleteProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CreateJobForm } from "@/components/jobs/CreateJobForm";
import { supabaseServer } from "@/lib/supabaseServer";
import { getEffectiveView } from "@/lib/dal/jobbridge";

type DefaultLocation = {
    id: string;
    public_label: string | null;
    address_line1: string | null;
    postal_code: string | null;
    city: string | null;
};

export default async function NewOfferPage() {
    const { profile } = await requireCompleteProfile();

    const viewRes = await getEffectiveView({ userId: profile.id, baseAccountType: profile.account_type });
    const viewRole = viewRes.ok ? viewRes.data.viewRole : (profile.account_type ?? "job_seeker");

    // Server-side guard to avoid "kurz sichtbar, dann weg" client redirects.
    if (viewRole !== "job_provider") {
        redirect("/app-home/jobs");
    }

    // Provider Verification Guard
    const isVerified = profile.provider_verification_status === 'verified';
    if (!isVerified) {
        const { VerificationRequiredGuard } = await import("@/components/jobs/VerificationRequiredGuard");
        return <VerificationRequiredGuard />;
    }

    const supabase = await supabaseServer();
    const { data: defaultLocationRaw } = await supabase.from("provider_locations" as never)
        .select("*")
        .eq("provider_id", profile.id)
        .eq("is_default", true)
        .maybeSingle();

    let defaultLocation = (defaultLocationRaw ?? null) as unknown as DefaultLocation | null;

    // Fallback: If no provider_location found, use the Profile Address (v13)
    if (!defaultLocation) {
        // We cast profile to any because 'street'/'house_number' might be missing from the strict type definition
        // but we confirmed they exist in the DB and are used in ProfileEditForm.
        const p = profile as any;
        if (p.street && p.city) {
            defaultLocation = {
                id: "profile-default",
                public_label: "Privatadresse",
                address_line1: `${p.street} ${p.house_number || ""}`.trim(),
                postal_code: p.zip || p.postal_code || "",
                city: p.city
            };
        }
    }

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 max-w-2xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Neuen Job erstellen</h1>
                <p className="text-slate-400">Suche nach Unterstützung in Rheinbach.</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
                <CreateJobForm defaultLocation={defaultLocation} />
            </div>
        </div>
    );
}
