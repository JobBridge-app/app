import { memo } from "react";
import { JobCard } from "@/components/jobs/JobCard";
import { cn } from "@/lib/utils";
import type { JobsListItem } from "@/lib/types/jobbridge";

interface SectionProps {
    title: string;
    icon?: any;
    colorClass: string;
    jobs: JobsListItem[];
    emptyMsg: React.ReactNode;
    hiddenOnMobile?: boolean;
    isWhiteTitle?: boolean;
    isDemo: boolean;
    canApply: boolean;
    hideStatusLabel?: boolean;
    isExtendedSection?: boolean;
    onSelect: (job: JobsListItem) => void;
}

export const JobsListSection = memo(function JobsListSection({
    title,
    icon: Icon,
    colorClass,
    jobs,
    emptyMsg,
    hiddenOnMobile,
    isWhiteTitle,
    isDemo,
    canApply,
    hideStatusLabel,
    isExtendedSection,
    onSelect
}: SectionProps) {
    return (
        <div className={cn("jobs-section space-y-6", hiddenOnMobile ? "hidden lg:block" : "")}>
            <h2 className={cn("jobs-section-heading flex items-center gap-3 text-xl font-bold", isWhiteTitle ? "text-white" : colorClass)}>
                {Icon && (
                    <div className={cn("jobs-section-icon rounded-lg border p-2", isWhiteTitle ? "bg-white/10 border-white/10 text-indigo-400" : "bg-white/5 border-white/10")}>
                        <Icon size={20} />
                    </div>
                )}
                {title}
                <span className="jobs-section-count ml-auto rounded-full bg-white/10 px-2.5 py-0.5 text-sm font-medium text-slate-400 lg:ml-2">
                    {jobs.length}
                </span>
            </h2>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {jobs.length === 0 ? (
                    <div className="jobs-empty-state col-span-full rounded-2xl border border-dashed border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent py-12 text-center">
                        <div className="text-slate-400">{emptyMsg}</div>
                    </div>
                ) : (
                    jobs.map(job => (
                        <div
                            key={job.id}
                            style={{
                                contentVisibility: "auto",
                                containIntrinsicSize: "320px",
                            }}
                        >
                            <JobCard
                                job={job}
                                isDemo={isDemo}
                                isApplied={title === 'Bereits Beworben'}
                                isLocked={!canApply}
                                hideStatusLabel={hideStatusLabel}
                                isCrossRegionalBadge={isExtendedSection}
                                onSelect={onSelect}
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
});
