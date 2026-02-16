import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminRoleAssignment = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  city: string | null;
  avatar_url: string | null;
  role_name: string;
  role_description: string | null;
  created_at: string;
};

type RoleAssignmentRow = {
  user_id: string;
  created_at: string;
  profile: {
    full_name: string | null;
    email: string | null;
    city: string | null;
  } | null;
  role: {
    name: string | null;
    description: string | null;
  } | null;
};

function normalizeError(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: string }).message;
    if (message) return message;
  }
  return fallback;
}

export async function getAdminRoleAssignments(): Promise<{ items: AdminRoleAssignment[]; error: string | null }> {
  try {
    const adminClient = getSupabaseAdminClient();

    const { data, error } = await adminClient
      .from("user_system_roles")
      .select(
        "user_id, created_at, profile:profiles!user_system_roles_user_id_fkey(full_name, email, city, avatar_url), role:system_roles!user_system_roles_role_id_fkey(name, description)",
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("roles:assignments", { error: error.message });
      return {
        items: [],
        error: normalizeError(error, "Failed to load role assignments."),
      };
    }

    const items = ((data ?? []) as unknown as RoleAssignmentRow[])
      .filter((row) => Boolean(row.role?.name))
      .map((row): AdminRoleAssignment => ({
        user_id: row.user_id,
        full_name: row.profile?.full_name || null,
        email: row.profile?.email || null,
        city: row.profile?.city || null,
        avatar_url: (row.profile as any)?.avatar_url || null,
        role_name: row.role?.name || "unknown",
        role_description: row.role?.description || null,
        created_at: row.created_at,
      }));

    return { items, error: null };
  } catch (error) {
    console.error("roles:assignments:init", {
      error: normalizeError(error, "Failed to initialize role assignments query."),
    });
    return {
      items: [],
      error: "Failed to load role assignments.",
    };
  }
}

export async function grantRoleToUserByEmail(email: string, roleName: string): Promise<{ error: string | null }> {
  try {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedRole = roleName.trim().toLowerCase();
    const adminClient = getSupabaseAdminClient();

    const [userResult, roleResult] = await Promise.all([
      adminClient.from("profiles").select("id").eq("email", trimmedEmail).maybeSingle(),
      adminClient.from("system_roles").select("id").eq("name", trimmedRole).maybeSingle(),
    ]);

    if (userResult.error) {
      console.error("roles:grant:user_lookup", { email: trimmedEmail, error: userResult.error.message });
      return { error: normalizeError(userResult.error, "Failed to find user.") };
    }

    if (!userResult.data) {
      return { error: "User not found." };
    }

    if (roleResult.error) {
      console.error("roles:grant:role_lookup", { roleName: trimmedRole, error: roleResult.error.message });
      return { error: normalizeError(roleResult.error, "Failed to find role.") };
    }

    if (!roleResult.data) {
      return { error: "Role not found." };
    }

    const { error } = await adminClient.from("user_system_roles").upsert(
      {
        user_id: userResult.data.id,
        role_id: roleResult.data.id,
      },
      {
        onConflict: "user_id,role_id",
        ignoreDuplicates: true,
      },
    );

    if (error) {
      console.error("roles:grant:upsert", {
        email: trimmedEmail,
        roleName: trimmedRole,
        error: error.message,
      });
      return { error: normalizeError(error, "Failed to assign role.") };
    }

    return { error: null };
  } catch (error) {
    console.error("roles:grant:init", {
      email,
      roleName,
      error: normalizeError(error, "Failed to initialize role assignment."),
    });
    return { error: "Failed to assign role." };
  }

}

export async function setUserRole(userId: string, roleName: string): Promise<{ error: string | null }> {
  try {
    const trimmedRole = roleName.trim().toLowerCase();
    const adminClient = getSupabaseAdminClient();

    // 1. Get Role ID
    const { data: role, error: roleError } = await adminClient
      .from("system_roles")
      .select("id")
      .eq("name", trimmedRole)
      .maybeSingle();

    if (roleError || !role) {
      return { error: roleError ? roleError.message : "Role not found" };
    }

    // 2. Delete ALL existing roles for this user (Enforce Single Role)
    const { error: deleteError } = await adminClient
      .from("user_system_roles")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      console.error("roles:set:delete_existing", deleteError);
      return { error: "Failed to clear existing roles." };
    }

    // 3. Insert New Role
    const { error: insertError } = await adminClient
      .from("user_system_roles")
      .insert({
        user_id: userId,
        role_id: role.id,
      });

    if (insertError) {
      console.error("roles:set:insert", insertError);
      return { error: "Failed to assign new role." };
    }

    return { error: null };
  } catch (error) {
    console.error("roles:set:fatal", error);
    return { error: "Failed to set user role." };
  }
}

export async function removeRoleFromUser(userId: string, roleName: string): Promise<{ error: string | null }> {
  try {
    const trimmedRole = roleName.trim().toLowerCase();
    const adminClient = getSupabaseAdminClient();

    const { data: role, error: roleError } = await adminClient
      .from("system_roles")
      .select("id")
      .eq("name", trimmedRole)
      .maybeSingle();

    if (roleError) {
      console.error("roles:remove:role_lookup", { roleName: trimmedRole, error: roleError.message });
      return { error: normalizeError(roleError, "Failed to find role.") };
    }

    if (!role) {
      return { error: "Role not found." };
    }

    const { error } = await adminClient
      .from("user_system_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role_id", role.id);

    if (error) {
      console.error("roles:remove:delete", { userId, roleName: trimmedRole, error: error.message });
      return { error: normalizeError(error, "Failed to remove role.") };
    }

    return { error: null };
  } catch (error) {
    console.error("roles:remove:init", {
      userId,
      roleName,
      error: normalizeError(error, "Failed to initialize role removal."),
    });
    return { error: "Failed to remove role." };
  }
}
