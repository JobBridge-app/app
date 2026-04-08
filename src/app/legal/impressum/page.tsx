import { Building2, Mail, Phone } from "lucide-react";

export const metadata = {
  title: "Impressum | JobBridge",
};

function InfoBlock({ icon: Icon, label, children }: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10">
        <Icon className="w-5 h-5 text-indigo-400" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
        <div className="text-sm text-slate-300 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export default function ImpressumPage() {
  return (
    <>
      <div className="not-prose mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
            <Building2 className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Angaben gemäß § 5 DDG</p>
            <h1 className="text-2xl font-bold text-white">Impressum</h1>
          </div>
        </div>
      </div>

      <div className="not-prose flex flex-col gap-3 mb-10">
        <InfoBlock icon={Building2} label="Diensteanbieter">
          <p>Rezan Aaron Yalçin</p>
          <p>Projekt: JobBridge</p>
          <p>Am neuen Wasserwerk 3</p>
          <p>53359 Rheinbach</p>
        </InfoBlock>

        <InfoBlock icon={Mail} label="Elektronischer Kontakt">
          <p>
            E-Mail:{" "}
            <a href="mailto:support@jobbridge.app" className="text-slate-200 hover:text-white">
              support@jobbridge.app
            </a>
          </p>
        </InfoBlock>

        <InfoBlock icon={Phone} label="Telefon">
          <p>
            <a href="tel:+4915679698448" className="text-slate-200 hover:text-white">
              +49 156 79698448
            </a>
          </p>
        </InfoBlock>
      </div>

      <h2>Verbraucherstreitbeilegung</h2>
      <p>
        Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <div className="not-prose mt-8 text-xs text-slate-500">
        Stand: April 2026
      </div>
    </>
  );
}
