"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { ActivityCommandCenter } from "@/components/activity/ActivityCommandCenter";
import { sendMessage, withdrawApplication } from "@/app/app-home/applications/actions";

interface ActivitiesPageClientProps {
    applications: any[];
    userId: string;
}

export function ActivitiesPageClient({ applications, userId }: ActivitiesPageClientProps) {
    const router = useRouter();
    void userId;

    const handleWithdraw = async (applicationId: string, reason: string) => {
        const result = await withdrawApplication(applicationId, reason);
        if (result?.error) throw new Error(result.error);

        startTransition(() => {
            router.refresh();
        });
    };

    return (
        <ActivityCommandCenter
            applications={applications}
            role="seeker"
            onSendMessage={sendMessage}
            onWithdraw={handleWithdraw}
        />
    );
}
