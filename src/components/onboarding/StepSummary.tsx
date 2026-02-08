"use client";

import { motion } from "framer-motion";
import { OnboardingRole } from "@/lib/types";

type StepSummaryProps = {
  role: OnboardingRole;
  fullName: string;
  birthdate: string;
  city: string;
  agreed: boolean;
  onAgreeChange: (value: boolean) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading?: boolean;
};

const roleLabel: Record<OnboardingRole, string> = {
  youth: "Jugendliche/r Jobsuchende/r",
  adult: "Privatperson (ich biete Jobs an)",
  senior: "Senior/in – ich suche Unterstützung",
  company: "Unternehmen / Organisation",
};

export function StepSummary({
  role,
  fullName,
  birthdate,
  city,
  agreed,
  onAgreeChange,
  onSubmit,
  onBack,
  loading,
}: StepSummaryProps) {
  const birthYear = birthdate ? new Date(birthdate).getFullYear() : "";

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.24em] text-cyan-200/80">
          Schritt 4
        </p>
        <h2 className="text-3xl font-semibold md:text-4xl">
          Zusammenfassung
        </h2>
        <p className="text-lg text-slate-200/80 md:text-xl">
          Bitte prüfen Sie Ihre Angaben. Sie können später jederzeit Änderungen
          vornehmen.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { label: "Rolle", value: roleLabel[role] },
          { label: "Name", value: fullName },
          { label: "Stadt / Ort", value: city },
          { label: "Geburtsjahr", value: birthYear },
        ].map((item) => (
          <div
            key={item.label}
            className="glass-surface rounded-2xl border border-white/10 p-4"
          >
            <p className="text-sm uppercase tracking-wider text-slate-200/60">
              {item.label}
            </p>
            <p className="text-lg font-semibold text-white md:text-xl">
              {item.value || "—"}
            </p>
          </div>
        ))}
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left text-base text-slate-200/90 md:text-lg">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => onAgreeChange(e.target.checked)}
          className="mt-1 h-5 w-5 rounded border-white/30 bg-white/10 text-cyan-400 focus:ring-cyan-300"
        />
        <span>Meine Angaben sind korrekt.</span>
      </label>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-slate-200/80 underline-offset-4 hover:underline md:text-base"
        >
          Zurück
        </button>
        <motion.button
          type="button"
          onClick={onSubmit}
          disabled={!agreed || loading}
          whileHover={{ scale: agreed && !loading ? 1.01 : 1 }}
          whileTap={{ scale: agreed && !loading ? 0.99 : 1 }}
          className="soft-gradient inline-flex items-center justify-center gap-3 rounded-full px-6 py-3 text-base font-semibold text-slate-950 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 disabled:cursor-not-allowed disabled:opacity-40 md:px-8 md:py-3.5 md:text-lg"
        >
          {loading ? "Speichern ..." : "Onboarding abschließen"}
        </motion.button>
      </div>
    </div>
  );
}
