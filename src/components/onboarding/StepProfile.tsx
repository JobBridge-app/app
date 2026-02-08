"use client";

import { motion } from "framer-motion";
import { OnboardingRole } from "@/lib/types";

type StepProfileProps = {
  role: OnboardingRole | null;
  fullName: string;
  birthdate: string;
  city: string;
  onChange: (field: "fullName" | "birthdate" | "city", value: string) => void;
  onNext: () => void;
  onBack: () => void;
};

const roleNotes: Record<OnboardingRole, string> = {
  youth:
    "Für Jugendliche: Wir achten besonders auf Sicherheit und Jugendschutz.",
  adult:
    "Für Auftraggebende: Klare Angaben helfen passenden Personen, Sie zu finden.",
  senior:
    "Für Seniorinnen und Senioren: Wir halten alles besonders gut lesbar und einfach.",
  company:
    "Für Unternehmen: Diese Angaben erscheinen in Ihrem Profil und Jobs.",
};

export function StepProfile({
  role,
  fullName,
  birthdate,
  city,
  onChange,
  onNext,
  onBack,
}: StepProfileProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.24em] text-cyan-200/80">
          Schritt 3
        </p>
        <h2 className="text-3xl font-semibold md:text-4xl">Basisdaten</h2>
        <p className="text-lg text-slate-200/80 md:text-xl">
          Kurze Angaben genügen. Wir zeigen nur, was für Ihr Profil notwendig
          ist.
        </p>
        {role && (
          <p className="text-base font-medium text-cyan-100/90 md:text-lg">
            {roleNotes[role]}
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="space-y-2 text-lg md:text-xl">
          <span className="block text-slate-100">Vollständiger Name</span>
          <motion.input
            type="text"
            value={fullName}
            onChange={(e) => onChange("fullName", e.target.value)}
            placeholder="z. B. Anna Müller"
            className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-lg text-white placeholder:text-slate-300/70 focus:border-cyan-300/80 focus:outline-none focus:ring-2 focus:ring-cyan-300/60 md:text-xl"
            whileFocus={{ scale: 1.005 }}
          />
        </label>
        <label className="space-y-2 text-lg md:text-xl">
          <span className="block text-slate-100">Geburtsdatum</span>
          <motion.input
            type="date"
            value={birthdate}
            onChange={(e) => onChange("birthdate", e.target.value)}
            className="w-full appearance-none shadow-none [color-scheme:dark] rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-lg text-white invalid:text-slate-500 placeholder:text-slate-300/70 focus:border-cyan-300/80 focus:outline-none focus:ring-2 focus:ring-cyan-300/60 md:text-xl"
            whileFocus={{ scale: 1.005 }}
          />
        </label>
        <label className="space-y-2 text-lg md:text-xl md:col-span-2">
          <span className="block text-slate-100">Stadt / Ort</span>
          <motion.input
            type="text"
            value={city}
            onChange={(e) => onChange("city", e.target.value)}
            placeholder="z. B. München"
            className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-lg text-white placeholder:text-slate-300/70 focus:border-cyan-300/80 focus:outline-none focus:ring-2 focus:ring-cyan-300/60 md:text-xl"
            whileFocus={{ scale: 1.005 }}
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-slate-200/80 underline-offset-4 hover:underline md:text-base"
        >
          Zurück
        </button>
        <button
          type="button"
          onClick={onNext}
          className="soft-gradient inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-semibold text-slate-950 transition hover:scale-[1.01] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 md:px-8 md:py-3.5 md:text-lg"
        >
          Weiter
        </button>
      </div>
    </div>
  );
}
