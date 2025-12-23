import { requireCompleteProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import { NotificationSettingsForm } from "@/components/notifications/NotificationSettingsForm";

export default async function NotificationSettingsPage() {
    const { profile } = await requireCompleteProfile();
    const supabase = await supabaseServer();

    // Fetch existing preferences or default
    const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", profile.id)
        .single();

    const defaultPrefs = {
        email_enabled: true,
        email_application_updates: true,
        email_messages: true,
        email_job_updates: true,
        digest_frequency: "instant"
    };

    return (
        <div className="container mx-auto py-12 px-4 md:px-6">
            <div className="mx-auto max-w-2xl">
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Benachrichtigungen</h1>
                <p className="text-slate-400 mb-8">Steuere, wie und wann du informiert werden möchtest.</p>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
                    <NotificationSettingsForm initialPrefs={prefs || defaultPrefs} userId={profile.id} />
                </div>

                <div className="mt-8 p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                    <h3 className="text-lg font-semibold text-blue-200 mb-2">App Benachrichtigungen</h3>
                    <p className="text-blue-200/70 text-sm">
                        Push-Benachrichtigungen für dein Smartphone kannst du direkt in der iOS/Android App oder in deinen Systemeinstellungen verwalten.
                    </p>
                </div>
            </div>
        </div>
    );
}
