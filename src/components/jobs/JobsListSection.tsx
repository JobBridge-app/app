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
        <div className={cn("jobs-section space-y-7", hiddenOnMobile ? "hidden lg:block" : "")}>
            <div className="jobs-section-heading-row flex items-center gap-4">
                <h2 className={cn("jobs-section-heading flex min-w-0 items-center gap-3 text-2xl font-bold tracking-[-0.01em]", isWhiteTitle ? "text-white" : colorClass)}>
                    {Icon && (
                        <div className={cn("jobs-section-icon rounded-xl border p-2.5", isWhiteTitle ? "border-white/10 bg-white/10 text-indigo-400" : "border-white/10 bg-white/5")}>
                            <Icon size={20} />
                        </div>
                    )}
                    <span className="truncate">{title}</span>
                    <span className="jobs-section-count rounded-full bg-white/10 px-3 py-1 text-sm font-semibold tracking-normal text-slate-400">
                        {jobs.length}
                    </span>
                </h2>
                <div className="jobs-section-rule hidden h-px flex-1 bg-gradient-to-r from-white/10 via-white/[0.04] to-transparent md:block" />
            </div>

            <div className="jobs-card-grid grid grid-cols-1 gap-6 lg:grid-cols-2">
                {jobs.length === 0 ? (
                    <div className="jobs-empty-state col-span-full rounded-2xl border border-dashed border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent py-12 text-center">
                        <div className="text-slate-400">{emptyMsg}</div>
                    </div>
                ) : (
                    jobs.map(job => (
                        <div
                            key={job.id}
                            className="job-card-shell relative min-w-0"
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
