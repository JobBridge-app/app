"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Briefcase, FileText, Map } from "lucide-react";

export function ProviderTabs() {
    const searchParams = useSearchParams();
    const view = searchParams.get("view") || "jobs";

    const tabs = [
        { id: "jobs", label: "Meine Jobs", icon: Briefcase },
        { id: "region", label: "Region & Sichtbarkeit", icon: Map },
    ];

    return (
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl w-full md:w-fit mb-8 border border-white/5 overflow-x-auto">
            {tabs.map((tab) => {
                const isActive = view === tab.id;
                return (
                    <Link
                        key={tab.id}
                        href={`/app-home/offers?view=${tab.id}`}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                            isActive
                                ? "bg-white/10 text-white shadow-sm ring-1 ring-white/5"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <tab.icon size={16} className={isActive ? "text-indigo-400" : "text-slate-500"} />
                        {tab.label}
                    </Link>
                );
            })}
        </div>
    );
}
