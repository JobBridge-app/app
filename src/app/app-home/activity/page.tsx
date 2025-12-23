
import { requireCompleteProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import Link from "next/link";
import { ButtonPrimary } from "@/components/ui/ButtonPrimary"; // Optional usage

export default async function ActivityPage() {
    const { profile } = await requireCompleteProfile();

    if (profile.user_type !== "youth") {
        redirect("/app-home/offers");
    }

    const supabase = await supabaseServer();
    const { data: applications } = await supabase
        .from("applications")
        .select(`
    *,
    job: jobs(
        title,
        description,
        status
    )
        `)
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .returns<any[]>(); // Temporary loose typing to bypass inference issues, or verify explicit Application[] type if joined

    // Calculate stats
    const total = applications?.length || 0;
    const accepted = applications?.filter(a => a.status === 'accepted').length || 0;
    const rejected = applications?.filter(a => a.status === 'rejected').length || 0;

    return (
        <div className="container mx-auto py-12 px-4 md:px-6">
            <div className="mx-auto max-w-4xl space-y-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Deine Aktivitäten</h1>
                </div>

                {/* Summary Chips */}
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                    <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl flex flex-col items-center min-w-[120px]">
                        <span className="text-2xl font-bold text-white mb-1">{total}</span>
                        <span className="text-xs text-slate-400 uppercase tracking-wider">Beworben</span>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-2xl flex flex-col items-center min-w-[120px]">
                        <span className="text-2xl font-bold text-emerald-400 mb-1">{accepted}</span>
                        <span className="text-xs text-emerald-200/70 uppercase tracking-wider">Zusage</span>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 px-6 py-3 rounded-2xl flex flex-col items-center min-w-[120px]">
                        <span className="text-2xl font-bold text-red-400 mb-1">{rejected}</span>
                        <span className="text-xs text-red-200/70 uppercase tracking-wider">Absage</span>
                    </div>
                </div>

                {(!applications || applications.length === 0) ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-sm">
                        <p className="text-slate-300">Du hast dich noch nirgends beworben.</p>
                        <div className="mt-6">
                            <Link href="/app-home/jobs">
                                <span className="text-blue-400 hover:text-blue-300 hover:underline">Finde jetzt einen Job</span>
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {applications.map((app: any) => (
                            <div key={app.id} className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm hover:bg-white/8 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-1">
                                            {app.job?.title || "Unbekannter Job"}
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            Beworben am {new Date(app.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div>
                                        {app.status === 'submitted' && <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">Offen</span>}
                                        {app.status === 'accepted' && <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-full border border-emerald-500/30">Zusage</span>}
                                        {app.status === 'rejected' && <span className="px-3 py-1 bg-red-500/20 text-red-300 text-xs rounded-full border border-red-500/30">Absage</span>}
                                    </div>
                                </div>

                                {app.status === 'accepted' && (
                                    <div className="flex justify-end">
                                        <Link href="/app-home/messages">
                                            <button className="text-sm bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-white transition-colors">
                                                Chat öffnen
                                            </button>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

