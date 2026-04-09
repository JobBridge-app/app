"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const segmentLabels: Record<string, string> = {
    staff: "Dashboard",
    statistics: "Statistiken",
    users: "Users",
    jobs: "Jobs",
    applications: "Applications",
    moderation: "Moderation",
    activity: "Activity",
    drops: "Drops",
    roles: "Roles",
    communications: "Communications",
    demo: "Demo Mode",
};

function isUuid(segment: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
}

function formatSegment(segment: string) {
    if (isUuid(segment)) return segment.slice(0, 8) + "…";
    return segmentLabels[segment] ?? segment;
}

export function AdminBreadcrumb() {
    const pathname = usePathname();
    const segments = pathname.split("/").filter(Boolean);

    // Build breadcrumb trail: [{label, href}]
    const crumbs = segments.map((seg, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const label = formatSegment(seg);
        return { label, href };
    });

    if (crumbs.length === 0) return null;

    return (
        <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
            {crumbs.map((crumb, index) => {
                const isLast = index === crumbs.length - 1;
                return (
                    <span key={crumb.href} className="flex items-center gap-1">
                        {index > 0 && (
                            <ChevronRight size={13} className="text-slate-600 shrink-0" />
                        )}
                        {isLast ? (
                            <span className="font-medium text-white truncate max-w-[120px]">
                                {crumb.label}
                            </span>
                        ) : (
                            <Link
                                href={crumb.href}
                                className="text-slate-500 hover:text-slate-300 transition-colors truncate max-w-[80px]"
                            >
                                {crumb.label}
                            </Link>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}
