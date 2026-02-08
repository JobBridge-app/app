import { requireCompleteProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getEffectiveView } from "@/lib/dal/jobbridge";

export default async function ApplicationsPage() {
    const { profile } = await requireCompleteProfile();

    const viewRes = await getEffectiveView({ userId: profile.id, baseAccountType: profile.account_type });
    const viewRole = viewRes.ok ? viewRes.data.viewRole : (profile.account_type ?? "job_seeker");

    if (viewRole === "job_seeker") {
        redirect("/app-home/activity");
    }

    // Providers should use the Hub
    redirect("/app-home/offers?view=applications");
}
