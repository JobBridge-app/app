import { requireCompleteProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import Link from "next/link";
import { Bell, Settings } from "lucide-react";

export default async function NotificationsPage() {
    const { profile } = await requireCompleteProfile();
    const supabase = await supabaseServer();

    const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .returns<any[]>();

    return (
        <div className="container mx-auto py-12 px-4 md:px-6">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <Bell className="text-blue-400" />
                    Benachrichtigungen
                </h1>
                <Link href="/app-home/notifications/settings">
                    <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors bg-white/5 border border-white/10 px-4 py-2 rounded-lg">
                        <Settings size={16} />
                        Einstellungen
                    </button>
                </Link>
            </div>

            {(!notifications || notifications.length === 0) ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-sm">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                        <Bell size={24} />
                    </div>
                    <p className="text-slate-300">Du hast keine neuen Benachrichtigungen.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notifications.map((notif) => (
                        <div key={notif.id} className={`rounded-xl border p-4 backdrop-blur-sm transition-colors ${notif.read_at ? 'bg-white/5 border-white/5 opacity-70' : 'bg-white/10 border-blue-500/30'}`}>
                            <h3 className="text-white font-medium mb-1">{notif.title}</h3>
                            <p className="text-slate-300 text-sm">{notif.body}</p>
                            <p className="text-slate-500 text-xs mt-2">{new Date(notif.created_at).toLocaleString()}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
