import { AppContent } from "@/components/app/AppContent";
import { getAuthState } from "@/lib/auth";
import { getMarketSummary } from "@/lib/app-shell";
import { redirect } from "next/navigation";

export default async function AppPage() {
  const authState = await getAuthState();

  if (authState.state === "no-session") {
    redirect("/");
  }

  if (authState.state === "incomplete-profile") {
    redirect("/onboarding");
  }

  const market = await getMarketSummary(authState.profile?.market_id);

  return <AppContent profile={authState.profile} market={market} />;
}
