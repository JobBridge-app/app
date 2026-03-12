"use client";

import { useMemo, useState, useEffect } from "react";
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
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    birthdate?: string;
    city?: string;
  }>({});
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

  // Live validation for age for immediate UX feedback
  useEffect(() => {
    if (step === "profile" && data.birthdate && data.role) {
      const d = new Date(data.birthdate);
      if (Number.isNaN(d.getTime())) return;
      const now = new Date();
      let age = now.getFullYear() - d.getFullYear();
      const m = now.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;

      if (data.role === "youth" && age >= 21) {
        setFieldErrors((prev) => ({ ...prev, birthdate: "Als Jugendliche/r oder junge/r Erwachsene/r musst du unter 21 Jahre alt sein." }));
      } else if (data.role !== "youth" && age < 18) {
        setFieldErrors((prev) => ({ ...prev, birthdate: "Für diese Rolle musst du mindestens 18 Jahre alt sein." }));
      } else {
        setFieldErrors((prev) => {
          if (!prev.birthdate) return prev;
          const { birthdate, ...rest } = prev;
          return rest;
        });
      }
    }
  }, [data.birthdate, data.role, step]);

  const validate = (current: StepKey) => {
    setGlobalError(null);
    setFieldErrors({});

    if (current === "role" && !data.role) {
      setGlobalError("Bitte wählen Sie eine Rolle aus.");
      return false;
    }
    if (current === "profile") {
      let isValid = true;
      const newErrors: typeof fieldErrors = {};

      if (!data.fullName.trim()) {
        newErrors.fullName = "Bitte geben Sie Ihren vollständigen Namen an.";
        isValid = false;
      }
      if (!data.city.trim()) {
        newErrors.city = "Bitte geben Sie Ihren Wohnort an.";
        isValid = false;
      }

      if (!data.birthdate) {
        newErrors.birthdate = "Bitte geben Sie Ihr Geburtsdatum an.";
        isValid = false;
      } else {
        const d = new Date(data.birthdate);
        const now = new Date();
        let age = now.getFullYear() - d.getFullYear();
        const m = now.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;

        if (data.role === "youth" && age >= 21) {
          newErrors.birthdate = "Als Jugendliche/r oder junge/r Erwachsene/r musst du unter 21 Jahre alt sein.";
          isValid = false;
        } else if (data.role !== "youth" && age < 18) {
           newErrors.birthdate = "Für diese Rolle musst du mindestens 18 Jahre alt sein.";
           isValid = false;
        }
      }

      if (!isValid) {
        setFieldErrors(newErrors);
        return false;
      }
    }
    if (current === "summary" && !data.agreed) {
      setGlobalError("Bitte bestätigen Sie, dass Ihre Angaben korrekt sind.");
      return false;
    }
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
      setGlobalError(null);
      setFieldErrors({});
    }
  };

  const completeOnboarding = async () => {
    if (!data.role) {
      setGlobalError("Bitte wählen Sie eine Rolle aus.");
      return;
    }
    setLoading(true);
    setGlobalError(null);
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
      setGlobalError(
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
              errors={fieldErrors}
              onChange={(field, value) => {
                setData((prev) => ({ ...prev, [field]: value }));
                // Clear specific error on type for immediate UX feedback
                if (fieldErrors[field]) {
                  setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
                }
              }}
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
      {globalError && (
        <div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 md:text-base">
          {globalError}
        </div>
      )}
    </OnboardingLayout>
  );
}
