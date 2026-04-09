import "server-only";

import { redirect } from "next/navigation";
import { requireCompleteProfile } from "@/lib/auth";
import { getHighestStaffRole } from "@/lib/data/adminAuth";
import { canAccessAdminSection, getDefaultAdminHref, type AdminSection } from "@/lib/adminNavigation";

export async function requireStaffSectionAccess(section: AdminSection) {
  const state = await requireCompleteProfile();
  const highestRole = getHighestStaffRole(state.systemRoles);

  if (!canAccessAdminSection(highestRole, section)) {
    redirect(getDefaultAdminHref(highestRole));
  }

  return {
    ...state,
    highestRole,
  };
}
