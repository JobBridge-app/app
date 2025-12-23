
import { requireCompleteProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { ApplicationCard } from "@/components/applications/ApplicationCard"; // Will need to create this client component for actions

export default async function ApplicationsPage() {
    const { profile } = await requireCompleteProfile();

    if (profile.user_type === "youth") {
        redirect("/app-home/activity");
    }

    // Providers should use the Hub
    redirect("/app-home/offers?view=applications");
}

