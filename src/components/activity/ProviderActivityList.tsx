"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { ActivityCommandCenter } from "@/components/activity/ActivityCommandCenter";
import { rejectApplication, sendMessage } from "@/app/app-home/applications/actions";
import type { Database } from "@/lib/types/supabase";

export type ProviderApplication = Database["public"]["Tables"]["applications"]["Row"] & {
    applicant?: (Database["public"]["Tables"]["profiles"]["Row"] & { avatar_url?: string | null }) | null;
    job?: {
        id: string;
        title: string;
        status: Database["public"]["Enums"]["job_status"];
    } | null;
};

export function ProviderActivityList({
    applications,
    userId,
    selectedJobId,
    selectedJobTitle,
}: {
    applications: ProviderApplication[];
    userId: string;
    selectedJobId?: string | null;
    selectedJobTitle?: string | null;
}) {
    const router = useRouter();
    void userId;

    const handleReject = async (applicationId: string, reason: string) => {
        const result = await rejectApplication(applicationId, reason);
        if (result?.error) throw new Error(result.error);

        startTransition(() => {
            router.refresh();
        });
    };

    return (
        <ActivityCommandCenter
            applications={applications}
            role="provider"
            selectedJobId={selectedJobId}
            selectedJobTitle={selectedJobTitle}
            onSendMessage={sendMessage}
            onReject={handleReject}
        />
    );
}
