"use client";

import { useState } from "react";
import { JobCard } from "@/components/jobs/JobCard";
import { JobDetailModal } from "@/components/jobs/JobDetailModal";
import type { Database } from "@/lib/types/supabase";

type JobRow = Database['public']['Tables']['jobs']['Row'] & {
    market_name?: string | null;
    public_location_label?: string | null;
    distance_km?: number | null;
};

interface JobsListProps {
    jobs: JobRow[];
    isDemo: boolean;
    canApply: boolean;
    guardianStatus: string;
}

export function JobsList({ jobs, isDemo, canApply, guardianStatus }: JobsListProps) {
    const [selectedJob, setSelectedJob] = useState<JobRow | null>(null);

    return (
        <>
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {jobs.map((job) => (
                    <JobCard
                        key={job.id}
                        job={job}
                        isDemo={isDemo}
                        onClick={() => setSelectedJob(job)}
                    />
                ))}
            </div>

            <JobDetailModal
                job={selectedJob}
                isOpen={!!selectedJob}
                onClose={() => setSelectedJob(null)}
                canApply={canApply}
                guardianStatus={guardianStatus}
            />
        </>
    );
}
