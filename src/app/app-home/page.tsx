import { getAppHomeSnapshot } from "@/lib/app-shell";
import { redirect } from "next/navigation";

export default async function AppHomePage() {
  const snapshot = await getAppHomeSnapshot();
  const viewRole = snapshot.effectiveView.viewRole;

  // Strict Redirect based on EFFECTIVE role (demo_view > override > base profile)
  if (viewRole === "job_provider") redirect("/app-home/offers");
  redirect("/app-home/jobs");

  // Fallback (should not be reached if types are correct)
  return null;
}
