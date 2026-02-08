"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Building2, HandHeart, Sparkles, UserRound } from "lucide-react";
import { OnboardingRole } from "@/lib/types";

const roles: Array<{
  value: OnboardingRole;
  title: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    value: "youth",
    title: "Jugendliche/r Jobsuchende/r",
    description: "Taschengeldjobs finden, sicher begleitet.",
    icon: <Sparkles className="h-6 w-6 text-amber-300" />,
  },
  {
    value: "adult",
    title: "Privatperson (ich biete Jobs an)",
    description: "Haushalt, Betreuung oder Nachhilfe anbieten.",
    icon: <HandHeart className="h-6 w-6 text-cyan-300" />,
  },
  {
    value: "senior",
    title: "Senior/in – ich suche Unterstützung",
    description: "Einfach Hilfe im Alltag finden, besonders verständlich.",
    icon: <UserRound className="h-6 w-6 text-pink-200" />,
  },
  {
    value: "company",
    title: "Unternehmen / Organisation",
    description: "Jobs anbieten und Bewerbungen verwalten.",
    icon: <Building2 className="h-6 w-6 text-indigo-300" />,
  },
];

type StepRoleProps = {
  selectedRole: OnboardingRole | null;
  onSelect: (role: OnboardingRole) => void;
  onNext: () => void;
  onBack?: () => void;
};

export function StepRole({
  onNext,
  selectedRole,
  onSelect,
  onBack,
}: StepRoleProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.24em] text-cyan-200/80">
          Schritt 2
        </p>
        <h2 className="text-3xl font-semibold md:text-4xl">Wer sind Sie?</h2>
        <p className="text-lg text-slate-200/80 md:text-xl">
          Wählen Sie die Option, die am besten zu Ihnen passt. Sie können Ihre
          Auswahl später jederzeit anpassen.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((role) => {
          const active = selectedRole === role.value;
          return (
            <motion.button
              type="button"
              key={role.value}
              onClick={() => onSelect(role.value)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={`glass-surface flex h-full flex-col items-start gap-3 rounded-2xl border border-white/10 p-5 text-left transition ${
                active
                  ? "bg-white/5 ring-2 ring-cyan-300/80"
                  : "hover:border-white/30"
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
                {role.icon}
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold">{role.title}</p>
                <p className="text-base text-slate-200/80">
                  {role.description}
                </p>
              </div>
              <div className="mt-auto text-sm text-cyan-200/90">
                {active ? "Ausgewählt" : "Antippen zum Auswählen"}
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-slate-200/80 underline-offset-4 hover:underline md:text-base"
          >
            Zurück
          </button>
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={!selectedRole}
          className="soft-gradient inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-semibold text-slate-950 transition hover:scale-[1.01] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 disabled:cursor-not-allowed disabled:opacity-40 md:px-8 md:py-3.5 md:text-lg"
        >
          Weiter
        </button>
      </div>
    </div>
  );
}
