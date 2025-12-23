import { requireCompleteProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AppHomePage() {
  const { profile } = await requireCompleteProfile();

  // Strict Redirect based on User Type
  if (profile.user_type === "company") {
    redirect("/app-home/offers");
  } else {
    redirect("/app-home/jobs");
  }

  // Fallback (should not be reached if types are correct)
  return null;
}
