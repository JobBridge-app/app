import { History, ArrowLeft, Laptop, Smartphone, Key } from "lucide-react";
import Link from "next/link";
import { getAppHomeSnapshot } from "@/lib/app-shell";
import { supabaseServer } from "@/lib/supabaseServer";
import { PasswordResetButton } from "@/components/settings/PasswordResetButton";

type SecurityEvent = {
  id: string;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export default async function SecuritySettingsPage() {
  const snapshot = await getAppHomeSnapshot();
  const supabase = await supabaseServer();

  const { data, error } = await supabase.rpc("get_my_security_events", { p_limit: 5 });

  if (error) {
    console.error("Security activity could not be loaded:", error.message);
  }

  const events = (data ?? []) as SecurityEvent[];

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-2xl">
      <Link href="/app-home/settings" className="mb-6 flex items-center gap-2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-strong)]">
        <ArrowLeft size={16} />
        <span>Zurück</span>
      </Link>

      <h1 className="mb-2 text-2xl font-bold text-[var(--text-strong)]">Sicherheit</h1>
      <p className="mb-8 text-[var(--text-muted)]">Schütze deinen Account.</p>

      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 shadow-[var(--shadow-card)]">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--text-strong)]">
            <History size={18} className="text-[var(--brand)]" />
            Sicherheitsaktivität
          </h3>
          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-sm leading-6 text-[var(--text-muted)]">
                Noch keine protokollierten Sicherheitsereignisse.
              </p>
            ) : (
              events.map((event) => (
                <div key={event.id} className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] py-3 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-[var(--surface-muted)] p-2 text-[var(--text-muted)]">
                      {event.user_agent?.includes("Mobile") ? <Smartphone size={16} /> : <Laptop size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium capitalize text-[var(--text-default)]">{event.event_type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-[var(--text-muted)]">{new Date(String(event.created_at)).toLocaleString("de-DE")}</p>
                    </div>
                  </div>
                  <span className="hidden font-mono text-xs text-[var(--text-muted)] sm:inline">{String(event.ip_address || "IP geschützt")}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 shadow-[var(--shadow-card)]">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--text-strong)]">
            <Key size={18} className="text-amber-600 dark:text-amber-300" />
            Passwort ändern
          </h3>
          <p className="mb-4 text-sm text-[var(--text-muted)]">
            Wenn du denkst, dass dein Account gefährdet ist, ändere sofort dein Passwort.
          </p>
          <PasswordResetButton email={snapshot.accountEmail} />
        </div>
      </div>
    </div>
  );
}
