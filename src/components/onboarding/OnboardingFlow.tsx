"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { OnboardingLayout } from "./OnboardingLayout";
import { StepWelcome } from "./StepWelcome";
import { StepRole } from "./StepRole";
import { StepProfile } from "./StepProfile";
import { StepSummary } from "./StepSummary";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { type AccountType, type OnboardingRole, Profile, type ProviderKind } from "@/lib/types";
import { saveProfile } from "@/lib/profile";

type StepKey = "welcome" | "role" | "profile" | "summary";

const steps: StepKey[] = ["welcome", "role", "profile", "summary"];

type OnboardingFlowProps = {
  userId: string;
  initialProfile: Profile | null;
};

export function OnboardingFlow({
  userId,
  initialProfile,
}: OnboardingFlowProps) {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const router = useRouter();

  const [step, setStep] = useState<StepKey>("welcome");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    role: OnboardingRole | null;
    fullName: string;
    birthdate: string;
    city: string;
    agreed: boolean;
  }>({
    role: initialProfile?.account_type ? (initialProfile.account_type === "job_provider" ? (initialProfile.provider_kind === "company" ? "company" : "adult") : "youth") : null,
    fullName: initialProfile?.full_name ?? "",
    birthdate: initialProfile?.birthdate ?? "",
    city: initialProfile?.city ?? "",
    agreed: false,
  });

  const stepIndex = steps.indexOf(step);

  const validate = (current: StepKey) => {
    if (current === "role" && !data.role) {
      setError("Bitte wählen Sie eine Rolle aus.");
      return false;
    }
    if (
      current === "profile" &&
      (!data.fullName.trim() || !data.birthdate || !data.city.trim())
    ) {
      setError("Bitte füllen Sie alle Felder aus.");
      return false;
    }
    if (current === "summary" && !data.agreed) {
      setError("Bitte bestätigen Sie, dass Ihre Angaben korrekt sind.");
      return false;
    }
    setError(null);
    return true;
  };

  const nextStep = () => {
    if (!validate(step)) return;
    if (step === "summary") {
      completeOnboarding();
      return;
    }
    setStep(steps[Math.min(stepIndex + 1, steps.length - 1)]);
  };

  const prevStep = () => {
    if (stepIndex > 0) {
      setStep(steps[stepIndex - 1]);
      setError(null);
    }
  };

  const completeOnboarding = async () => {
    if (!data.role) {
      setError("Bitte wählen Sie eine Rolle aus.");
      return;
    }
    setLoading(true);
    setError(null);
    const mapped: { account_type: AccountType; provider_kind: ProviderKind | null } =
      data.role === "youth"
        ? { account_type: "job_seeker", provider_kind: null }
        : (data.role === "company"
          ? { account_type: "job_provider", provider_kind: "company" }
          : { account_type: "job_provider", provider_kind: "private" });

    const payload = {
      id: userId,
      full_name: data.fullName.trim(),
      birthdate: data.birthdate,
      city: data.city.trim(),
      ...mapped,
    };

    try {
      await saveProfile(supabase, payload);
      router.push("/home");
    } catch (saveError) {
      console.error(saveError);
      setError(
        "Speichern fehlgeschlagen. Bitte später erneut versuchen oder Support kontaktieren."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout
      stepCount={steps.length}
      stepIndex={stepIndex}
      showProgress={step !== "welcome"}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {step === "welcome" && <StepWelcome onStart={() => setStep("role")} />}
          {step === "role" && (
            <StepRole
              selectedRole={data.role}
              onSelect={(role) => setData((prev) => ({ ...prev, role }))}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {step === "profile" && (
            <StepProfile
              role={data.role}
              fullName={data.fullName}
              birthdate={data.birthdate}
              city={data.city}
              onChange={(field, value) =>
                setData((prev) => ({ ...prev, [field]: value }))
              }
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {step === "summary" && data.role && (
            <StepSummary
              role={data.role}
              fullName={data.fullName}
              birthdate={data.birthdate}
              city={data.city}
              agreed={data.agreed}
              onAgreeChange={(value) =>
                setData((prev) => ({ ...prev, agreed: value }))
              }
              onSubmit={nextStep}
              onBack={prevStep}
              loading={loading}
            />
          )}
        </motion.div>
      </AnimatePresence>
      {error && (
        <div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 md:text-base">
          {error}
        </div>
      )}
    </OnboardingLayout>
  );
}
