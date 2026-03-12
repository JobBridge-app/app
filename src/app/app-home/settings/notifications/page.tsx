import { Mail, Smartphone, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { NotificationSettingsForm } from "@/components/notifications/NotificationSettingsForm";
import { getAppHomeSnapshot } from "@/lib/app-shell";
import { supabaseServer } from "@/lib/supabaseServer";

export default async function NotificationSettingsPage() {
    const snapshot = await getAppHomeSnapshot();
    const supabase = await supabaseServer();

    const { data } = await supabase
        .from("notification_preferences")
        .select("email_enabled, email_application_updates, email_messages, email_job_updates, digest_frequency")
        .eq("user_id", snapshot.profile.id)
        .maybeSingle();

    const initialPrefs = {
        email_enabled: data?.email_enabled ?? true,
        email_application_updates: data?.email_application_updates ?? true,
        email_messages: data?.email_messages ?? true,
        email_job_updates: data?.email_job_updates ?? true,
        digest_frequency: data?.digest_frequency ?? "instant",
    };

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 max-w-2xl">
            <Link href="/app-home/settings" className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft size={16} />
                <span>Zurück</span>
            </Link>

            <h1 className="text-2xl font-bold text-white mb-2">Benachrichtigungen</h1>
            <p className="text-slate-400 mb-8">Steuere, wie und worüber wir dich informieren.</p>

            <div className="space-y-6">
                <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Mail size={18} className="text-indigo-400" />
                        Email Benachrichtigungen
                    </h3>
                    <p className="text-sm text-slate-400">
                        Feineinstellungen fuer Job-Updates, Nachrichten und Versandhaeufigkeit verwaltest du weiter unten.
                    </p>
                </div>

                <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Smartphone size={18} className="text-emerald-400" />
                        Push Benachrichtigungen
                    </h3>
                    <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <p className="text-emerald-200 text-sm">
                            Push-Benachrichtigungen werden über die Systemeinstellungen deines Geräts verwaltet.
                        </p>
                    </div>
                </div>

                <NotificationSettingsForm initialPrefs={initialPrefs} userId={snapshot.profile.id} />
            </div>
        </div>
    );
}
