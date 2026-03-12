"use client";

import { motion, AnimatePresence } from "framer-motion";
import { OnboardingRole } from "@/lib/types";
import { AlertCircle } from "lucide-react";

type StepProfileProps = {
  role: OnboardingRole | null;
  fullName: string;
  birthdate: string;
  city: string;
  errors?: {
    fullName?: string;
    birthdate?: string;
    city?: string;
  };
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

const ErrorMessage = ({ message }: { message?: string }) => (
  <AnimatePresence>
    {message && (
      <motion.div
        initial={{ opacity: 0, height: 0, y: -10 }}
        animate={{ opacity: 1, height: "auto", y: 0 }}
        exit={{ opacity: 0, height: 0, y: -10 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="overflow-hidden"
      >
        <div className="flex items-center gap-2 mt-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-sm md:text-base font-medium">
          <AlertCircle size={16} className="text-rose-400 shrink-0" />
          <p>{message}</p>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

export function StepProfile({
  role,
  fullName,
  birthdate,
  city,
  errors = {},
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
        <label className="space-y-2 text-lg md:text-xl relative block">
          <span className="block text-slate-100">Vollständiger Name</span>
          <motion.input
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => onChange("fullName", e.target.value)}
            placeholder="z. B. Anna Müller"
            className={`w-full rounded-2xl border bg-white/5 px-4 py-4 text-lg text-white placeholder:text-slate-300/70 focus:outline-none focus:ring-2 transition-all duration-300 md:text-xl ${
              errors.fullName
                ? "border-rose-500/50 focus:border-rose-400 focus:ring-rose-400/50 shadow-[0_0_15px_-3px_rgba(244,63,94,0.15)]"
                : "border-white/15 focus:border-cyan-300/80 focus:ring-cyan-300/60"
            }`}
            whileFocus={{ scale: 1.005 }}
          />
          <ErrorMessage message={errors.fullName} />
        </label>

        <label className="space-y-2 text-lg md:text-xl relative block">
          <span className="block text-slate-100">Geburtsdatum</span>
          <motion.input
            type="date"
            autoComplete="bday"
            value={birthdate}
            onChange={(e) => onChange("birthdate", e.target.value)}
            className={`w-full appearance-none shadow-none [color-scheme:dark] rounded-2xl border bg-white/5 px-4 py-4 text-lg text-white invalid:text-slate-500 placeholder:text-slate-300/70 focus:outline-none focus:ring-2 transition-all duration-300 md:text-xl ${
              errors.birthdate
                ? "border-rose-500/50 focus:border-rose-400 focus:ring-rose-400/50 shadow-[0_0_15px_-3px_rgba(244,63,94,0.2)]"
                : "border-white/15 focus:border-cyan-300/80 focus:ring-cyan-300/60"
            }`}
            whileFocus={{ scale: 1.005 }}
          />
          <ErrorMessage message={errors.birthdate} />
        </label>

        <label className="space-y-2 text-lg md:text-xl md:col-span-2 relative block">
          <span className="block text-slate-100">Stadt / Ort</span>
          <motion.input
            type="text"
            autoComplete="address-level2"
            value={city}
            onChange={(e) => onChange("city", e.target.value)}
            placeholder="z. B. München"
            className={`w-full rounded-2xl border bg-white/5 px-4 py-4 text-lg text-white placeholder:text-slate-300/70 focus:outline-none focus:ring-2 transition-all duration-300 md:text-xl ${
              errors.city
                ? "border-rose-500/50 focus:border-rose-400 focus:ring-rose-400/50 shadow-[0_0_15px_-3px_rgba(244,63,94,0.15)]"
                : "border-white/15 focus:border-cyan-300/80 focus:ring-cyan-300/60"
            }`}
            whileFocus={{ scale: 1.005 }}
          />
          <ErrorMessage message={errors.city} />
        </label>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pt-4">
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
