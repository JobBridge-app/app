import { requireCompleteProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import { notFound, redirect } from "next/navigation";
import { EditJobForm } from "./components/EditJobForm";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditJobPage({
    params
}: {
    params: Promise<{ jobId: string }>
}) {
    const { jobId } = await params;
    const { profile } = await requireCompleteProfile();

    const supabase = await supabaseServer();
    const { data: job, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .single();

    if (error || !job) {
        notFound();
    }

    if (job.posted_by !== profile.id) {
        return (
            <div className="mx-auto w-full max-w-xl px-4 py-20 text-center">
                <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-8 shadow-[var(--shadow-card)]">
                    <h1 className="text-2xl font-semibold text-[var(--danger)]">Zugriff verweigert</h1>
                    <p className="mt-2 text-[var(--text-muted)]">Du kannst nur deine eigenen Jobs bearbeiten.</p>
                    <Link href="/app-home/offers" className="mt-7 inline-block">
                    <Button variant="secondary">Zurück</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const { data: region } = await supabase.from("regions_live")
        .select("display_name")
        .eq("id", profile.market_id as string)
        .single();
    const marketName = region?.display_name || "deiner Stadt";

    return (
        <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:py-8">
            <div className="mb-6">
                <Link
                    href="/app-home/offers"
                    className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-medium text-[var(--text-muted)] outline-none transition-[color,transform] duration-150 ease-out hover:text-[var(--text-strong)] active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-[var(--brand)] motion-reduce:transition-none motion-reduce:active:scale-100"
                >
                    <ArrowLeft size={16} />
                    <span>Zurück zu meinen Jobs</span>
                </Link>
                <h1 className="text-balance text-3xl font-semibold tracking-tight text-[var(--text-strong)] md:text-4xl">Job bearbeiten</h1>
                <p className="mt-2 text-sm text-[var(--text-muted)]">Passe die Angaben an. Bestehende Bewerbungen bleiben erhalten.</p>
            </div>

            <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-card)] md:p-8">
                <EditJobForm job={job} marketName={marketName} />
            </div>
        </div>
    );
}
