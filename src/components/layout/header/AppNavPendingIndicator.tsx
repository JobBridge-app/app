"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

export function AppNavPendingIndicator({
    className,
}: {
    className?: string;
}) {
    const { pending } = useLinkStatus();

    return (
        <span
            aria-hidden="true"
            data-pending={pending ? "true" : "false"}
            className={cn("app-nav-pending-indicator", className)}
        />
    );
}
