import { Building2, Mail, Phone } from "lucide-react";

export const dynamic = "force-static";

export const metadata = {
  title: "Impressum | JobBridge",
};

function InfoBlock({ icon: Icon, label, children }: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-200/80 bg-white/70 p-4 shadow-sm shadow-slate-900/[0.03] dark:border-white/10 dark:bg-white/[0.035] sm:gap-4 sm:rounded-2xl sm:p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
        <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{children}</div>
      </div>
    </div>
  );
}

export default function ImpressumPage() {
  return (
    <>
      <div className="not-prose mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-600/10 text-indigo-600 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-300">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">Angaben gemäß § 5 DDG</p>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Impressum</h1>
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
            <a href="mailto:support@jobbridge.app" className="text-slate-950 transition-colors hover:text-indigo-700 dark:text-white dark:hover:text-indigo-200">
              support@jobbridge.app
            </a>
          </p>
        </InfoBlock>

        <InfoBlock icon={Phone} label="Telefon">
          <p>
            <a href="tel:+4915679698448" className="text-slate-950 transition-colors hover:text-indigo-700 dark:text-white dark:hover:text-indigo-200">
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

      <div className="not-prose mt-8 text-xs font-medium text-slate-500 dark:text-slate-400">
        Stand: April 2026
      </div>
    </>
  );
}
