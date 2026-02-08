import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sortStaffRoles } from "@/lib/data/adminAuth";

export type AdminUserListItem = {
  id: string;
  full_name: string | null;
  email: string | null;
  city: string | null;
  account_type: string | null;
  provider_kind: string | null;
  guardian_status: string | null;
  provider_verification_status: string | null;
  email_verified_at: string | null;
  created_at: string;
  roles: string[];
};

export type AdminUserDetail = AdminUserListItem;

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  city: string | null;
  account_type: string | null;
  provider_kind: string | null;
  guardian_status: string | null;
  provider_verification_status: string | null;
  email_verified_at: string | null;
  created_at: string;
};

type UserRoleRow = {
  user_id: string;
  role: {
    name: string | null;
  } | null;
};

function sanitizeSearchTerm(search: string): string {
  return search.replace(/[,%]/g, " ").trim();
}

function normalizeError(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: string }).message;
    if (message) return message;
  }
  return fallback;
}

function mapRolesByUser(rows: UserRoleRow[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};

  for (const row of rows) {
    const roleName = row.role?.name;
    if (!roleName) continue;
    if (!map[row.user_id]) {
      map[row.user_id] = [];
    }
    map[row.user_id].push(roleName);
  }

  for (const [userId, roles] of Object.entries(map)) {
    map[userId] = sortStaffRoles(roles);
  }

  return map;
}

async function getRolesByUserIds(userIds: string[]): Promise<{
  rolesByUser: Record<string, string[]>;
  error: string | null;
}> {
  if (userIds.length === 0) {
    return { rolesByUser: {}, error: null };
  }

  try {
    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("user_system_roles")
      .select("user_id, role:system_roles(name)")
      .in("user_id", userIds);

    if (error) {
      console.error("users:roles_by_user_ids", { error: error.message, userCount: userIds.length });
      return {
        rolesByUser: {},
        error: normalizeError(error, "Failed to load user roles."),
      };
    }

    return {
      rolesByUser: mapRolesByUser((data ?? []) as unknown as UserRoleRow[]),
      error: null,
    };
  } catch (error) {
    console.error("users:roles_by_user_ids:init", {
      userCount: userIds.length,
      error: normalizeError(error, "Failed to initialize user role lookup."),
    });
    return {
      rolesByUser: {},
      error: "Failed to load user roles.",
    };
  }
}

export async function getAdminUsers(params: {
  limit?: number;
  offset?: number;
  search?: string;
} = {}): Promise<{ items: AdminUserListItem[]; error: string | null }> {
  try {
    const { limit = 100, offset = 0, search = "" } = params;
    const safeLimit = Math.max(1, Math.min(500, limit));
    const safeOffset = Math.max(0, offset);
    const term = sanitizeSearchTerm(search);

    const adminClient = getSupabaseAdminClient();
    let query = adminClient
      .from("profiles")
      .select("id, full_name, email, city, account_type, provider_kind, guardian_status, provider_verification_status, email_verified_at, created_at")
      .order("created_at", { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1);

    if (term.length > 0) {
      const pattern = `%${term}%`;
      query = query.or(`full_name.ilike.${pattern},email.ilike.${pattern},city.ilike.${pattern}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("users:list", { error: error.message, term, safeLimit, safeOffset });
      return {
        items: [],
        error: normalizeError(error, "Failed to load users."),
      };
    }

    const rows = (data ?? []) as unknown as ProfileRow[];
    const roleResult = await getRolesByUserIds(rows.map((row) => row.id));

    const items = rows.map((row): AdminUserListItem => ({
      id: row.id,
      full_name: row.full_name,
      email: row.email,
      city: row.city,
      account_type: row.account_type,
      provider_kind: row.provider_kind,
      guardian_status: row.guardian_status,
      provider_verification_status: row.provider_verification_status,
      email_verified_at: row.email_verified_at,
      created_at: row.created_at,
      roles: roleResult.rolesByUser[row.id] ?? [],
    }));

    return {
      items,
      error: roleResult.error,
    };
  } catch (error) {
    console.error("users:list:init", {
      error: normalizeError(error, "Failed to initialize users query."),
    });
    return {
      items: [],
      error: "Failed to load users.",
    };
  }
}

export async function getAdminUser(userId: string): Promise<{ item: AdminUserDetail | null; error: string | null }> {
  try {
    const adminClient = getSupabaseAdminClient();

    const [profileResult, roleResult] = await Promise.all([
      adminClient
        .from("profiles")
        .select("id, full_name, email, city, account_type, provider_kind, guardian_status, provider_verification_status, email_verified_at, created_at")
        .eq("id", userId)
        .maybeSingle(),
      adminClient
        .from("user_system_roles")
        .select("user_id, role:system_roles(name)")
        .eq("user_id", userId),
    ]);

    if (profileResult.error) {
      console.error("users:detail:profile", { userId, error: profileResult.error.message });
      return {
        item: null,
        error: normalizeError(profileResult.error, "Failed to load user details."),
      };
    }

    if (!profileResult.data) {
      return { item: null, error: null };
    }

    if (roleResult.error) {
      console.error("users:detail:roles", { userId, error: roleResult.error.message });
    }

    const roles = sortStaffRoles(
      ((roleResult.data ?? []) as unknown as UserRoleRow[])
        .map((row) => row.role?.name)
        .filter((value): value is string => Boolean(value)),
    );

    const row = profileResult.data as unknown as ProfileRow;

    return {
      item: {
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        city: row.city,
        account_type: row.account_type,
        provider_kind: row.provider_kind,
        guardian_status: row.guardian_status,
        provider_verification_status: row.provider_verification_status,
        email_verified_at: row.email_verified_at,
        created_at: row.created_at,
        roles,
      },
      error: roleResult.error ? normalizeError(roleResult.error, "Failed to load user roles.") : null,
    };
  } catch (error) {
    console.error("users:detail:init", {
      userId,
      error: normalizeError(error, "Failed to initialize user detail query."),
    });
    return {
      item: null,
      error: "Failed to load user details.",
    };
  }
}
