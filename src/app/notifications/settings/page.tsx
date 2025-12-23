import { requireCompleteProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

export default async function NotificationSettings() {
    const { profile } = await requireCompleteProfile();
    const supabase = await supabaseServer();

    // Fetch settings
    let { data: settings } = await supabase.from("notification_preferences").select("*").eq("user_id", profile.id).single();

    // Default if not exists (upsert)
    if (!settings) {
        settings = {
            email_enabled: true,
            email_application_updates: true,
            email_messages: true,
            digest_frequency: "instant"
        };
    }

    async function saveSettings(formData: FormData) {
        "use server";
        const supabase = await supabaseServer();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const updates = {
            user_id: user.id,
            email_enabled: formData.get("email_enabled") === "on",
            email_application_updates: formData.get("email_application_updates") === "on",
            digest_frequency: formData.get("digest_frequency") as string,
            updated_at: new Date().toISOString()
        };

        await supabase.from("notification_preferences").upsert(updates);
        revalidatePath("/notifications/settings");
    }

    return (
        <div className="container mx-auto py-12 px-4 md:px-6 max-w-2xl text-white">
            <h1 className="text-2xl font-bold mb-6">Benachrichtigungs-Einstellungen</h1>

            <form action={saveSettings} className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="font-semibold text-lg mb-4">E-Mail Benachrichtigungen</h3>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label htmlFor="email_enabled" className="text-slate-300">Generell aktivieren</label>
                            <input type="checkbox" name="email_enabled" id="email_enabled" defaultChecked={settings.email_enabled} className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500" />
                        </div>
                        <div className="flex items-center justify-between">
                            <label htmlFor="email_application_updates" className="text-slate-300">Bei neuen Bewerbungen / Status</label>
                            <input type="checkbox" name="email_application_updates" id="email_application_updates" defaultChecked={settings.email_application_updates} className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500" />
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="font-semibold text-lg mb-4">Häufigkeit</h3>
                    <div className="space-y-2">
                        {['instant', 'daily', 'weekly'].map((freq) => (
                            <div key={freq} className="flex items-center gap-3">
                                <input type="radio" name="digest_frequency" value={freq} defaultChecked={settings.digest_frequency === freq} id={`freq_${freq}`} />
                                <label htmlFor={`freq_${freq}`} className="capitalize text-slate-300">{freq}</label>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
                    <p className="text-sm text-blue-300">
                        Hinweis: Push-Benachrichtigungen können nur in der iOS App konfiguriert werden (Systemeinstellungen).
                    </p>
                </div>

                <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition">
                    Speichern
                </button>
            </form>
        </div>
    );
}
