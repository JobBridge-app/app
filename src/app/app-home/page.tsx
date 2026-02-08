import { requireCompleteProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getEffectiveView } from "@/lib/dal/jobbridge";

export default async function AppHomePage() {
  const { profile } = await requireCompleteProfile();

  const viewRes = await getEffectiveView({ userId: profile.id, baseAccountType: profile.account_type });
  const viewRole = viewRes.ok ? viewRes.data.viewRole : (profile.account_type ?? "job_seeker");

  // Strict Redirect based on EFFECTIVE role (demo_view > override > base profile)
  if (viewRole === "job_provider") redirect("/app-home/offers");
  redirect("/app-home/jobs");

  // Fallback (should not be reached if types are correct)
  return null;
}
