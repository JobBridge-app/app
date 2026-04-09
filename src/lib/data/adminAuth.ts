import "server-only";

import { supabaseServer } from "@/lib/supabaseServer";
import { type StaffRole } from "@/lib/data/adminTypes";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type { StaffRole } from "@/lib/data/adminTypes";

type StaffRoleJoinRow = {
  role: {
    name: string | null;
  } | null;
};

type StaffContext = {
  userId: string | null;
  roles: string[];
  highestRole: StaffRole;
  isStaff: boolean;
  isAdmin: boolean;
  error: string | null;
};

const STAFF_ROLE_PRIORITY = {
  admin: 1,
  moderator: 2,
  analyst: 3,
} as const;

function normalizeError(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: string }).message;
    if (message) return message;
  }
  return fallback;
}

export function getHighestStaffRole(roles: string[]): StaffRole {
  const sortedRoles = sortStaffRoles(roles);
  return (sortedRoles[0] as StaffRole | undefined) ?? "staff";
}

export function sortStaffRoles(roles: string[]): string[] {
  return [...roles].sort((left, right) => {
    const leftPriority = STAFF_ROLE_PRIORITY[left as keyof typeof STAFF_ROLE_PRIORITY] ?? Number.POSITIVE_INFINITY;
    const rightPriority = STAFF_ROLE_PRIORITY[right as keyof typeof STAFF_ROLE_PRIORITY] ?? Number.POSITIVE_INFINITY;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.localeCompare(right);
  });
}

export async function getStaffRolesForUser(userId: string): Promise<{ roles: string[]; error: string | null }> {
  try {
    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("user_system_roles")
      .select("role:system_roles(name)")
      .eq("user_id", userId);

    if (error) {
      console.error("getStaffRolesForUser:user_system_roles", { userId, error: error.message });
      return { roles: [], error: normalizeError(error, "Failed to load user roles.") };
    }

    const roles = ((data ?? []) as unknown as StaffRoleJoinRow[])
      .map((row) => row.role?.name)
      .filter((value): value is string => Boolean(value));

    return { roles: sortStaffRoles(roles), error: null };
  } catch (error) {
    console.error("getStaffRolesForUser:init", {
      userId,
      error: normalizeError(error, "Failed to initialize role lookup."),
    });
    return {
      roles: [],
      error: "Failed to load user roles.",
    };
  }
}

export async function getCurrentStaffContext(): Promise<StaffContext> {
  const sessionClient = await supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await sessionClient.auth.getUser();

  if (authError || !user) {
    return {
      userId: null,
      roles: [],
      highestRole: "staff",
      isStaff: false,
      isAdmin: false,
      error: "Unauthorized.",
    };
  }

  const roleResult = await getStaffRolesForUser(user.id);
  const highestRole = getHighestStaffRole(roleResult.roles);
  const isStaff = roleResult.roles.length > 0;
  const isAdmin = roleResult.roles.includes("admin");

  return {
    userId: user.id,
    roles: roleResult.roles,
    highestRole,
    isStaff,
    isAdmin,
    error: roleResult.error,
  };
}

export async function requireCurrentStaffContext(options?: {
  requireAdmin?: boolean;
}): Promise<StaffContext> {
  const context = await getCurrentStaffContext();

  if (context.error) {
    return context;
  }

  if (!context.isStaff) {
    return {
      ...context,
      error: "Forbidden.",
    };
  }

  if (options?.requireAdmin && !context.isAdmin) {
    return {
      ...context,
      error: "Admin role required.",
    };
  }

  return context;
}
