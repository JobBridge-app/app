import { Shield, Server, Users, Globe, FileWarning, Mail } from "lucide-react";

export const dynamic = "force-static";

export const metadata = {
  title: "Datenschutzerklärung | JobBridge",
};

function Section({ icon: Icon, title, children }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="not-prose flex items-center gap-3 mb-4 mt-8 sm:mt-12 pb-4 border-b border-white/10">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
          <Icon className="w-4 h-4 text-indigo-400" />
        </div>
        <h2 className="text-lg font-semibold text-white m-0">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function DatenschutzPage() {
  return (
    <>
      <div className="not-prose mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
            <Shield className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Transparenz</p>
            <h1 className="text-2xl font-bold text-white break-words">Datenschutzerklärung</h1>
          </div>
        </div>
      </div>

      <p>
        Wir nehmen den Schutz deiner persönlichen Daten sehr ernst. Hier erfährst du transparent, welche Daten wir erheben, warum wir sie brauchen und welche Rechte du hast.
      </p>

      <Section icon={Globe} title="Datenschutz auf einen Blick">
        <p>
          JobBridge ist eine Plattform, die Jugendliche und Auftraggeber für sichere Taschengeldjobs zusammenführt. Dabei behandeln wir deine personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften (DSGVO) sowie dieser Datenschutzerklärung.
        </p>
      </Section>

      <Section icon={Server} title="Datenerfassung auf unserer Plattform">
        <p>
          Deine Daten werden zum einen dadurch erhoben, dass du uns diese mitteilst – z.B. bei der Registrierung (E-Mail, Name, Region). Andere Daten werden automatisch beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten wie Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs.
        </p>
      </Section>

      <Section icon={Users} title="Wie nutzen wir deine Daten?">
        <p>
          Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der App zu gewährleisten. Andere Daten werden zur sicheren Identifikation und Kommunikation zwischen Jugendlichen und Auftraggebern genutzt:
        </p>
        <ul>
          <li>Bereitstellung und Verbesserung der Plattform</li>
          <li>Sichere Authentifizierung und Verifizierung von Nutzern</li>
          <li>Standortbasierte Darstellung relevanter Job-Angebote</li>
          <li>Kommunikation zwischen den Parteien (z.B. Bewerbungen)</li>
        </ul>
      </Section>

      <Section icon={Server} title="Drittanbieter und Tools">
        <p>Wir setzen folgende vertrauenswürdige Dienste ein:</p>
        <ul>
          <li>
            <strong>Hetzner Online GmbH</strong> – Hosting und Betrieb der Plattform auf eigenen Servern
            in Nürnberg, Deutschland. Im Rahmen der Bereitstellung können technische Server- und
            Verbindungsdaten verarbeitet werden.
          </li>
          <li>
            <strong>Cloudflare</strong> – DNS-, Netzwerk- und Sicherheitsdienste zum Schutz und zur
            stabilen Auslieferung der Plattform. Dabei können insbesondere IP-Adressen und technische
            Verbindungsdaten verarbeitet werden.
          </li>
          <li>
            <strong>Supabase</strong> – Authentifizierung und Datenbank. Deine Daten werden
            verschlüsselt gespeichert und übertragen (TLS).
          </li>
          <li>
            <strong>MapTiler</strong> – Darstellung von Karteninhalten innerhalb der Plattform. Hierbei
            kann deine IP-Adresse aus technischen Gründen an den Kartenanbieter übertragen werden.
          </li>
          <li>
            <strong>OpenStreetMap / Nominatim</strong> – Adress- und Standortsuche innerhalb der
            Plattform. Bei einer Suchanfrage werden die von dir eingegebenen Suchbegriffe sowie
            technische Verbindungsdaten verarbeitet.
          </li>
          <li>
            <strong>Stripe</strong> – Sichere Zahlungsabwicklung, sofern Zahlungsfunktionen innerhalb der
            Plattform angeboten werden. Stripe verarbeitet Zahlungsdaten nach eigenen, strengen
            Finanz- und Sicherheitsstandards.
          </li>
          <li>
            <strong>Twilio</strong> – Versand transaktionaler Nachrichten und Benachrichtigungen, soweit
            entsprechende Kommunikationsfunktionen genutzt werden.
          </li>
        </ul>
      </Section>

      <Section icon={FileWarning} title="Deine Rechte">
        <p>
          Du hast jederzeit das Recht auf:
        </p>
        <ul>
          <li><strong>Auskunft</strong> – Über Herkunft, Empfänger und Zweck deiner gespeicherten Daten</li>
          <li><strong>Berichtigung</strong> – Korrektur unrichtiger Daten</li>
          <li><strong>Löschung</strong> – Entfernung deiner Daten (&quot;Recht auf Vergessenwerden&quot;)</li>
          <li><strong>Einschränkung der Verarbeitung</strong></li>
          <li><strong>Datenübertragbarkeit</strong></li>
          <li><strong>Widerspruch</strong> – Gegen die Verarbeitung deiner Daten</li>
        </ul>
      </Section>

      <Section icon={Mail} title="Kontakt">
        <p>
          Für Datenschutzanfragen wende dich bitte an unsere im <a href="/legal/impressum">Impressum</a> angegebene E-Mail-Adresse. Wir antworten zeitnah und transparent.
        </p>
      </Section>

      <div className="not-prose mt-8 text-xs text-slate-500">
        Stand: April 2026
      </div>
    </>
  );
}
