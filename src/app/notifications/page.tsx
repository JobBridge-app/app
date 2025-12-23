import { requireCompleteProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";

export default async function NotificationsPage() {
    const { profile } = await requireCompleteProfile();
    const supabase = await supabaseServer();

    // Mark all as read on visit (optional logic, maybe manual interaction is better, but user requested "open /notifications")
    // Let's just list them.

    const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(50);

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-2xl font-bold text-white mb-6">Alle Benachrichtigungen</h1>

            <div className="space-y-4 max-w-2xl">
                {!notifications || notifications.length === 0 ? (
                    <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10 text-slate-400">
                        Keine Benachrichtigungen vorhanden.
                    </div>
                ) : (
                    notifications.map((n) => (
                        <div key={n.id} className={`p-4 rounded-2xl border transition ${n.read_at ? 'bg-white/5 border-white/5 opacity-70' : 'bg-white/10 border-indigo-500/30'}`}>
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-semibold text-white">{n.title}</h3>
                                <span className="text-xs text-slate-400">{new Date(n.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-slate-300 text-sm">{n.body}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
