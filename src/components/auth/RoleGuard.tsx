"use client";

import { Profile } from "@/lib/types";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function RoleGuard({ profile }: { profile: Profile | null }) {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!profile) return;

        const accountType = profile.account_type;

        const isJobsPath = pathname === "/app-home/jobs" || pathname === "/app-home/jobs/";
        const isOffersPath = pathname.startsWith("/app-home/offers");

        if (accountType === "job_provider" && isJobsPath) {
            router.replace("/app-home/offers");
            return;
        }

        if (accountType === "job_seeker" && isOffersPath) {
            router.replace("/app-home/jobs");
            return;
        }

    }, [pathname, profile, router]);

    return null;
}
