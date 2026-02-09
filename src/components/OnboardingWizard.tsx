"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { CardHeader } from "./ui/CardHeader";
import { ChoiceTile } from "./ui/ChoiceTile";
import { ButtonPrimary } from "./ui/ButtonPrimary";
import { ButtonSecondary } from "./ui/ButtonSecondary";
import { Loader } from "./ui/Loader";
import { signUpWithEmail, signInWithEmail } from "@/lib/authClient";
import { saveProfile } from "@/lib/profile";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { useEmailResend } from "@/lib/hooks/useEmailResend";
import { type AccountType, type OnboardingRole, type Profile, type ProviderKind } from "@/lib/types";
import { BRAND_EMAIL } from "@/lib/constants";
import { Sparkles, HandHeart, Building2 } from "lucide-react";
import { LocationStep } from "./onboarding/LocationStep";

type Step = "location" | "welcome" | "mode" | "auth" | "email-confirm" | "role" | "profile" | "contact" | "summary";

type AuthMode = "signup" | "signin" | null;

type OnboardingWizardProps = {
  initialProfile?: Profile | null;
  forcedStep?: Step | null;
  initialEmail?: string;
  initialRegion?: string;
  redirectTo?: string;
  initialMode?: AuthMode;
  isJustVerified?: boolean;
};

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || BRAND_EMAIL;

const isProfileComplete = (profile: Profile | null | undefined) => {
  return Boolean(
    profile?.full_name && profile.birthdate && profile.city && profile.account_type
  );
};

function inferOnboardingRole(profile: Profile | null | undefined): OnboardingRole | null {
  if (!profile?.account_type) return null;
  if (profile.account_type === "job_seeker") return "youth";
  if (profile.account_type === "job_provider") {
    return profile.provider_kind === "company" ? "company" : "adult";
  }
  return null;
}

// mapOnboardingRoleToAccount removed as logic moved to server action

