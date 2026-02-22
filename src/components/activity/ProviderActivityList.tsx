"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { MessageSquare, Clock, MapPin, Briefcase, ArrowRight, XCircle } from "lucide-react";
import { ApplicationChatModal } from "@/components/activity/ApplicationChatModal";
import { UserProfileModal } from "@/components/profile/UserProfileModal";
import type { Database } from "@/lib/types/supabase";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

// Define the type for the provider's view of an application
export type ProviderApplication = Database["public"]["Tables"]["applications"]["Row"] & {
    applicant?: (Database["public"]["Tables"]["profiles"]["Row"] & { avatar_url?: string | null }) | null;
    job?: {
        title: string;
        status: Database["public"]["Enums"]["job_status"];
    } | null;
};

export function ProviderActivityList({ applications, userId }: { applications: ProviderApplication[], userId: string }) {
    const [selectedApp, setSelectedApp] = useState<ProviderApplication | null>(null);
    const [viewProfile, setViewProfile] = useState<Database["public"]["Tables"]["profiles"]["Row"] | null>(null);
    const supabase = supabaseBrowser;
    const router = useRouter();

    const handleSendMessage = async (applicationId: string, message: string) => {
        const { error } = await supabase
            .from("messages")
            .insert({
                application_id: applicationId,
                sender_id: userId,
                content: message
            });

        if (error) throw error;
    };

    const handleReject = async (reason: string) => {
        if (!selectedApp) return;

        const { error } = await supabase
            .from("applications")
            .update({
                status: "rejected",
                rejection_reason: reason
            })
            .eq("id", selectedApp.id);

        if (error) throw error;
        router.refresh();
    };

    if (applications.length === 0) {
        return (
            <div className="rounded-[2.5rem] border border-white/5 bg-[#0B0C10] p-16 text-center shadow-xl">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/5">
                    <MessageSquare size={32} className="text-indigo-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Keine Aktivitäten</h3>
                <p className="text-slate-400 max-w-md mx-auto">Aktuell liegen keine Bewerbungen für deine Inserate vor.</p>
            </div>
        );
    }

    // Separate applications into logic groups
    const activeApps = applications.filter(app => ['submitted', 'negotiating', 'accepted'].includes(app.status));
    const waitlistedApps = applications.filter(app => app.status === 'waitlisted');
    const closedApps = applications.filter(app => ['rejected', 'withdrawn', 'cancelled'].includes(app.status));

    // Sort active apps: Accepted first, then Negotiating, then Submitted
    activeApps.sort((a, b) => {
        const order = { 'accepted': 0, 'negotiating': 1, 'submitted': 2 };
        return (order[a.status as keyof typeof order] || 99) - (order[b.status as keyof typeof order] || 99);
    });

    const renderApplicationCard = (app: ProviderApplication, isWaitlist: boolean = false) => {
        const isSelected = selectedApp?.id === app.id;
        const baseGradient = isWaitlist
            ? "from-amber-500/[0.03] to-orange-500/[0.03]"
            : "from-indigo-500/[0.03] to-purple-500/[0.03]";
        const hoverBorder = isWaitlist
            ? "hover:border-amber-500/30 hover:shadow-[0_0_60px_-15px_rgba(245,158,11,0.15)]"
            : "hover:border-indigo-500/30 hover:shadow-[0_0_60px_-15px_rgba(79,70,229,0.15)]";
        const btnHover = isWaitlist
            ? "hover:bg-amber-500 hover:border-amber-400/50 text-amber-500 hover:text-white hover:shadow-amber-500/20"
            : "hover:bg-indigo-500 hover:border-indigo-400/50 text-indigo-400 hover:text-white hover:shadow-indigo-500/20";
        const badgeStyle = isWaitlist
            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
            : app.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                app.status === 'rejected' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                    app.status === 'negotiating' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                        'bg-slate-500/10 text-slate-400 border-slate-500/20';
        const badgeLabel = isWaitlist ? 'WARTELISTE' :
            app.status === 'submitted' ? 'NEU' :
                app.status === 'negotiating' ? 'IN VERHANDLUNG' :
                    app.status === 'accepted' ? 'ANGENOMMEN' :
                        app.status === 'rejected' ? 'ABGELEHNT' : app.status;

        return (
            <div
                key={app.id}
                onClick={() => setSelectedApp(app)}
                className={`group relative flex flex-col rounded-[2.5rem] border border-white/[0.05] bg-[#0A0A0C] overflow-hidden transition-all duration-300 cursor-pointer ${hoverBorder} ${isSelected ? 'border-white/10 ring-1 ring-white/5' : ''}`}
            >
                <div className={`absolute inset-0 bg-gradient-to-br ${baseGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative px-8 pt-8 flex items-start justify-between">
                    <div className="space-y-1">
                        <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                            {isWaitlist ? <Clock size={10} className="text-amber-500/70" /> : <Briefcase size={10} />}
                            {app.job?.title || "Job nicht verfügbar"}
                        </span>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                            <Clock size={12} />
                            <span>vor {formatDistanceToNow(new Date(app.created_at), { locale: de })}</span>
                        </div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm backdrop-blur-md ${badgeStyle}`}>
                        {badgeLabel}
                    </div>
                </div>
                <div className="relative p-8 pb-4 flex-1">
                    <div className="flex items-center gap-5">
                        <div
                            className="relative flex-shrink-0 group/avatar cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); if (app.applicant) setViewProfile(app.applicant); }}
                        >
                            <div className="absolute -inset-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full opacity-0 group-hover/avatar:opacity-20 blur-md transition-opacity" />
                            <div className="w-16 h-16 rounded-2xl bg-[#15151A] border-2 border-white/5 flex items-center justify-center overflow-hidden relative z-10 shadow-xl group-hover/avatar:scale-105 transition-transform duration-300">
                                {app.applicant?.avatar_url ? (
                                    <img src={app.applicant.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xl font-black text-slate-700 select-none">
                                        {app.applicant?.full_name?.charAt(0).toUpperCase() || "?"}
                                    </span>
                                )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 z-20 w-6 h-6 rounded-full bg-[#15151A] border border-white/10 flex items-center justify-center text-indigo-400 opacity-0 group-hover/avatar:opacity-100 transition-all shadow-lg scale-75 group-hover/avatar:scale-100">
                                <ArrowRight size={10} />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className={`text-xl font-bold tracking-tight truncate transition-colors ${isWaitlist ? 'text-slate-300 group-hover:text-amber-100' : 'text-white group-hover:text-indigo-400'}`}>
                                {app.applicant?.full_name || "Unbekannter Bewerber"}
                            </h4>
                            <p className="text-sm text-slate-400 flex items-center gap-1.5 truncate">
                                <MapPin size={12} className="text-slate-600" />
                                {app.applicant?.city || "Kein Ort angegeben"}
                            </p>
                        </div>
                    </div>
                    {app.message && (
                        <div className="mt-6 relative">
                            <div className="absolute left-4 -top-2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-white/[0.03]" />
                            <div className="rounded-2xl rounded-tl-sm bg-white/[0.03] border border-white/5 p-4 text-sm text-slate-300 leading-relaxed relative">
                                <p className="line-clamp-2 italic opacity-80">"{app.message}"</p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="relative p-8 pt-4 mt-auto">
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={(e) => { e.stopPropagation(); setSelectedApp(app); }}
                            className={`col-span-2 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 group/btn ${btnHover}`}
                        >
                            <MessageSquare size={16} className="group-hover/btn:scale-110 transition-transform" />
                            <span>Konversation öffnen</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="space-y-12">
                {activeApps.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                <MessageSquare size={14} className="text-indigo-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white tracking-tight">Aktive Verhandlungen</h3>
                            <div className="flex-1 h-px bg-gradient-to-r from-white/5 to-transparent ml-4" />
                        </div>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {activeApps.map(app => renderApplicationCard(app, false))}
                        </div>
                    </div>
                )}

                {waitlistedApps.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                <Clock size={14} className="text-amber-500" />
                            </div>
                            <h3 className="text-lg font-bold text-white tracking-tight">Warteliste (Backups)</h3>
                            <div className="flex-1 h-px bg-gradient-to-r from-white/5 to-transparent ml-4" />
                        </div>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {waitlistedApps.map(app => renderApplicationCard(app, true))}
                        </div>
                    </div>
                )}

                {closedApps.length > 0 && (
                    <div className="space-y-6 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-8 h-8 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center">
                                <XCircle size={14} className="text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-300 tracking-tight">Geschlossen / Abgelehnt</h3>
                            <div className="flex-1 h-px bg-gradient-to-r from-white/5 to-transparent ml-4" />
                        </div>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {closedApps.map(app => renderApplicationCard(app, false))}
                        </div>
                    </div>
                )}
            </div>

            {/* Application Chat Modal */}
            <ApplicationChatModal
                isOpen={!!selectedApp}
                onClose={() => setSelectedApp(null)}
                application={selectedApp}
                currentUserRole="provider"
                onSendMessage={handleSendMessage}
                onReject={handleReject}
            />

            {/* Profile Detail Modal */}
            <UserProfileModal
                isOpen={!!viewProfile}
                onClose={() => setViewProfile(null)}
                profile={viewProfile ? {
                    ...viewProfile,
                    email: viewProfile.email || undefined,
                    theme_preference: (viewProfile.theme_preference as "light" | "dark" | "system" | undefined) ?? "system"
                } : null}
                stats={{ jobsCompleted: 0, rating: 5.0 }}
                isStaff={(() => {
                    if (!viewProfile) return false;
                    // Check for nested roles in the profile object
                    const roles = (viewProfile as any).user_system_roles?.map((r: any) => r.role?.name) || [];
                    return roles.includes('admin') || roles.includes('moderator') || roles.includes('analyst');
                })()}
            />
        </>
    );
}
