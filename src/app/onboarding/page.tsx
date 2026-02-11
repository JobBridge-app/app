import { OnboardingWizard } from "@/components/OnboardingWizard";
import { getAuthState } from "@/lib/auth";
import { redirect } from "next/navigation";

// server component
export default async function OnboardingPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> // Next.js 15+ compatible
}) {
  const searchParams = await props.searchParams;
  const authState = await getAuthState();

  // Special handling: If we just came from email verification, we might have a race condition
  // where the session is ready but we want to show the "Email Confirmed" state briefly
  // or ensure the user lands on the right step.
  const isJustVerified = searchParams?.verified === "true";

  if (authState.state === "ready") {
    // If just verified, we allow rendering to show "Success" message if needed,
    // otherwise we redirect to app-home.
    // However, usually "ready" means profile is complete too.
    // If profile is complete AND just verified -> Go to app-home
    if (!isJustVerified) {
      redirect("/app-home");
    }
  }

  if (authState.state === "no-session") {
    // If we have an error param, maybe show it? For now redirect home.
    redirect("/");
  }

  const initialProfile =
    authState.state === "incomplete-profile" ? authState.profile : null;

  // If just verified, force the step to email-confirm (which will show success state)
  // OR if the user is incomplete, force them to the role/profile step to prevent "Welcome/Login" loop.
  let forcedStep: string | undefined = authState.state === "email-unconfirmed" ? "email-confirm" : undefined;

  if (authState.state === "incomplete-profile" && !forcedStep) {
    // If we know the profile is incomplete, skip the welcome screen.
    // We can refine this to check specific fields if needed, but "role" is the safest start.
    forcedStep = !initialProfile?.account_type ? "role" : "profile";
  }

  if (isJustVerified) {
    forcedStep = "email-confirm";
  }

  const initialEmail =
    authState.state === "email-unconfirmed" || authState.state === "incomplete-profile" || authState.state === "ready"
      ? authState.session.user.email ?? ""
      : "";

  const initialRegion =
    (authState.state === "email-unconfirmed" || authState.state === "incomplete-profile" || authState.state === "ready")
      ? authState.session.user.user_metadata?.city
      : "";

  return (
    <OnboardingWizard
      initialProfile={initialProfile}
      forcedStep={forcedStep as any}
      initialEmail={initialEmail}
      initialRegion={initialRegion}
      isJustVerified={isJustVerified}
    />
  );
}
