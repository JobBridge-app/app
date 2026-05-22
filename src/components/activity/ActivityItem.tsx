import { memo } from "react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import {
    Clock,
    CheckCircle2,
    XCircle,
    ArrowRight,
    MessageSquare,
    Building2,
    MapPin,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/types/supabase";

type ApplicationStatus = Database["public"]["Enums"]["application_status"];

export const ActivityItem = memo(function ActivityItem({ app, onSelect, isSelected, compact }: { app: any, onSelect: (app: any) => void, isSelected?: boolean, compact?: boolean }) {
    const status = app.status as ApplicationStatus;

    // Map DB status to UI Label
    let statusLabel = "Offen";
    let statusColor = "text-slate-500";
    let statusBg = "bg-slate-500/10";
    let statusIcon = <Clock size={14} />;

    if (status === 'negotiating') {
        statusLabel = "Verhandlung";
        statusColor = "text-indigo-400";
        statusBg = "bg-indigo-500/10";
        statusIcon = <MessageSquare size={14} />;
    } else if (status === 'accepted') {
        statusLabel = "Akzeptiert";
        statusColor = "text-emerald-400";
        statusBg = "bg-emerald-500/10";
        statusIcon = <CheckCircle2 size={14} />;
    } else if (status === 'rejected') {
        statusLabel = "Abgelehnt";
        statusColor = "text-red-400";
        statusBg = "bg-red-500/10";
        statusIcon = <XCircle size={14} />;
    } else if (status === 'withdrawn') {
        statusLabel = "Zurückgezogen";
        statusColor = "text-slate-500";
        statusBg = "bg-slate-500/10";
        statusIcon = <XCircle size={14} />;
    } else if (status === 'waitlisted') {
        statusLabel = "Warteliste";
        statusColor = "text-orange-400";
        statusBg = "bg-orange-500/10";
        statusIcon = <Loader2 size={14} className="animate-spin-slow" />;
    } else if (status === 'submitted') {
        statusLabel = "Gesendet";
        statusColor = "text-blue-400";
        statusBg = "bg-blue-500/10";
        statusIcon = <CheckCircle2 size={14} />;
    }

    return (
        <div
            onClick={() => onSelect(app)}
            className={cn(
                "activity-item group relative overflow-hidden transition-all duration-200 cursor-pointer",
                compact ? "rounded-xl border hover:-translate-y-0.5" : "rounded-2xl border hover:shadow-xl hover:-translate-y-0.5",
                isSelected
                    ? "bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_-5px_rgba(99,102,241,0.2)]"
                    : "bg-[#111116] border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
            )}
        >
            <div className={cn("flex flex-col gap-3", compact ? "p-3" : "p-6 md:flex-row md:items-center")}>
                {/* Job Info */}
                <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                        <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-white/5", statusBg, statusColor)}>
                            {statusIcon}
                            {statusLabel}
                        </div>
                        {(!compact || !isSelected) && (
                            <span className="text-slate-500 text-[10px] whitespace-nowrap">
                                {formatDistanceToNow(new Date(app.created_at), { addSuffix: true, locale: de })}
                            </span>
                        )}
                    </div>

                    <div>
                        <h3 className={cn("font-bold text-white group-hover:text-indigo-400 transition-colors truncate", compact ? "text-sm" : "text-xl mb-1")}>
                            {app.job?.title}
                        </h3>
                        <div className={cn("flex items-center gap-3 text-slate-400", compact ? "text-xs" : "text-sm")}>
                            <span className="flex items-center gap-1.5 truncate">
                                <Building2 size={compact ? 12 : 14} className="text-slate-600 shrink-0" />
                                <span className="truncate">{app.job?.creator?.company_name || "Privat"}</span>
                            </span>
                            {!compact && (
                                <span className="flex items-center gap-1.5">
                                    <MapPin size={14} className="text-slate-600" />
                                    {app.job?.public_location_label || "Rheinbach"}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side Actions - Only in non-compact mode or minimal indicator */}
                {!compact && (
                    <div className="flex flex-row md:flex-col items-center md:items-end gap-3 md:border-l md:border-white/5 md:pl-6 pt-4 md:pt-0 border-t border-white/5 md:border-t-0 mt-2 md:mt-0">
                        <div className="flex gap-3 w-full md:w-auto">
                            <button
                                className="flex-1 md:flex-none px-5 py-2.5 rounded-xl bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white transition-all font-medium text-sm flex items-center justify-center gap-2 group/btn"
                            >
                                Ansehen
                                <ArrowRight size={16} className="text-slate-500 group-hover/btn:text-white transition-colors" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});
