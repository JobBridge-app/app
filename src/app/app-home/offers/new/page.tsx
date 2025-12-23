import { requireCompleteProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CreateJobForm } from "@/components/jobs/CreateJobForm";

export default async function NewOfferPage() {
    const { profile } = await requireCompleteProfile();

    if (profile.user_type !== "company") {
        redirect("/app-home/jobs");
    }

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 max-w-2xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Neuen Job erstellen</h1>
                <p className="text-slate-400">Suche nach Unterstützung in Rheinbach.</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
                <CreateJobForm userId={profile.id} marketId={profile.market_id || "rheinbach_fix"} />
            </div>
        </div>
    );
}
