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
    const isVerified = profile.provider_verification_status === 'verified' || Boolean(profile.provider_verified_at);
    if (!isVerified) {
        redirect("/app-home/profile?focus=provider-verification&from=create-job");
    }

    const supabase = await supabaseServer();
    const { data: defaultLocations } = await supabase.from("provider_locations" as never)
        .select("*")
        .eq("provider_id", profile.id)
        .eq("is_default", true)
        .limit(1);

    const defaultLocationRaw = defaultLocations?.[0];

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

    // Fetch market_name to dynamically display reach text
    const { data: region } = await supabase.from("regions_live")
        .select("display_name")
        .eq("id", profile.market_id as string)
        .single();
    const marketName = region?.display_name || "deiner Stadt";

    return (
        <div className="container mx-auto max-w-3xl px-4 py-8 md:px-6">
            <div className="mb-8">
                <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">Neuen Job erstellen</h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-400">
                    Suche nach Unterstützung in {marketName}.
                </p>
            </div>

            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/48 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:p-7 md:p-8">
                <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-indigo-200/60 to-transparent" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(99,102,241,0.09),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.035),transparent_28%)]" />
                <div className="relative">
                <CreateJobForm defaultLocation={defaultLocation} marketName={marketName} />
                </div>
            </div>
        </div>
    );
}
