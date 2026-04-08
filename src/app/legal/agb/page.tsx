import { Scale, Users, ShieldCheck, Handshake, AlertTriangle, FileText } from "lucide-react";

export const metadata = {
  title: "AGB | JobBridge",
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

export default function AGBPage() {
  return (
    <>
      <div className="not-prose mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
            <Scale className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Vereinbarung</p>
            <h1 className="text-2xl font-bold text-white">Allgemeine Geschäftsbedingungen</h1>
          </div>
        </div>
      </div>

      <Section icon={FileText} title="1. Geltungsbereich">
        <p>
          Diese Vertragsbedingungen gelten für die Nutzung der Plattform JobBridge, auf der Jugendliche und private oder gewerbliche Auftraggeber für kleine, legale Handreichungen und Taschengeldjobs zusammengeführt werden.
        </p>
      </Section>

      <Section icon={Users} title="2. Registrierung und Konto">
        <p>
          Die Nutzung der Plattform setzt eine Registrierung voraus. Bei Minderjährigen erfordert dies die explizite Bestätigung der Erziehungsberechtigten gemäß unserer Verifizierungs-Richtlinien. Du verpflichtest dich, bei der Registrierung wahrheitsgemäße Angaben zu machen.
        </p>
      </Section>

      <Section icon={Handshake} title="3. Leistungen von JobBridge">
        <p>
          JobBridge fungiert als technischer Vermittler und stellt die Plattform zur Verfügung. Vertragliche Beziehungen bei der Annahme eines Jobs entstehen ausschließlich zwischen den registrierten Nutzern (Auftraggeber und Auftragnehmer). JobBridge ist an diesen Verträgen nicht beteiligt.
        </p>
      </Section>

      <Section icon={ShieldCheck} title="4. Pflichten der Nutzer">
        <p>
          Nutzer verpflichten sich, kommunizierte Arbeiten gewissenhaft auszuführen bzw. faire, jugendgerechte Arbeitsbedingungen und Bezahlung sicherzustellen. Ein Verstoß gegen gesetzliche Jugendschutzbestimmungen oder unsere Community-Richtlinien führt zum sofortigen Ausschluss.
        </p>
        <ul>
          <li>Keine illegalen oder gefährlichen Tätigkeiten</li>
          <li>Angemessene, dem Alter entsprechende Bezahlung</li>
          <li>Respektvoller und professioneller Umgang</li>
          <li>Einhaltung des Jugendarbeitsschutzgesetzes (JArbSchG)</li>
        </ul>
      </Section>

      <Section icon={AlertTriangle} title="5. Haftungsbeschränkung">
        <p>
          JobBridge haftet nicht für Schäden, die aus der Vermittlung resultieren. Wir übernehmen keine Garantie für die Qualität der Arbeit oder die Zahlungsfähigkeit der Auftraggeber, wenngleich wir Identitäten prüfen.
        </p>
      </Section>

      <Section icon={Scale} title="6. Schlussbestimmungen">
        <p>
          Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt der Vertrag im Übrigen wirksam. Es gilt das Recht der Bundesrepublik Deutschland.
        </p>
      </Section>

      <div className="not-prose mt-8 text-xs text-slate-500">
        Stand: April 2026
      </div>
    </>
  );
}
