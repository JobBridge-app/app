import { ShieldCheck, Cookie, Eye, EyeOff, Map, BarChart3, Lock } from "lucide-react";

export const dynamic = "force-static";

export const metadata = {
  title: "Cookie-Richtlinien | JobBridge",
};

function CookieCard({ icon: Icon, title, description, type }: {
  icon: React.ElementType;
  title: string;
  description: string;
  type: "essential" | "none";
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-200/80 bg-white/70 p-4 shadow-sm shadow-slate-900/[0.03] transition-colors hover:bg-white dark:border-white/10 dark:bg-white/[0.035] dark:hover:bg-white/[0.06] sm:gap-4 sm:rounded-2xl sm:p-5">
      <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${type === "essential"
          ? "bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
          : "bg-slate-200/80 text-slate-500 dark:bg-slate-500/10 dark:text-slate-400"
        }`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h4 className="text-sm font-bold text-slate-950 dark:text-slate-100">{title}</h4>
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${type === "essential"
              ? "bg-emerald-600/10 text-emerald-700 border border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/20"
              : "bg-slate-200/70 text-slate-500 border border-slate-300/70 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20"
            }`}>
            {type === "essential" ? "Essenziell" : "Nicht verwendet"}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

export default function CookiesPage() {
  return (
    <>
      {/* Hero Section */}
      <div className="not-prose mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-600/10 text-indigo-600 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-300">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">Privacy First</p>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Cookie-Richtlinien</h1>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/5 sm:mt-8 sm:rounded-2xl sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
              <EyeOff className="h-5 w-5" />
            </div>
            <div>
              <h3 className="mb-2 text-base font-bold text-emerald-900 dark:text-emerald-200">
                Warum hast du hier keinen Cookie-Banner wegklicken müssen?
              </h3>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                Ganz einfach: Weil wir dich <strong className="text-emerald-800 dark:text-emerald-200">nicht tracken</strong>. Wir verkaufen keine Daten an Dritte, schalten keine personalisierte Werbung und setzen keine einwilligungspflichtigen Marketing-Cookies ein. Bei JobBridge ist Datenschutz kein Kompromiss – sondern Standard. Deshalb benötigen wir keinen Cookie-Banner.
              </p>
            </div>
          </div>
        </div>
      </div>

      <h2>Was wir nutzen</h2>

      <div className="not-prose flex flex-col gap-3 my-6">
        <CookieCard
          icon={Lock}
          title="Session & Login"
          description="Speichert deinen sicheren Login-Status über Supabase Auth, damit du nicht bei jeder Aktion erneut ausgeloggt wirst. Ohne diesen Cookie funktioniert die App nicht."
          type="essential"
        />
        <CookieCard
          icon={ShieldCheck}
          title="Sicherheit & Bot-Schutz"
          description="Über Cloudflare können technisch erforderliche Sicherheits-Cookies gesetzt werden, um missbräuchlichen Traffic zu erkennen und die Plattform vor Angriffen zu schützen. Diese Cookies dienen ausschließlich Sicherheit und Stabilität."
          type="essential"
        />
        <CookieCard
          icon={Eye}
          title="Design-Einstellungen"
          description="Angemeldete Nutzer speichern ihr bevorzugtes Erscheinungsbild in ihrem Profil. Ohne Login richtet sich JobBridge standardmäßig nach dem Systemdesign deines Geräts."
          type="essential"
        />
      </div>

      <h2>Was wir bewusst nicht nutzen</h2>

      <div className="not-prose flex flex-col gap-3 my-6">
        <CookieCard
          icon={BarChart3}
          title="Tracking & Analyse (z.B. Google Analytics)"
          description="Wir verzichten vollständig auf Third-Party-Tracking. Keine IP-Adressen, die in fremde Hände gelangen. Keine personalisierte Werbung. Kein Re-Targeting."
          type="none"
        />
        <CookieCard
          icon={Cookie}
          title="Marketing-Cookies"
          description="Wir schalten keine Werbung und teilen keine Nutzerdaten mit Werbetreibenden. Deine Daten gehören dir – Punkt."
          type="none"
        />
      </div>

      <h2>Kartendienste</h2>

      <div className="not-prose flex flex-col gap-3 my-6">
        <CookieCard
          icon={Map}
          title="MapTiler & Standortsuche"
          description="Zur Darstellung von Karten und zur Adresssuche werden externe Kartendienste eingebunden. Dabei wird technisch bedingt deine IP-Adresse an MapTiler bzw. bei Suchanfragen an OpenStreetMap/Nominatim übertragen. Dies dient ausschließlich der Funktionalität."
          type="essential"
        />
      </div>

      <h2>Deine Kontrolle</h2>
      <p>
        Du kannst über die Einstellungen deines Browsers jederzeit kontrollieren, welche Cookies gespeichert werden. Beachte jedoch, dass das Blockieren essenzieller Cookies (Login) dazu führt, dass die App nicht korrekt funktioniert.
      </p>

      <div className="not-prose mt-8 text-xs font-medium text-slate-500 dark:text-slate-400">
        Stand: April 2026
      </div>
    </>
  );
}
