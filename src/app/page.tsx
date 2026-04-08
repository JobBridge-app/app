import { getAuthState } from "@/lib/auth";
import { redirect } from "next/navigation";
import AuthBridge from "@/components/AuthBridge";
import { MiniFooter } from "@/components/layout/MiniFooter";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const resolvedParams: any = await searchParams;
  const authState = await getAuthState();
  const redirectTo = typeof resolvedParams.redirectTo === "string" ? resolvedParams.redirectTo : undefined;
  const authMode = typeof resolvedParams.authMode === "string" && (resolvedParams.authMode === "signup" || resolvedParams.authMode === "signin")
    ? resolvedParams.authMode
    : undefined;

  // Wenn ready → zu /app-home oder redirectTo
  if (authState.state === "ready") {
    redirect(redirectTo || "/app-home");
  }

  // Ansonsten Wizard anzeigen (no-session oder incomplete-profile)
  return (
    <>
      <AuthBridge authState={authState} redirectTo={redirectTo} initialMode={authMode} />
      <MiniFooter />
    </>
  );
}
