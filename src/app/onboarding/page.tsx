import { OnboardingWizard } from "@/components/OnboardingWizard";
import { getAuthState } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const authState = await getAuthState();

  if (authState.state === "ready") {
    redirect("/app-home");
  }

  if (authState.state === "no-session") {
    redirect("/");
  }

  const initialProfile =
    authState.state === "incomplete-profile" ? authState.profile : null;
  const forcedStep = authState.state === "email-unconfirmed" ? "email-confirm" : undefined;
  const initialEmail =
    authState.state === "email-unconfirmed" || authState.state === "incomplete-profile"
      ? authState.session.user.email ?? ""
      : "";

  const initialRegion =
    (authState.state === "email-unconfirmed" || authState.state === "incomplete-profile")
      ? authState.session.user.user_metadata?.city
      : "";

  return (
    <OnboardingWizard
      initialProfile={initialProfile}
      forcedStep={forcedStep}
      initialEmail={initialEmail}
      initialRegion={initialRegion}
    />
  );
}
