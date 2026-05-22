import { requireCompleteProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";

export default async function NotificationsPage() {
    const { profile } = await requireCompleteProfile();
    const supabase = await supabaseServer();

    // Mark all as read on visit (optional logic, maybe manual interaction is better, but user requested "open /notifications")
    // Let's just list them.

    // Fetch notifications with new schema
    const { data: notifications } = await supabase
        .from("notifications")
        .select("id, type, title, body, created_at, read_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(100);

    return (
        <div className="notification-center-page container mx-auto py-12 px-4 max-w-4xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="notification-center-title text-3xl font-bold text-white mb-2">Benachrichtigungen</h1>
                    <p className="notification-center-copy text-slate-400">Deine Historie aller Aktivitäten und Meldungen.</p>
                </div>
                {/* Potential Future Feature: Mark all as read button */}
            </div>

            <div className="space-y-4">
                {!notifications || notifications.length === 0 ? (
                    <div className="notification-center-empty p-12 text-center bg-white/5 rounded-3xl border border-white/10 text-slate-400">
                        <div className="notification-center-empty-icon w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">📭</span>
                        </div>
                        <h3 className="text-lg font-medium text-white mb-1">Keine Benachrichtigungen</h3>
                        <p>Du bist auf dem aktuellen Stand.</p>
                    </div>
                ) : (
                    notifications.map((n) => {
                        const isRead = !!n.read_at;
                        const isSystem = n.type === 'info' || n.type === 'system';
                        const isSuccess = n.type === 'success';
                        const isWarning = n.type === 'warning';

                        return (
                            <div
                                key={n.id}
                                className={`notification-center-card relative p-5 sm:p-6 rounded-2xl border transition-all duration-300 group
                                    ${isRead
                                        ? 'is-read bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                                        : 'is-unread bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border-indigo-500/20 hover:border-indigo-500/30'
                                    }
                                `}
                            >
                                {/* Unread Indicator */}
                                {!isRead && (
                                    <div className="absolute top-6 right-6 w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.5)]" />
                                )}

                                <div className="flex items-start gap-4 sm:gap-6 pr-8">
                                    {/* Icon Box */}
                                    <div className={`notification-center-card-icon w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border
                                        ${isSuccess ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                            isWarning ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                                'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}
                                    `}>
                                        {/* Simple icon mapping based on type */}
                                        {isSuccess ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                        ) : isWarning ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 mb-1">
                                            <h3 className={`notification-center-card-title text-lg font-bold leading-tight ${isRead ? 'text-slate-200' : 'text-white'}`}>
                                                {n.title}
                                            </h3>
                                            <span className="notification-center-card-date text-xs font-medium text-slate-500">
                                                {n.created_at ? new Date(n.created_at).toLocaleString("de-DE", {
                                                    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                                                }) : ""}
                                            </span>
                                        </div>
                                        <p className={`notification-center-card-body text-base leading-relaxed ${isRead ? 'text-slate-400' : 'text-slate-300'}`}>
                                            {n.body}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
