import { useState, useEffect, useRef } from "react";
import { X, Send, MessageSquare, AlertCircle, Trash2, CheckCircle2, Clock, Building2, MapPin, Euro, ArrowLeft, XCircle, User, ShieldCheck } from "lucide-react";
import { ButtonPrimary } from "@/components/ui/ButtonPrimary";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/types/supabase";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import { UserProfileCard, UserProfileModal } from "@/components/profile/UserProfileModal";
import { Profile } from "@/lib/types";

interface ApplicationChatProps {
    application: any; // Using any for simplicity as it involves a complex join
    currentUserRole?: "seeker" | "provider";
    onWithdraw?: (reason: string) => Promise<void>;
    onReject?: (reason: string) => Promise<void>;
    onSendMessage: (applicationId: string, message: string) => Promise<any>;
    onClose?: () => void;
    embedded?: boolean;
}

export function ApplicationChat({ application, currentUserRole = "seeker", onWithdraw, onReject, onSendMessage, onClose, embedded = false }: ApplicationChatProps) {
    const [message, setMessage] = useState("");
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [withdrawReason, setWithdrawReason] = useState("");
    const [sending, setSending] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const supabase = supabaseBrowser;
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);

    // Profile Modal State
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [selectedProfileIsStaff, setSelectedProfileIsStaff] = useState(false);

    // Defer heavy content rendering to unblock initial interaction
    useEffect(() => {
        const timer = requestAnimationFrame(() => {
            setIsReady(true);
        });
        return () => cancelAnimationFrame(timer);
    }, []);

    // Get current user id
    useEffect(() => {
        if (!isReady) return;
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentUserId(user.id);
        };
        getUser();
    }, [supabase, isReady]);

    // Fetch initial messages and subscribe
    useEffect(() => {
        if (application && isReady) {
            const fetchMessages = async () => {
                const { data } = await supabase
                    .from("messages")
                    .select("*")
                    .eq("application_id", application.id)
                    .order("created_at", { ascending: true });

                if (data) setMessages(data);
            };
            fetchMessages();

            // Realtime subscription
            const channel = supabase
                .channel(`app-chat-${application.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages',
                        filter: `application_id=eq.${application.id}`
                    },
                    (payload: RealtimePostgresInsertPayload<Database['public']['Tables']['messages']['Row']>) => {
                        const newMsg = payload.new;
                        setMessages(prev => {
                            // Check if already exists (Realtime can be duplicate sometimes or race with fetch)
                            if (prev.some(m => m.id === newMsg.id)) return prev;

                            // Check if we have a matching temp message (same content, sender, recent)
                            const tempMatchIndex = prev.findIndex(m =>
                                m.is_temp &&
                                m.content === newMsg.content &&
                                m.sender_id === newMsg.sender_id &&
                                Math.abs(new Date(m.created_at).getTime() - new Date(newMsg.created_at as string).getTime()) < 5000 // Match within 5s
                            );

                            if (tempMatchIndex !== -1) {
                                const newMessages = [...prev];
                                newMessages[tempMatchIndex] = newMsg;
                                return newMessages;
                            }

                            return [...prev, newMsg];
                        });
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [application, supabase, isReady]);

    // Scroll to bottom
    useEffect(() => {
        if (isReady && messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isReady]);


    const handleSend = async () => {
        if (!message.trim()) return;

        // Optimistic Update
        const content = message.trim();
        const tempId = `temp-${Date.now()}`;
        const tempMessage = {
            id: tempId,
            application_id: application.id,
            content: content,
            created_at: new Date().toISOString(),
            sender_id: currentUserId,
            is_temp: true
        };

        setMessages(prev => [...prev, tempMessage]);
        setMessage("");

        // Scroll immediately
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 10);

        setSending(true);
        try {
            await onSendMessage(application.id, content);
        } catch (e) {
            console.error("Failed to send", e);
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setMessage(content);
        } finally {
            setSending(false);
        }
    };

    const handleAction = async () => {
        if (!withdrawReason.trim()) return;
        try {
            if (currentUserRole === "seeker" && onWithdraw) {
                await onWithdraw(withdrawReason);
            } else if (currentUserRole === "provider" && onReject) {
                await onReject(withdrawReason);
            }
            if (onClose) onClose();
        } catch (e) {
            console.error("Failed to execute action", e);
        }
    };

    // Helper to open profile
    const openProfile = () => {
        let profileData: any = null;
        let isStaff = false;

        if (currentUserRole === "provider") {
            // View applicant profile
            profileData = application.applicant;
        } else {
            // View Job Creator profile
            profileData = application.job?.creator;
        }

        if (profileData) {
            // Determine if staff based on fetched roles
            const roles = profileData.user_system_roles?.map((r: any) => r.role?.name) || [];
            isStaff = roles.includes('admin') || roles.includes('moderator') || roles.includes('analyst');

            setSelectedProfile(profileData);
            setSelectedProfileIsStaff(isStaff);
            setIsProfileModalOpen(true);
        }
    };

    if (!application) return null;

    const status = application.status;
    const isActive = ['submitted', 'negotiating', 'accepted'].includes(status);

    // Prepare Header Data for Display
    let headerProfile: any = null;
    let headerSubtitle = "";
    let isHeaderStaff = false;

    if (currentUserRole === "seeker") {
        headerProfile = application.job?.creator;
        headerSubtitle = application.job?.title || "Job-Angebot";
    } else {
        headerProfile = application.applicant;
        headerSubtitle = "Bewerber für " + (application.job?.title || "Job");
    }

    // Check staff status for header badge
    if (headerProfile?.user_system_roles) {
        const roles = headerProfile.user_system_roles.map((r: any) => r.role?.name) || [];
        isHeaderStaff = roles.includes('admin') || roles.includes('moderator') || roles.includes('analyst');
    }

    return (
        <div className={cn("flex flex-col md:flex-row h-full overflow-hidden bg-[#09090b]", embedded ? "" : "rounded-3xl border border-white/10 shadow-2xl")}>
            <UserProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                profile={selectedProfile}
                isStaff={selectedProfileIsStaff}
            />

            {!isReady ? (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                    <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                        <p className="text-sm font-medium">Lade...</p>
                    </div>
                </div>
            ) : (
                <>

                    {/* Left Side: Job Summary & Actions */}
                    <div className="hidden md:flex w-1/3 min-w-[320px] bg-[#111116] border-r border-white/5 flex-col">
                        {/* Premium Header */}
                        <div className="p-6 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                {currentUserRole === 'seeker' ? <Building2 size={64} /> : <User size={64} />}
                            </div>

                            <div className="relative z-10">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                                    {currentUserRole === 'seeker' ? 'Arbeitgeber' : 'Bewerber'}
                                </h3>

                                <div onClick={openProfile} className="group cursor-pointer">
                                    <UserProfileCard
                                        profile={headerProfile}
                                        compact={false}
                                    />
                                    {isHeaderStaff && (
                                        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                                            <ShieldCheck size={10} className="text-indigo-400" />
                                            <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider">JobBridge Team</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Context Title */}
                            <div>
                                <h4 className="text-sm font-medium text-slate-400 mb-1">Betrifft:</h4>
                                <div className="text-white font-bold leading-tight">
                                    {application.job?.title}
                                </div>
                            </div>

                            <div className="h-px bg-white/5" />

                            {/* Key Facts */}
                            {currentUserRole === "seeker" && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-sm text-slate-300">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-500">
                                            <Euro size={16} />
                                        </div>
                                        <div>
                                            <span className="block text-xs text-slate-500 uppercase font-bold">Lohn</span>
                                            {application.job?.wage_hourly} € / Std.
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-300">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-500">
                                            <MapPin size={16} />
                                        </div>
                                        <div>
                                            <span className="block text-xs text-slate-500 uppercase font-bold">Ort</span>
                                            {application.job?.public_location_label}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentUserRole === "provider" && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-sm text-slate-300">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-500">
                                            <Clock size={16} />
                                        </div>
                                        <div>
                                            <span className="block text-xs text-slate-500 uppercase font-bold">Beworben am</span>
                                            {new Date(application.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-300">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-500">
                                            <MapPin size={16} />
                                        </div>
                                        <div>
                                            <span className="block text-xs text-slate-500 uppercase font-bold">Wohnort</span>
                                            {application.applicant?.city || "Unbekannt"}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="h-px bg-white/5" />

                            {/* Status */}
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold mb-2">Status</p>
                                <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium w-full justify-center",
                                    status === 'accepted' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                        status === 'waitlisted' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                            status === 'negotiating' ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                                                status === 'rejected' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                                    "bg-slate-500/10 text-slate-400 border-slate-500/20"
                                )}>
                                    {status === 'accepted' && <CheckCircle2 size={16} />}
                                    {status === 'waitlisted' && <Clock size={16} />}
                                    {status === 'negotiating' && <MessageSquare size={16} />}
                                    {status === 'rejected' && <XCircle size={16} />}
                                    <span className="capitalize">{status}</span>
                                </div>
                            </div>

                            {/* Action Button (Withdraw or Reject) */}
                            {(isActive || status === 'waitlisted') && !isWithdrawing && (
                                <div className="pt-8">
                                    <button
                                        onClick={() => setIsWithdrawing(true)}
                                        className="w-full py-3 px-4 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-colors text-sm font-medium flex items-center justify-center gap-2 border border-transparent hover:border-red-500/10"
                                    >
                                        {currentUserRole === "seeker" ? (
                                            <> <Trash2 size={16} /> {status === 'waitlisted' ? "Warteliste verlassen" : "Bewerbung zurückziehen"} </>
                                        ) : (
                                            <> <XCircle size={16} /> Bewerbung ablehnen </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {isWithdrawing && (
                                <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/10 space-y-3 animation-in fade-in slide-in-from-top-2 mt-4">
                                    <h4 className="text-sm font-bold text-red-400 flex items-center gap-2">
                                        <AlertCircle size={14} />
                                        {currentUserRole === "seeker" ? "Wirklich zurückziehen?" : "Bewerber ablehnen?"}
                                    </h4>
                                    <p className="text-xs text-slate-400">
                                        {currentUserRole === "seeker" ? "Dies beendet die Bewerbung." : "Der Bewerber wird benachrichtigt."}
                                    </p>
                                    <textarea
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-red-500/50 resize-none h-20"
                                        placeholder={currentUserRole === "seeker" ? "Grund (optional)..." : "Begründung..."}
                                        value={withdrawReason}
                                        onChange={e => setWithdrawReason(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={() => setIsWithdrawing(false)} className="flex-1 py-2 text-xs text-slate-400 hover:text-white bg-white/5 rounded-lg">Abbrechen</button>
                                        <button onClick={handleAction} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-500">Bestätigen</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Side: Chat & Content */}
                    <div className="flex-1 flex flex-col bg-[#09090b] relative h-[85vh] md:h-full">
                        {/* Mobile Header */}
                        <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-[#111116]">
                            <div className="flex items-center gap-3 overflow-hidden flex-1 mr-2">
                                {onClose && (
                                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                                        <ArrowLeft size={20} />
                                    </button>
                                )}
                                <div onClick={openProfile} className="flex-1 min-w-0 cursor-pointer">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-white text-sm truncate">{headerProfile?.full_name || "Unbekannt"}</h3>
                                        {isHeaderStaff && <ShieldCheck size={12} className="text-indigo-400 shrink-0" />}
                                    </div>
                                    <p className="text-xs text-slate-500 truncate">{headerSubtitle}</p>
                                </div>
                            </div>
                            {isActive && (
                                <button onClick={() => setIsWithdrawing(!isWithdrawing)} className="text-slate-400 hover:text-red-400">
                                    {currentUserRole === "seeker" ? <Trash2 size={18} /> : <XCircle size={18} />}
                                </button>
                            )}
                        </div>

                        {/* Mobile Withdraw Overlay */}
                        {isWithdrawing && (
                            <div className="md:hidden absolute top-14 left-0 right-0 z-20 bg-[#111116] p-4 border-b border-white/5 shadow-xl">
                                <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/10 space-y-3">
                                    <h4 className="text-sm font-bold text-red-400 flex items-center gap-2">
                                        <AlertCircle size={14} /> {currentUserRole === "seeker" ? "Bewerbung zurückziehen?" : "Bewerber ablehnen?"}
                                    </h4>
                                    <textarea
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-red-500/50 resize-none h-20"
                                        placeholder={currentUserRole === "seeker" ? "Grund (optional)..." : "Begründung..."}
                                        value={withdrawReason}
                                        onChange={e => setWithdrawReason(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={() => setIsWithdrawing(false)} className="flex-1 py-2 text-xs text-slate-400 hover:text-white bg-white/5 rounded-lg">Abbrechen</button>
                                        <button onClick={handleAction} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-500">Bestätigen</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-gradient-to-b from-[#09090b] to-[#0c0c10]">

                            {status === 'waitlisted' && (
                                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-3 items-start my-4">
                                    <Clock className="text-amber-500 shrink-0 mt-0.5" size={20} />
                                    <div className="text-sm">
                                        <h4 className="font-bold text-amber-100 mb-1">
                                            {currentUserRole === 'seeker' ? 'Du bist auf der Warteliste' : 'Bewerber auf der Warteliste'}
                                        </h4>
                                        <p className="text-amber-200/80 leading-relaxed">
                                            {application.job?.status === 'completed'
                                                ? (currentUserRole === 'seeker'
                                                    ? "Der Job wurde mittlerweile vom Anbieter abgeschlossen. Diese Warteliste ist beendet."
                                                    : "Dieser Job wurde erfolgreich abgeschlossen. Der Bewerber hat die Warteliste verlassen.")
                                                : (currentUserRole === 'seeker'
                                                    ? "Deine Bewerbung ist pausiert. Sollte der aktuelle Bewerber abspringen, rückst du automatisch nach und deine Nachricht wird an den Anbieter gesendet."
                                                    : "Dieser Bewerber befindet sich auf der Warteliste und steht bereit, falls der primäre Kandidat abspringen sollte. Der Chat ist momentan pausiert.")}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Initial System Message */}
                            <div className="flex justify-center my-6">
                                <div className="bg-white/5 px-4 py-2 rounded-full text-xs text-slate-500 border border-white/5 flex items-center gap-2">
                                    <Clock size={12} /> Bewerbung gesendet {formatDistanceToNow(new Date(application.created_at), { addSuffix: true, locale: de })}
                                </div>
                            </div>

                            {/* Application Message */}
                            {application.message && (
                                <div className="flex justify-end">
                                    <div className="max-w-[85%] md:max-w-[70%]">
                                        <div className="bg-indigo-600/20 text-indigo-100 rounded-2xl rounded-br-sm px-5 py-3.5 text-sm leading-relaxed border border-indigo-500/20 shadow-sm">
                                            {application.message}
                                        </div>
                                        <span className="text-[10px] text-slate-600 mt-1 block text-right">
                                            Bewerbungstext
                                        </span>
                                    </div>
                                </div>
                            )}

                            {messages.map((msg) => {
                                const isMe = msg.sender_id === currentUserId;
                                const isTemp = msg.is_temp;
                                return (
                                    <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start", isTemp ? "opacity-70" : "")}>
                                        <div className="max-w-[85%] md:max-w-[70%]">
                                            <div className={cn(
                                                "rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm",
                                                isMe
                                                    ? "bg-indigo-600 text-white rounded-br-sm shadow-indigo-500/10"
                                                    : "bg-[#1c1c21] text-slate-200 border border-white/5 rounded-bl-sm"
                                            )}>
                                                {msg.content}
                                            </div>
                                            <span className={cn(
                                                "text-[10px] text-slate-600 mt-1 block",
                                                isMe ? "text-right" : "text-left"
                                            )}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {isTemp && " • Senden..."}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 md:p-6 bg-[#111116] border-t border-white/5">
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                                    placeholder="Nachricht schreiben..."
                                    disabled={sending || !isActive}
                                    className="flex-1 bg-[#1c1c21] border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <ButtonPrimary
                                    onClick={handleSend}
                                    disabled={sending || !message.trim() || !isActive}
                                    className="px-5 rounded-xl aspect-square flex items-center justify-center p-0"
                                >
                                    {sending ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Send size={20} />}
                                </ButtonPrimary>
                            </div>
                            {!isActive && (
                                <p className="text-center text-xs text-slate-500 mt-3">
                                    {status === 'waitlisted'
                                        ? (application.job?.status === 'completed'
                                            ? (currentUserRole === 'seeker' ? "Der Job wurde abgeschlossen. Diese Warteliste ist beendet." : "Die Warteliste ist beendet, da der Job abgeschlossen wurde.")
                                            : (currentUserRole === 'seeker' ? "Der Chat ist pausiert, solange du auf der Warteliste stehst." : "Der Chat ist pausiert, da sich dieser Bewerber auf der Warteliste befindet."))
                                        : "Dieser Chat ist geschlossen, da die Bewerbung beendet wurde."}
                                </p>
                            )}
                        </div>

                        {!embedded && onClose && (
                            <div className="hidden md:block absolute top-6 right-6 z-10">
                                <button onClick={onClose} className="rounded-full bg-black/20 hover:bg-white/10 p-2 text-slate-400 hover:text-white transition-colors backdrop-blur-sm border border-white/5">
                                    <X size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
