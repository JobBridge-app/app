import { requireCompleteProfile } from "@/lib/auth";
import { getJobByIdService } from "@/lib/services/jobs";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, MapPin, Banknote } from "lucide-react";
import { Database } from "@/lib/types/supabase";
import { getEffectiveView, fetchJobApplications } from "@/lib/dal/jobbridge";
import { ApplicantList } from "@/components/offers/ApplicantList";
import { ApplicationRow } from "@/lib/types/jobbridge";

type JobRow = Database['public']['Tables']['jobs']['Row'];

export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
    const { jobId } = await params;
    const { profile } = await requireCompleteProfile();

    const viewRes = await getEffectiveView({ userId: profile.id, baseAccountType: profile.account_type });
    const viewRole = viewRes.ok ? viewRes.data.viewRole : (profile.account_type ?? "job_seeker");
    const isDemo = viewRes.ok ? (viewRes.data.source === "demo") : false;

    if (viewRole !== "job_provider") {
        redirect("/app-home/jobs");
    }

    const { data, error } = await getJobByIdService(jobId, isDemo);

    if (error || !data) {
        notFound();
    }

    const job = data as unknown as JobRow;

    // Ownership check
    if (job.posted_by !== profile.id) {
        // unauthorized for editing/viewing as owner
        redirect("/app-home/offers");
    }

    // Fetch Applications
    const appRes = await fetchJobApplications(jobId, profile.id);
    const applications = appRes.ok ? appRes.data : [];

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 max-w-4xl">
            <Link href="/app-home/offers" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft size={18} />
                <span>Zurück zu meinen Jobs</span>
            </Link>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">{job.title}</h1>
                        <div className="flex flex-wrap items-center gap-4 text-slate-400 text-sm">
                            <span className="flex items-center gap-1.5">
                                <Clock size={16} />
                                Erstellt am {new Date(job.created_at).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Banknote size={16} />
                                {job.wage_hourly} € / h
                            </span>
                            <span className="flex items-center gap-1.5">
                                <MapPin size={16} />
                                {job.public_location_label}
                            </span>
                        </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${job.status === 'open' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                        job.status === 'closed' ? 'bg-slate-500/10 border-slate-500/30 text-slate-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        }`}>
                        {job.status === 'open' ? 'Aktiv' : job.status === 'closed' ? 'Geschlossen' : job.status}
                    </span>
                </div>

                <div className="prose prose-invert max-w-none">
                    <h3 className="text-lg font-semibold text-white mb-2">Beschreibung</h3>
                    <p className="text-slate-300 whitespace-pre-wrap leading-relaxed mb-8">{job.description}</p>
                </div>
            </div>

            {/* Application Management Section */}
            <div className="mt-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    Bewerbungen
                    <span className="text-sm font-normal text-slate-400 bg-white/5 px-3 py-1 rounded-full">{applications?.length || 0}</span>
                </h2>
                <ApplicantList applications={applications || []} />
            </div>


        </div>
    );
}
