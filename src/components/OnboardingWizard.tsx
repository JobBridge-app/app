"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
import { Sparkles, HandHeart, Building2, Mail, UserX, KeyRound } from "lucide-react";
import { LocationStep } from "./onboarding/LocationStep";
import { checkEmailExists, ensureConfirmationEmailTemplate } from "@/lib/authServerActions";
import { CinematicDateInput } from "@/components/ui/CinematicDateInput";
import type { User } from "@supabase/supabase-js";

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
  reserveFooterSpace?: boolean;
};

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

const normalizeEmail = (value: string | null | undefined) => value?.trim().toLowerCase() || "";
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  reserveFooterSpace = false,
}: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>(forcedStep || "welcome");
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorType, setErrorType] = useState<"account_not_found" | "wrong_password" | "general" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  // Password reset state
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  // If just verified, assume email is confirmed initially to show UI feedback
  const [emailConfirmed, setEmailConfirmed] = useState(isJustVerified);
  const [codeMessage, setCodeMessage] = useState<string | null>(null);
  // Unused state variables removed for linting
  // const [toastMsg, setToastMsg] = useState("");
  // const [toastType, setToastType] = useState<"success" | "error">("success");

  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  // Email resend hook
  const {
    cooldown: resendCooldown,
    message: resendMessage,
    error: resendError,
    loading: resendLoading,
    resend: handleResendConfirmation,
    markSent: markConfirmationEmailSent,
  } = useEmailResend(email);

  // const [regions, setRegions] = useState<Region[]>([]);
  // const [regionsLoading, setRegionsLoading] = useState(true);

  // Seitenscrolling auf Mobile verhindern
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

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




  // handleResendConfirmation is now provided by useEmailResend hook

  const handleVerifyCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (code.length < 8) return;
    setLoading(true);
    setCodeError(null);
    setCodeMessage(null);
    try {
      const { data, error } = await supabaseBrowser.auth.verifyOtp({
        email,
        token: code,
        type: 'signup'
      });
      if (error) throw error;
      const confirmed = await checkSessionAfterEmailConfirm(data.user ?? null);
      if (!confirmed) {
        throw new Error("Bestätigung war erfolgreich, aber die Sitzung konnte nicht übernommen werden. Bitte versuche es erneut.");
      }
    } catch (err: unknown) {
      setCodeError(getErrorMessage(err, "Code ungültig."));
    } finally {
      setLoading(false);
    }
  };

  const checkSessionAfterEmailConfirm = useCallback(async (verifiedUser?: User | null) => {
    const expectedEmail = normalizeEmail(email);
    let user = verifiedUser ?? null;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (user?.email_confirmed_at) {
        break;
      }

      const { data } = await supabaseBrowser.auth.getUser();
      user = data.user ?? user;
      if (!user?.email_confirmed_at) {
        await wait(250);
      }
    }

    if (!user) return false;

    const confirmedEmail = normalizeEmail(user.email);
    if (expectedEmail && confirmedEmail && confirmedEmail !== expectedEmail) {
      return false;
    }

    const { data: profile } = await supabaseBrowser
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const profileTyped = profile as Profile | null;
    const isComplete = isProfileComplete(profileTyped);
    const isConfirmed = !!user.email_confirmed_at;

    if (isConfirmed && isComplete) {
      setEmailConfirmed(true);
      setCodeMessage("Code bestätigt. Du wirst weitergeleitet...");
      setTimeout(() => {
        window.location.href = redirectTo || "/app-home";
      }, 1000); // Give user a moment to see success
      return true;
    }

    if (isConfirmed) {
      setEmailConfirmed(true);
      setCodeMessage("Code bestätigt. Bitte wähle jetzt deine Rolle.");
      setTimeout(() => {
        if (profileTyped) {
          setProfileData((prev) => ({
            ...prev,
            role: null,
            fullName: profileTyped.full_name || prev.fullName,
            birthdate: profileTyped.birthdate || prev.birthdate,
            region: profileTyped.city || prev.region,
            marketId: profileTyped.market_id || prev.marketId,
          }));
        } else {
          setProfileData((prev) => ({
            ...prev,
            role: null,
          }));
        }
        setStep("role");
      }, 1000);
      return true;
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
    return false;
  }, [email, redirectTo, profileData.role]);

  // Listen for Auth State Changes (Magic Link Clicked in another tab/window)
  useEffect(() => {
    if (step !== "email-confirm") return;

    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      if (session?.user.email_confirmed_at) {
          await checkSessionAfterEmailConfirm(session.user);
        }
      }
    });

    // Polling as backup (every 3s)
    const interval = setInterval(async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (session?.user.email_confirmed_at) {
        await checkSessionAfterEmailConfirm(session.user);
      }
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [step, checkSessionAfterEmailConfirm]);

  // If just verified, we auto-advance after a short delay
  useEffect(() => {
    if (isJustVerified && step === "email-confirm") {
      const timer = setTimeout(() => {
        checkSessionAfterEmailConfirm();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isJustVerified, step, checkSessionAfterEmailConfirm]);


  const handleSignIn = async () => {
    setLoading(true);
    setErrorType(null);
    setErrorMsg(null);
    setResetSuccess(false);

    try {
      // 1. Check if email exists
      const emailExists = await checkEmailExists(email);

      if (!emailExists) {
        setErrorType("account_not_found");
        setErrorMsg("Dieser Account existiert nicht. Möchtest du stattdessen ein neues Konto erstellen?");
        setLoading(false);
        return;
      }

      // 2. Email exists, try password sign in
      const { error } = await signInWithEmail(email, password);

      if (error) {
        setErrorType("wrong_password");
        setErrorMsg("Passwort falsch. Die Anmeldedaten stimmen nicht.");
        setLoading(false);
        return;
      }

      window.location.href = redirectTo || "/app-home";
    } catch (err: unknown) {
      setErrorType("general");
      setErrorMsg(getErrorMessage(err, "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es noch einmal."));
    } finally {
      if (!errorType) setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setErrorType("general");
      setErrorMsg("Bitte gib deine E-Mail oben ein, um das Passwort zurückzusetzen.");
      return;
    }
    setResettingPassword(true);
    setErrorType(null);
    setErrorMsg(null);
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");
      const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/update-password`,
      });
      if (error) throw error;
      setResetSuccess(true);
    } catch (err: unknown) {
      setErrorType("general");
      setErrorMsg(getErrorMessage(err, "Wir konnten leider keinen Link senden. Versuche es später nochmal."));
    } finally {
      setResettingPassword(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    setErrorType(null);
    setErrorMsg(null);
    setEmailConfirmed(false);
    setCodeError(null);
    try {
      const { error: signOutError } = await supabaseBrowser.auth.signOut();
      if (signOutError) throw signOutError;

      try {
        await ensureConfirmationEmailTemplate();
      } catch {
        // Continue with signup; template sync is best-effort for the emergency fallback.
      }

      const signUpData = {
        city: profileData.region,
        full_name: "",
        market_id: profileData.marketId
      };
      let { error } = await signUpWithEmail(email, password, signUpData);

      if (error?.message === "Error sending confirmation email") {
        const repaired = await ensureConfirmationEmailTemplate();
        if (repaired) {
          const retry = await signUpWithEmail(email, password, signUpData);
          error = retry.error;
        }
      }

      if (error) throw error;

      markConfirmationEmailSent("Bestätigungs-E-Mail mit Code wurde gesendet.");
      setCodeMessage(null);
      setStep("email-confirm");
    } catch (err: unknown) {
      setErrorType("general");
      setErrorMsg(getErrorMessage(err, "Registrierung fehlgeschlagen."));
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
    setErrorType(null);
    setErrorMsg(null);

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

      window.location.href = redirectTo || "/app-home";
    } catch (err: unknown) {
      setErrorType("general");
      setErrorMsg(getErrorMessage(err, "Speichern fehlgeschlagen. Bitte versuche es erneut."));
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
        setErrorType("general");
        setErrorMsg("Bitte wähle eine Rolle aus.");
        return;
      }
      setStep("profile");
    } else if (step === "profile") {
      if (!profileData.fullName || !profileData.birthdate) {
        setErrorType("general");
        setErrorMsg("Bitte fülle alle Felder aus.");
        return;
      }

      const d = new Date(profileData.birthdate);
      if (Number.isNaN(d.getTime())) {
        setErrorType("general");
        setErrorMsg("Bitte gib ein vollständiges Datum ein.");
        return;
      }

      const now = new Date();
      let age = now.getFullYear() - d.getFullYear();
      const m = now.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;

      // Clear existing errors since we made it to validation check
      setErrorMsg(null);
      setErrorType(null);

      if (profileData.role === "youth" && age >= 21) {
        setErrorType("general");
        setErrorMsg("Als Jugendliche/r oder junge/r Erwachsene/r musst du unter 21 Jahre alt sein.");
        return;
      } else if (profileData.role === "youth" && age < 14) {
        setErrorType("general");
        setErrorMsg("Du musst für JobBridge mindestens 14 Jahre alt sein.");
        return;
      } else if (profileData.role !== "youth" && age < 18) {
        setErrorType("general");
        setErrorMsg("Für diese Rolle musst du mindestens 18 Jahre alt sein.");
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
    setErrorType(null);
    setErrorMsg(null);
  };

  return (
    <div
      className={[
        "h-dvh flex justify-center overflow-y-auto overflow-x-hidden px-4 bg-[#07090f] no-scrollbar",
        reserveFooterSpace
          ? "py-4 pb-28 md:py-8 md:pb-24"
          : "py-4 md:py-8",
      ].join(" ")}
    >
      {/* Toast removed as unused */}


      {/* Glass Card Container */}
      <div
        className={[
          "relative z-10 my-auto w-full max-w-2xl",
        ].join(" ")}
      >
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
                      setErrorType(null);
                      setErrorMsg(null);
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
                      setErrorType(null);
                      setErrorMsg(null);
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
                    <label htmlFor="auth-email" className="mb-2 block text-lg font-medium text-white">
                      E-Mail-Adresse
                    </label>
                    <input
                      id="auth-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode="email"
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
                    <label htmlFor="auth-password" className="mb-2 block text-lg font-medium text-white">
                      Passwort
                    </label>
                    <input
                      id="auth-password"
                      name="password"
                      type="password"
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
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

                  <AnimatePresence mode="wait">
                    {resetSuccess ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                        animate={{ opacity: 1, height: "auto", scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                        className="rounded-3xl border border-emerald-400/50 bg-emerald-500/10 p-6 overflow-hidden relative group"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="flex flex-col items-center text-center gap-3 relative z-10">
                          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                            <Mail className="w-6 h-6 text-emerald-300" />
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-emerald-100 mb-1">E-Mail gesendet!</h4>
                            <p className="text-sm text-emerald-200/80">
                              Wir haben einen Link zum Zurücksetzen deines Passworts an <strong className="text-emerald-100">{email}</strong> geschickt.
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ) : errorType === "wrong_password" && mode === "signin" ? (
                      <motion.div
                        key="error-wrong-password"
                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                        animate={{ opacity: 1, height: "auto", scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                        className="rounded-3xl border border-rose-500/30 bg-[#120808]/80 backdrop-blur-md p-6 overflow-hidden shadow-[0_8px_32px_rgba(225,29,72,0.15)] relative group"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="flex flex-col gap-4 relative z-10">
                          <div className="flex items-start gap-4">
                            <div className="mt-1 w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/30 flex-shrink-0 shadow-[0_0_15px_rgba(225,29,72,0.2)]">
                              <KeyRound className="w-6 h-6 text-rose-400" />
                            </div>
                            <div>
                              <h4 className="text-base font-semibold text-rose-100 mb-1">Passwort falsch</h4>
                              <p className="text-sm text-rose-200/80 leading-relaxed">
                                {errorMsg}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 mt-3">
                            <ButtonPrimary
                              type="button"
                              onClick={handleResetPassword}
                              loading={resettingPassword}
                              className="w-full bg-rose-600 hover:bg-rose-500 text-white border-rose-500/50 shadow-[0_0_20px_rgba(225,29,72,0.3)] transition-all hover:shadow-[0_0_30px_rgba(225,29,72,0.5)] h-12"
                            >
                              Passwort Link anfordern
                            </ButtonPrimary>
                            <a
                              href={`mailto:support@jobbridge.app?subject=Hilfe bei Passwort (JobBridge)&body=Hallo Support-Team,%0D%0A%0D%0Amein Passwort für ${email} wird nicht akzeptiert.%0D%0A%0D%0ABitte helft mir weiter.`}
                              className="w-full h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/80 font-medium hover:bg-white/10 hover:text-white transition-all text-sm"
                            >
                              Support kontaktieren
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    ) : errorType === "account_not_found" && mode === "signin" ? (
                      <motion.div
                        key="error-not-found"
                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                        animate={{ opacity: 1, height: "auto", scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                        className="rounded-3xl border border-amber-500/30 bg-[#140D05]/80 backdrop-blur-md p-6 overflow-hidden shadow-[0_8px_32px_rgba(245,158,11,0.1)] relative group"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="flex flex-col gap-4 relative z-10">
                          <div className="flex items-start gap-4">
                            <div className="mt-1 w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30 flex-shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                              <UserX className="w-6 h-6 text-amber-400" />
                            </div>
                            <div>
                              <h4 className="text-base font-semibold text-amber-100 mb-1">Account nicht gefunden</h4>
                              <p className="text-sm text-amber-200/80 leading-relaxed">
                                {errorMsg}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 mt-3">
                            <ButtonPrimary
                              type="button"
                              onClick={() => {
                                setMode("signup");
                                setStep("mode"); // First they choose they are new, then we want them to go to the onboarding flow starting point properly.
                                // Actually, if we just setStep("location"), it goes precisely to the "Wo möchtest du JobBridge nutzen" step.
                                setStep("location");
                                setErrorType(null);
                                setErrorMsg(null);
                              }}
                              className="w-full bg-amber-600 hover:bg-amber-500 text-white border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] h-12"
                            >
                              Jetzt registrieren
                            </ButtonPrimary>
                            <a
                              href={`mailto:support@jobbridge.app?subject=Account nicht gefunden (JobBridge)&body=Hallo Support-Team,%0D%0A%0D%0Aich versuche mich mit ${email} anzumelden, aber der Account existiert angeblich nicht.%0D%0A%0D%0ABitte helft mir weiter.`}
                              className="w-full h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/80 font-medium hover:bg-white/10 hover:text-white transition-all text-sm"
                            >
                              Support kontaktieren
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    ) : errorType === "general" ? (
                      <motion.div
                        key="error-general"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <div className="rounded-2xl border border-rose-400/50 bg-rose-500/20 px-5 py-4 text-rose-100">
                          {errorMsg}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  <div className="flex gap-4">
                    <ButtonSecondary disabled={resettingPassword} onClick={prevStep} className="flex-1">
                      Zurück
                    </ButtonSecondary>
                    <ButtonPrimary disabled={resettingPassword} type="submit" className="flex-1" loading={loading}>
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
                    subtitle="Wir haben dir eine Bestätigungs-E-Mail geschickt. Bitte bestätige dich jetzt mit dem Code."
                    showLogo
                    spacing="compact"
                  />
                  {emailConfirmed && (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-green-400/50 bg-green-500/20 px-5 py-4 text-green-100">
                        E-Mail erfolgreich bestätigt! Du wirst weitergeleitet...
                      </div>
                      {/* Fallback button if redirect hangs */}
                      <ButtonPrimary
                        onClick={() => checkSessionAfterEmailConfirm()}
                        loading={loading}
                        className="w-full h-12 bg-green-600 hover:bg-green-500 text-white"
                      >
                        Weiter
                      </ButtonPrimary>
                    </div>
                  )}
                  {!emailConfirmed && (
                    <>
                      {loading && <Loader text="Session wird geprüft..." />}
                      <div className="mt-3 space-y-5 text-left">
                        <div className="space-y-2">
                          <ButtonSecondary
                            disabled
                            className="w-full h-12 border-white/10 text-white/35 line-through decoration-2 decoration-white/35"
                          >
                            Per Link bestätigen
                          </ButtonSecondary>
                          <p className="px-1 text-center text-[11px] leading-5 text-slate-500">
                            Link-Bestätigung ist vorübergehend nicht verfügbar. Bitte nutze den Code aus deiner E-Mail.
                          </p>
                        </div>

                        <form onSubmit={handleVerifyCode} className="space-y-3 rounded-[1.75rem] border border-white/12 bg-black/15 p-4">
                          <div className="flex items-center">
                            <label htmlFor="email-confirmation-code" className="text-sm font-semibold text-white">
                              Mit Code bestätigen
                            </label>
                          </div>

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <input
                              id="email-confirmation-code"
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
                              className={`min-w-0 flex-1 rounded-2xl border ${codeError ? "border-rose-400/50 bg-rose-500/10 focus:ring-rose-500/25" : "border-white/15 bg-[#0F0F12] focus:border-cyan-300/40 focus:ring-cyan-300/20"} px-5 py-4 text-center text-xl font-semibold tracking-[0.34em] text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 transition-all`}
                              placeholder="12345678"
                              value={code}
                              autoFocus
                            />
                            <ButtonPrimary
                              type="submit"
                              loading={loading}
                              className="h-14 w-full rounded-2xl px-6 sm:w-auto"
                              disabled={loading || code.length < 8}
                            >
                              Code prüfen
                            </ButtonPrimary>
                          </div>
                        </form>

                        <button
                          type="button"
                          onClick={handleResendConfirmation}
                          disabled={resendCooldown > 0 || resendLoading}
                          className="flex h-12 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold text-slate-300 transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {resendCooldown > 0 ? `Code erneut senden (${resendCooldown}s)` : "Code erneut senden"}
                        </button>

                        {(resendMessage || resendError) && (
                          <p className={`text-center text-sm font-medium ${resendError ? 'text-red-300' : 'text-cyan-200/90'}`}>
                            {resendError || resendMessage}
                          </p>
                        )}

                        {codeError && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl border border-rose-500/20 bg-rose-950/30 px-4 py-3 text-center text-sm text-rose-200"
                          >
                            {codeError}
                          </motion.div>
                        )}

                        {codeMessage && (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="rounded-2xl border border-green-500/20 bg-green-900/20 px-4 py-3 text-center text-sm font-medium text-green-200"
                          >
                            {codeMessage}
                          </motion.p>
                        )}
                      </div>
                    </>
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
                          setErrorMsg("");
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
                {errorMsg && (
                  <div className="mb-6 rounded-2xl border border-rose-400/50 bg-rose-500/20 px-5 py-4 text-rose-100 text-center">
                    {errorMsg}
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
                      onChange={(e) => {
                        setProfileData((prev) => ({ ...prev, fullName: e.target.value }));
                        setErrorMsg(null);
                      }}
                      className="w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-4 text-lg text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
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
                    <CinematicDateInput
                      value={profileData.birthdate}
                      role={profileData.role}
                      onChange={(val) => {
                        setProfileData((prev) => ({ ...prev, birthdate: val }));
                        setErrorMsg(null);
                      }}
                      onErrorChange={(msg) => setErrorMsg(msg)}
                    />
                    <p className="mt-2 text-sm text-slate-400">
                      Erforderlich für Jugendschutz.
                    </p>
                  </div>
                  <div className="flex gap-4 pt-2">
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
                        <label htmlFor="company-name" className="mb-2 block text-lg font-medium text-white">
                          Firmenname / Organisation
                        </label>
                        <input
                          id="company-name"
                          name="organization"
                          type="text"
                          autoComplete="organization"
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
                        <label htmlFor="company-email" className="mb-2 block text-lg font-medium text-white">
                          E-Mail-Adresse
                        </label>
                        <input
                          id="company-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          inputMode="email"
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
                      {errorMsg && (
                        <div className="rounded-2xl border border-rose-400/50 bg-rose-500/20 px-5 py-4 text-rose-100">
                          {errorMsg}
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
                            <div className="text-sm text-slate-400">Geburtsdatum</div>
                            <div className="text-xl font-semibold text-white">
                              {profileData.birthdate ? new Date(profileData.birthdate).toLocaleDateString("de-DE", { day: '2-digit', month: '2-digit', year: 'numeric' }) : "—"}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-slate-400">Region</div>
                            <div className="text-xl font-semibold text-white">{profileData.region}</div>
                          </div>
                        </div>
                      </div>
                      {errorMsg && (
                        <div className="rounded-2xl border border-rose-400/50 bg-rose-500/20 px-5 py-4 text-rose-100">
                          {errorMsg}
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