export function OnboardingWizard({
  initialProfile,
  forcedStep = null,
  initialEmail = "",
  initialRegion = "",
  redirectTo,
  initialMode = null,
  isJustVerified = false,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(forcedStep || "welcome");
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  // If just verified, assume email is confirmed initially to show UI feedback
  const [emailConfirmed, setEmailConfirmed] = useState(isJustVerified);
  const [codeMessage, setCodeMessage] = useState<string | null>(null);
  // Unused state variables removed for linting
  // const [toastMsg, setToastMsg] = useState("");
  // const [toastType, setToastType] = useState<"success" | "error">("success");

  const [showCodeForm, setShowCodeForm] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  // Email resend hook
  const { cooldown: resendCooldown, message: resendMessage, error: resendError, loading: resendLoading, resend: handleResendConfirmation } = useEmailResend(email);

  // const [regions, setRegions] = useState<Region[]>([]);
  // const [regionsLoading, setRegionsLoading] = useState(true);

  // Initialize profile data. Important: prefer initialRegion/initialProfile city to ensure persistence.
  const [profileData, setProfileData] = useState({
    role: inferOnboardingRole(initialProfile),
    fullName: initialProfile?.full_name || "",
    birthdate: initialProfile?.birthdate || "",
    region: initialProfile?.city || initialRegion || "",
    marketId: initialProfile?.market_id || null,
    companyName: "",
    companyEmail: "",
    companyMessage: "",
  });

  // Regions fetch removed as unused


  // Make sure we jump to auth mode Step if initialMode is set
  useEffect(() => {
    if (initialMode && step === "welcome") {
      setStep("mode");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMode]);

  // If just verified, we may want to auto-advance after a short delay if profile is not complete
  useEffect(() => {
    if (isJustVerified && step === "email-confirm") {
      const timer = setTimeout(() => {
        // If profile is already complete, checkSessionAfterEmailConfirm (called by effect or manually) handles it.
        // But if we are just verifying, we likely need to fill profile.
        // Check if role is inferred, else go to role
        if (!initialProfile?.account_type) {
          setStep("role");
          setEmailConfirmed(false); // Clear the big success banner to focus on next step
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isJustVerified, step, initialProfile]);


  // handleResendConfirmation is now provided by useEmailResend hook

  const handleVerifyCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code) return;
    setLoading(true);
    setCodeError(null);
    try {
      const { error } = await supabaseBrowser.auth.verifyOtp({
        email,
        token: code,
        type: 'signup'
      });
      if (error) throw error;
      await checkSessionAfterEmailConfirm();
    } catch (err: unknown) {
      setCodeError(getErrorMessage(err, "Code ungültig."));
    } finally {
      setLoading(false);
    }
  };

  const checkSessionAfterEmailConfirm = useCallback(async () => {
    const { data: { user } } = await supabaseBrowser.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabaseBrowser
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const profileTyped = profile as Profile | null;
    const isComplete = isProfileComplete(profileTyped);
    const isConfirmed = !!user.email_confirmed_at; // Or checking session status

    if (isConfirmed && isComplete) {
      setEmailConfirmed(true);
      setTimeout(() => {
        router.push(redirectTo || "/app-home");
      }, 1000); // Give user a moment to see success
      return true;
    }

    if (isConfirmed) {
      setEmailConfirmed(true);
      // Small delay before moving on? Or immediate
      const timer = setTimeout(() => {
        if (profileTyped && !profileData.role) {
          const inferred = inferOnboardingRole(profileTyped);
          // Preserve existing state if present, only update if we got better data
          setProfileData((prev) => ({
            ...prev,
            role: inferred || prev.role,
            fullName: profileTyped.full_name || prev.fullName,
            birthdate: profileTyped.birthdate || prev.birthdate,
            region: profileTyped.city || prev.region, // Important: Don't overwrite with null if we have it locally
            marketId: profileTyped.market_id || prev.marketId,
          }));
          setStep("role");
        } else {
          setStep("role");
        }
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (profileTyped) {
      setProfileData((prev) => ({
        ...prev,
        role: inferOnboardingRole(profileTyped) || prev.role,
        fullName: profileTyped.full_name || prev.fullName,
        birthdate: profileTyped.birthdate || prev.birthdate,
        region: profileTyped.city || prev.region,
        marketId: profileTyped.market_id || prev.marketId,
      }));
    }
    return true;
  }, [router, redirectTo, profileData.role]); // Removed profileData dependency from callback to identify logic loop, but re-added safely


  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmail(email, password);
      router.push(redirectTo || "/app-home");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Anmeldung fehlgeschlagen."));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);
    try {
      await signUpWithEmail(email, password, {
        city: profileData.region,
        full_name: "",
        market_id: profileData.marketId
      });
      setStep("email-confirm");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Registrierung fehlgeschlagen."));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailConfirmation = async () => {
    setLoading(true);
    await checkSessionAfterEmailConfirm();
    setLoading(false);
  };

  const handleCompanyContact = async () => {
    setStep("summary");
  };

  // Import server action dynamically or at top-level. 
  // We need to move the import to top level in real code, but for this edit block i'll assume it's imported or I add it.
  // Actually, I cannot easily add imports at the top with this tool if I'm targeting this block.
  // I will use `require` or assume I need to do a separate edit for imports if strict ESM.
  // OR better: I will replace the whole file content in 2 chunks if needed, or 
  // I will just add the import in a separate tool call. 
  // Wait, I can't add imports easily without touching top of file.
  // I will use a multi-replace to add the import and update the component.

  const handleCompleteOnboarding = async () => {
    setIsSaving(true);
    setError(null);

    // Lazy import or assume it handles it? Next.js server actions can be imported.
    // I will need to make sure the import is present at the top of the file.
    // For now, I will use the standard import in standard way.
    // I'll rely on a second edit to add the import if I can't fit it here.

    try {
      if (!profileData.role) throw new Error("Keine Rolle ausgewählt.");

      const { completeOnboarding } = await import("@/app/onboarding/actions");

      const result = await completeOnboarding({
        full_name: profileData.fullName.trim(),
        birthdate: profileData.birthdate,
        city: profileData.region.trim(),
        market_id: profileData.marketId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        role: profileData.role as any,
        company_name: profileData.role === "company" ? profileData.companyName : undefined,
        company_email: profileData.role === "company" ? profileData.companyEmail : undefined,
        company_message: profileData.role === "company" ? profileData.companyMessage : undefined,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      router.push(redirectTo || "/app-home");
    } catch (err: unknown) {
      setError(
        getErrorMessage(err, "Speichern fehlgeschlagen. Bitte versuche es erneut.")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const nextStep = () => {
    if (step === "welcome") {
      setStep("mode");
    } else if (step === "mode") {
      if (mode === "signin") {
        setStep("auth");
      } else {
        setStep("location");
      }
    } else if (step === "location") {
      // Logic handled in LocationStep onComplete, but if we need a fallback:
      setStep("auth");
    } else if (step === "auth") {
      if (mode === "signup") {
        handleSignUp();
      } else {
        handleSignIn();
      }
    } else if (step === "email-confirm") {
      handleEmailConfirmation();
    } else if (step === "role") {
      if (!profileData.role) {
        setError("Bitte wähle eine Rolle aus.");
        return;
      }
      setStep("profile");
    } else if (step === "profile") {
      if (!profileData.fullName || !profileData.birthdate) {
        setError("Bitte fülle alle Felder aus.");
        return;
      }
      if (profileData.role === "company") {
        setStep("contact");
      } else {
        setStep("summary");
      }
    } else if (step === "contact") {
      handleCompanyContact();
    } else if (step === "summary") {
      handleCompleteOnboarding();
    }
  };

  const prevStep = () => {
    if (step === "mode") {
      setStep("welcome");
    } else if (step === "location") {
      setStep("mode");
    } else if (step === "auth") {
      if (mode === "signup") {
        setStep("location");
      } else {
        setStep("mode");
      }
    } else if (step === "profile") {
      setStep("role");
    } else if (step === "contact") {
      setStep("profile");
    } else if (step === "summary") {
      setStep("profile");
    }
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#07090f]">
      {/* Toast removed as unused */}


      {/* Glass Card Container */}
      <div className="relative z-10 max-w-2xl w-full">
        <AnimatePresence mode="wait">
          {/* Schritt 1: Willkommen */}
          {step === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="relative bg-white/10 backdrop-blur-[28px] backdrop-saturate-[180%] border border-white/10 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.75)] p-8 md:p-12 overflow-hidden">
                {/* Lichtkante */}
                <div className="pointer-events-none absolute -top-16 -left-16 w-56 h-56 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_60%)] opacity-70 mix-blend-screen" />
                {/* Subtile Textur */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-15 mix-blend-soft-light"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 40%, rgba(255,255,255,0.08) 60%, transparent 100%)",
                  }}
                />

                <div className="flex flex-col items-start gap-4 text-left">
                  <CardHeader
                    title="JobBridge"
                    subtitle="Sichere Taschengeldjobs zwischen Jugendlichen und Auftraggebern."
                    spacing="tight"
                  />
                  <p className="text-base text-slate-200/80 max-w-md">
                    Plattform mit verifizierten Aufgaben, klaren Schritten und seniorenfreundlicher Bedienung.
                  </p>
                  <div className="pt-2 w-full">
                    <ButtonPrimary onClick={nextStep} className="w-full">Jetzt starten</ButtonPrimary>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Schritt 2: Neu oder wiederkehrend */}
          {step === "mode" && (
            <motion.div
              key="mode"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="relative bg-white/10 backdrop-blur-[28px] backdrop-saturate-[180%] border border-white/10 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.75)] p-8 md:p-12 overflow-hidden">
                {/* Lichtkante */}
                <div className="pointer-events-none absolute -top-16 -left-16 w-56 h-56 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_60%)] opacity-70 mix-blend-screen" />
                {/* Subtile Textur */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-15 mix-blend-soft-light"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 40%, rgba(255,255,255,0.08) 60%, transparent 100%)",
                  }}
                />

                <CardHeader
                  title="Warst du schon bei JobBridge?"
                  subtitle="Damit wir dich richtig weiterleiten können."
                />

                {/* Choice Tiles */}
                <div className="grid gap-4 mb-8">
                  <ChoiceTile
                    onClick={() => {
                      setMode("signup");
                      setError(null);
                    }}
                    selected={mode === "signup"}
                  >
                    <div className="space-y-1">
                      <div className="text-lg font-semibold text-white">Ich bin neu hier</div>
                      <div className="text-sm text-slate-300">Ich möchte ein neues Konto erstellen.</div>
                    </div>
                  </ChoiceTile>
                  <ChoiceTile
                    onClick={() => {
                      setMode("signin");
                      setError(null);
                    }}
                    selected={mode === "signin"}
                  >
                    <div className="space-y-1">
                      <div className="text-lg font-semibold text-white">Ich war schon hier</div>
                      <div className="text-sm text-slate-300">Ich habe bereits ein Konto.</div>
                    </div>
                  </ChoiceTile>
                </div>

                {/* Navigation */}
                <div className="flex gap-4">
                  <ButtonSecondary onClick={prevStep} className="flex-1">
                    Zurück
                  </ButtonSecondary>
                  <ButtonPrimary onClick={nextStep} disabled={!mode} className="flex-1" loading={loading}>
                    Weiter
                  </ButtonPrimary>
                </div>
              </div>
            </motion.div>
          )}

          {/* Schritt 3 (optional): Location NUR wenn mode="signup" */}
          {step === "location" && (
            <motion.div
              key="location"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="relative bg-white/10 backdrop-blur-[28px] backdrop-saturate-[180%] border border-white/10 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.75)] p-8 md:p-12 overflow-hidden min-h-[400px]">
                {/* Lichtkante */}
                <div className="pointer-events-none absolute -top-16 -left-16 w-56 h-56 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_60%)] opacity-70 mix-blend-screen" />
                {/* Subtile Textur */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-15 mix-blend-soft-light"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 40%, rgba(255,255,255,0.08) 60%, transparent 100%)",
                  }}
                />
                <LocationStep
                  onComplete={(regionData) => {
                    setProfileData((prev) => ({
                      ...prev,
                      region: regionData.city,
                      marketId: regionData.region_live_id ?? null,
                    }));
                    setStep("auth");
                  }}
                />
                <div className="mt-8 flex justify-center">
                  <ButtonSecondary onClick={prevStep} className="w-full">
                    Zurück
                  </ButtonSecondary>
                </div>
              </div>
            </motion.div>
          )}

          {/* Schritt 3: E-Mail & Passwort */}
          {step === "auth" && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="relative bg-white/10 backdrop-blur-[28px] backdrop-saturate-[180%] border border-white/10 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.75)] p-8 md:p-12 overflow-hidden">
                {/* Lichtkante */}
                <div className="pointer-events-none absolute -top-16 -left-16 w-56 h-56 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_60%)] opacity-70 mix-blend-screen" />
                {/* Subtile Textur */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-15 mix-blend-soft-light"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 40%, rgba(255,255,255,0.08) 60%, transparent 100%)",
                  }}
                />

                <CardHeader
                  title="Dein Konto"
                  subtitle="Für Sicherheit und Identifikation erforderlich."
                />
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    nextStep();
                  }}
                  className="space-y-6"
                >
                  <div>
                    <label className="mb-2 block text-lg font-medium text-white">
                      E-Mail-Adresse
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-4 text-lg text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      placeholder="deine@email.de"
                      required
                    />
                    <p className="mt-2 text-sm text-slate-400">
                      Für Sicherheit und Identifikation erforderlich.
                    </p>
                  </div>
                  <div>
                    <label className="mb-2 block text-lg font-medium text-white">
                      Passwort
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-4 text-lg text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      placeholder={mode === "signup" ? "Mindestens 6 Zeichen" : "Dein Passwort"}
                      required
                      minLength={mode === "signup" ? 6 : undefined}
                    />
                    <p className="mt-2 text-sm text-slate-400">
                      Schützt deinen Zugang.
                    </p>
                  </div>
                  {error && (
                    <div className="rounded-2xl border border-rose-400/50 bg-rose-500/20 px-5 py-4 text-rose-100">
                      {error}
                    </div>
                  )}
                  <div className="flex gap-4">
                    <ButtonSecondary onClick={prevStep} className="flex-1">
                      Zurück
                    </ButtonSecondary>
                    <ButtonPrimary type="submit" className="flex-1" loading={loading}>
                      {mode === "signup" ? "Registrieren" : "Anmelden"}
                    </ButtonPrimary>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* Schritt 4: E-Mail-Bestätigung */}
          {step === "email-confirm" && (
            <motion.div
              key="email-confirm"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="relative bg-white/10 backdrop-blur-[28px] backdrop-saturate-[180%] border border-white/10 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.75)] p-8 md:p-12 overflow-hidden">
                {/* Lichtkante */}
                <div className="pointer-events-none absolute -top-16 -left-16 w-56 h-56 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_60%)] opacity-70 mix-blend-screen" />
                {/* Subtile Textur */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-15 mix-blend-soft-light"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 40%, rgba(255,255,255,0.08) 60%, transparent 100%)",
                  }}
                />

                <div className="text-center space-y-4 max-w-lg mx-auto">
                  <CardHeader
                    title="Bestätige deine E-Mail"
                    subtitle="Wir haben dir einen Bestätigungslink geschickt. Ohne Bestätigung oder Eingabe eines Codes kannst du nicht fortfahren."
                    showLogo
                    spacing="compact"
                  />
                  {emailConfirmed && (
                    <div className="rounded-2xl border border-green-400/50 bg-green-500/20 px-5 py-4 text-green-100">
                      E-Mail erfolgreich bestätigt! Du wirst weitergeleitet...
                    </div>
                  )}
                  {!emailConfirmed && (
                    <>
                      {loading && <Loader text="Session wird geprüft..." />}
                      <div className="space-y-4 mt-2">
                        <ButtonPrimary onClick={handleEmailConfirmation} loading={loading} className="w-full h-14 text-lg font-semibold shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                          Weiter prüfen
                        </ButtonPrimary>
                        <div className="flex flex-col gap-3">
                          <ButtonSecondary onClick={handleResendConfirmation} className="w-full" disabled={resendCooldown > 0 || resendLoading}>
                            {resendCooldown > 0 ? `Erneut senden (${resendCooldown}s)` : "Bestätigung erneut senden"}
                          </ButtonSecondary>
                          <ButtonSecondary
                            onClick={() => {
                              setShowCodeForm((prev) => !prev);
                              setCodeError(null);
                              setCodeMessage(null);
                            }}
                            className="w-full"
                          >
                            {showCodeForm ? "Code-Eingabe schließen" : "Mit Code bestätigen"}
                          </ButtonSecondary>
                        </div>
                      </div>
                      {/* emailStatus removed */}
                      {(resendMessage || resendError) && (
                        <p className={`text-sm mt-2 font-medium ${resendError ? 'text-red-300' : 'text-cyan-200/90'}`}>
                          {resendError || resendMessage}
                        </p>
                      )}
                      {showCodeForm && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          className="mt-6 space-y-4 rounded-3xl border border-white/20 bg-white/5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 relative overflow-hidden group"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                          <div className="flex items-center justify-between relative z-10">
                            <label className="text-base font-medium text-white/90">Bestätigungscode eingeben</label>
                          </div>

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 relative z-10">
                            <input
                              type="text"
                              onChange={(e) => {
                                const raw = e.target.value.replace(/[^0-9]/g, "");
                                setCode(raw.slice(0, 8));
                                setCodeError(null);
                                setCodeMessage(null);
                              }}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={8}
                              className={`min-w-0 flex-1 rounded-2xl border ${codeError ? "border-rose-400/50 bg-rose-500/10 focus:ring-rose-500/30" : "border-white/20 bg-black/20 focus:border-cyan-400/50 focus:ring-cyan-400/30"} px-5 py-4 text-center text-xl tracking-[0.35em] text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all`}
                              placeholder="12345678"
                              value={code}
                              autoFocus
                            // disabled={codeLocked}
                            />
                            <ButtonSecondary
                              onClick={handleVerifyCode}
                              className="w-full sm:w-auto flex-shrink-0 h-14 px-6 font-medium whitespace-nowrap"
                              disabled={loading || code.length < 8 /* || codeLocked */}
                            >
                              Code prüfen
                            </ButtonSecondary>
                          </div>

                          {codeError && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-sm text-rose-300 bg-rose-950/30 px-3 py-2 rounded-lg border border-rose-500/20 inline-block"
                            >
                              {codeError}
                            </motion.div>
                          )}
                          {codeMessage && (
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-sm text-green-300 font-medium bg-green-900/20 px-3 py-2 rounded-lg border border-green-500/20 inline-block"
                            >
                              {codeMessage}
                            </motion.p>
                          )}
                        </motion.div>
                      )}
                    </>
                  )}
                  {error && (
                    <div className="rounded-2xl border border-rose-400/50 bg-rose-500/20 px-5 py-4 text-rose-100">
                      {error}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Schritt 5: Rollenwahl */}
          {step === "role" && (
            <motion.div
              key="role"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="relative bg-white/10 backdrop-blur-[28px] backdrop-saturate-[180%] border border-white/10 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.75)] p-8 md:p-12 overflow-hidden">
                {/* Lichtkante */}
                <div className="pointer-events-none absolute -top-16 -left-16 w-56 h-56 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_60%)] opacity-70 mix-blend-screen" />
                {/* Subtile Textur */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-15 mix-blend-soft-light"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 40%, rgba(255,255,255,0.08) 60%, transparent 100%)",
                  }}
                />

                <CardHeader
                  title="Welche Rolle passt zu dir?"
                />

                {/* Choice Tiles */}
                <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2">
                  {[
                    {
                      value: "youth" as OnboardingRole,
                      title: "Jugendliche/r",
                      description: "Ich suche Taschengeldjobs",
                      icon: <Sparkles className="h-6 w-6 text-amber-300" />,
                    },
                    {
                      value: "adult" as OnboardingRole,
                      title: "Privatperson / Eltern / Anbieter",
                      description: "Ich möchte Aufträge vergeben",
                      icon: <HandHeart className="h-6 w-6 text-cyan-300" />,
                    },
                    {
                      value: "company" as OnboardingRole,
                      title: "Organisation / Unternehmen",
                      description: "Ich vertrete ein Unternehmen",
                      icon: <Building2 className="h-6 w-6 text-indigo-300" />,
                    },
                  ].map((role, idx) => {
                    const active = profileData.role === role.value;
                    return (
                      <ChoiceTile
                        key={role.value}
                        onClick={() => {
                          setProfileData((prev) => ({ ...prev, role: role.value }));
                          setError(null);
                        }}
                        selected={active}
                        className={`h-full ${idx === 2 ? "sm:col-span-2" : ""}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/10">
                            {role.icon}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="text-base font-semibold text-white leading-tight break-words sm:text-lg">
                              {role.title}
                            </div>
                            <div className="text-sm text-slate-300 leading-snug">
                              {role.description}
                            </div>
                          </div>
                        </div>
                      </ChoiceTile>
                    );
                  })}
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mb-6 rounded-2xl border border-rose-400/50 bg-rose-500/20 px-5 py-4 text-rose-100 text-center">
                    {error}
                  </div>
                )}

                {/* Continue Button */}
                <ButtonPrimary onClick={nextStep} disabled={!profileData.role} className="w-full">
                  Weiter
                </ButtonPrimary>
              </div>
            </motion.div>
          )}

          {/* Schritt 6: Profil-Daten */}
          {step === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="relative bg-white/10 backdrop-blur-[28px] backdrop-saturate-[180%] border border-white/10 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.75)] p-8 md:p-12 overflow-hidden">
                {/* Lichtkante */}
                <div className="pointer-events-none absolute -top-16 -left-16 w-56 h-56 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_60%)] opacity-70 mix-blend-screen" />
                {/* Subtile Textur */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-15 mix-blend-soft-light"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 40%, rgba(255,255,255,0.08) 60%, transparent 100%)",
                  }}
                />

                <CardHeader
                  title="Erzähl uns etwas über dich"
                />
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    nextStep();
                  }}
                  className="space-y-6"
                >
                  <div>
                    <label className="mb-2 block text-lg font-medium text-white">
                      Name
                    </label>
                    <input
                      type="text"
                      value={profileData.fullName}
                      onChange={(e) =>
                        setProfileData((prev) => ({ ...prev, fullName: e.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-4 text-lg text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      placeholder="Max Mustermann"
                      required
                    />
                    <p className="mt-2 text-sm text-slate-400">
                      Damit wir dich korrekt ansprechen können.
                    </p>
                  </div>
                  <div>
                    <label className="mb-2 block text-lg font-medium text-white">
                      Geburtsdatum
                    </label>
                    <input
                      type="date"
                      value={profileData.birthdate}
                      onChange={(e) =>
                        setProfileData((prev) => ({ ...prev, birthdate: e.target.value }))
                      }
                      className="w-full appearance-none shadow-none [color-scheme:dark] rounded-2xl border border-white/20 bg-white/5 px-5 py-4 text-lg text-white invalid:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      required
                    />
                    <p className="mt-2 text-sm text-slate-400">
                      Erforderlich für Jugendschutz.
                    </p>
                  </div>

                  {/* Region selection removed from this step as it is handled at the start */}
                  {error && (
                    <div className="rounded-2xl border border-rose-400/50 bg-rose-500/20 px-5 py-4 text-rose-100">
                      {error}
                    </div>
                  )}
                  <div className="flex gap-4">
                    <ButtonSecondary onClick={prevStep} className="flex-1">
                      Zurück
                    </ButtonSecondary>
                    <ButtonPrimary type="submit" className="flex-1">
                      Weiter
                    </ButtonPrimary>
                  </div>
                </form>
              </div>
            </motion.div>
          )
          }

          {/* Schritt 7: Company-Kontakt */}
          {
            step === "contact" && (
              <motion.div
                key="contact"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <div className="relative bg-white/10 backdrop-blur-[28px] backdrop-saturate-[180%] border border-white/10 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.75)] p-8 md:p-12 overflow-hidden">
                  {/* Lichtkante */}
                  <div className="pointer-events-none absolute -top-16 -left-16 w-56 h-56 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_60%)] opacity-70 mix-blend-screen" />
                  {/* Subtile Textur */}
                  <div
                    className="pointer-events-none absolute inset-0 opacity-15 mix-blend-soft-light"
                    style={{
                      backgroundImage:
                        "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 40%, rgba(255,255,255,0.08) 60%, transparent 100%)",
                    }}
                  />

                  <CardHeader
                    title="Kontaktiere uns"
                    subtitle="Für Unternehmen schalten wir Zugänge manuell frei."
                  />
                  {isSaving ? (
                    <Loader text="Wird gespeichert..." />
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleCompanyContact();
                      }}
                      className="space-y-6"
                    >
                      <div>
                        <label className="mb-2 block text-lg font-medium text-white">
                          Firmenname / Organisation
                        </label>
                        <input
                          type="text"
                          value={profileData.companyName}
                          onChange={(e) =>
                            setProfileData((prev) => ({ ...prev, companyName: e.target.value }))
                          }
                          className="w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-4 text-lg text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          placeholder="Musterfirma GmbH"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-lg font-medium text-white">
                          E-Mail-Adresse
                        </label>
                        <input
                          type="email"
                          value={profileData.companyEmail}
                          onChange={(e) =>
                            setProfileData((prev) => ({ ...prev, companyEmail: e.target.value }))
                          }
                          className="w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-4 text-lg text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          placeholder="kontakt@firma.de"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-lg font-medium text-white">
                          Nachricht
                        </label>
                        <textarea
                          value={profileData.companyMessage}
                          onChange={(e) =>
                            setProfileData((prev) => ({ ...prev, companyMessage: e.target.value }))
                          }
                          rows={5}
                          className="w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-4 text-lg text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          placeholder="Erzähl uns kurz, was du suchst oder anbietest..."
                          required
                        />
                      </div>
                      {error && (
                        <div className="rounded-2xl border border-rose-400/50 bg-rose-500/20 px-5 py-4 text-rose-100">
                          {error}
                          <button
                            onClick={handleCompanyContact}
                            className="mt-2 text-sm underline text-rose-200 hover:text-rose-100"
                          >
                            Noch einmal versuchen
                          </button>
                        </div>
                      )}
                      <div className="flex gap-4">
                        <ButtonSecondary onClick={prevStep} className="flex-1">
                          Zurück
                        </ButtonSecondary>
                        <ButtonPrimary type="submit" className="flex-1" loading={isSaving}>
                          Absenden
                        </ButtonPrimary>
                      </div>
                      <div className="text-center text-sm text-slate-400">
                        Oder schreibe uns direkt an:{" "}
                        <a
                          href={`mailto:${CONTACT_EMAIL}`}
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          {CONTACT_EMAIL}
                        </a>
                      </div>
                    </form>
                  )}
                </div>
              </motion.div>
            )
          }

          {/* Schritt 8: Zusammenfassung */}
          {
            step === "summary" && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <div className="relative bg-white/10 backdrop-blur-[28px] backdrop-saturate-[180%] border border-white/10 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.75)] p-8 md:p-12 overflow-hidden">
                  {/* Lichtkante */}
                  <div className="pointer-events-none absolute -top-16 -left-16 w-56 h-56 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_60%)] opacity-70 mix-blend-screen" />
                  {/* Subtile Textur */}
                  <div
                    className="pointer-events-none absolute inset-0 opacity-15 mix-blend-soft-light"
                    style={{
                      backgroundImage:
                        "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 40%, rgba(255,255,255,0.08) 60%, transparent 100%)",
                    }}
                  />

                  <CardHeader
                    title="Überblick vor dem Start"
                    subtitle="So sehen Auftraggeber dein Profil auf den ersten Blick."
                  />
                  {isSaving ? (
                    <Loader text="Wird gespeichert..." />
                  ) : (
                    <>
                      <div className="space-y-3 text-left">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-300/80">Übersicht</p>
                        <div className="glass-card rounded-2xl border border-white/20 bg-white/5 p-7 space-y-5">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-sm text-slate-400">Rolle</div>
                              <div className="text-xl font-semibold text-white">
                                {profileData.role === "youth" && "Jobsuchende/r (unter 18)"}
                                {profileData.role === "adult" && "Jobanbieter (ab 18)"}
                                {profileData.role === "company" && "Unternehmen / Organisation"}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setStep("profile")}
                              className="text-sm text-cyan-200 underline-offset-4 hover:underline"
                            >
                              Bearbeiten
                            </button>
                          </div>
                          <div>
                            <div className="text-sm text-slate-400">Name</div>
                            <div className="text-xl font-semibold text-white">{profileData.fullName}</div>
                          </div>
                          <div>
                            <div className="text-sm text-slate-400">Region</div>
                            <div className="text-xl font-semibold text-white">{profileData.region}</div>
                          </div>
                        </div>
                      </div>
                      {error && (
                        <div className="rounded-2xl border border-rose-400/50 bg-rose-500/20 px-5 py-4 text-rose-100">
                          {error}
                          <button
                            onClick={handleCompleteOnboarding}
                            className="mt-2 text-sm underline text-rose-200 hover:text-rose-100"
                          >
                            Noch einmal versuchen
                          </button>
                        </div>
                      )}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-8">
                        <ButtonSecondary onClick={() => setStep("profile")}>Daten bearbeiten</ButtonSecondary>
                        <ButtonPrimary onClick={handleCompleteOnboarding} className="sm:w-40" loading={isSaving}>
                          Start
                        </ButtonPrimary>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )
          }
        </AnimatePresence >

      </div >
    </div >
  );
}
