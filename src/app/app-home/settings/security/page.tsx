import { History, ArrowLeft, Laptop, Smartphone, Key } from "lucide-react";
import Link from "next/link";
import { getAppHomeSnapshot } from "@/lib/app-shell";
import { supabaseServer } from "@/lib/supabaseServer";
import { PasswordResetButton } from "@/components/settings/PasswordResetButton";
import type { SecurityEvent } from "@/lib/types";

export default async function SecuritySettingsPage() {
  const snapshot = await getAppHomeSnapshot();
  const supabase = await supabaseServer();

  const { data } = await supabase
    .from("security_events")
    .select("*")
    .eq("user_id", snapshot.profile.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const events = (data ?? []) as SecurityEvent[];

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-2xl">
      <Link href="/app-home/settings" className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft size={16} />
        <span>Zurück</span>
      </Link>

      <h1 className="text-2xl font-bold text-white mb-2">Sicherheit</h1>
      <p className="text-slate-400 mb-8">Schütze deinen Account.</p>

      <div className="space-y-6">
        <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <History size={18} className="text-blue-400" />
            Login Historie
          </h3>
          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-slate-500 text-sm">Keine Einträge gefunden.</p>
            ) : (
              events.map((event) => (
                <div key={event.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-lg text-slate-400">
                      {event.user_agent?.includes("Mobile") ? <Smartphone size={16} /> : <Laptop size={16} />}
                    </div>
                    <div>
                      <p className="text-sm text-slate-200 font-medium capitalize">{event.event_type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-slate-500">{new Date(String(event.created_at)).toLocaleString("de-DE")}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{String(event.ip_address || "IP Hidden")}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Key size={18} className="text-amber-400" />
            Passwort ändern
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            Wenn du denkst, dass dein Account gefährdet ist, ändere sofort dein Passwort.
          </p>
          <PasswordResetButton email={snapshot.accountEmail} />
        </div>
      </div>
    </div>
  );
}
