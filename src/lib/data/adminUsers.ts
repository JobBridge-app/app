// ... existing imports
import { sortStaffRoles } from "@/lib/data/adminAuth";
import type { Database } from "@/lib/types/supabase";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type UserSystemRoleRow = Database["public"]["Tables"]["user_system_roles"]["Row"] & {
  role: { name: string | null } | null;
};

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

import { AdminUserApplication, AdminUserJob, AdminUserMessage, AdminUserDetail } from "@/lib/data/adminTypes";

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


function mapRolesByUser(rows: UserSystemRoleRow[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const userId = row.user_id;
    const roleName = row.role?.name;
    if (userId && roleName) {
      const existing = map.get(userId) || [];
      if (!existing.includes(roleName)) {
        existing.push(roleName);
      }
      map.set(userId, existing);
    }
  }
  // Sort roles for each user
  for (const [userId, roles] of map.entries()) {
    map.set(userId, sortStaffRoles(roles));
  }
  return map;
}

async function getRolesByUserIds(supabase: any, userIds: string[]): Promise<Map<string, string[]>> {
  if (userIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("user_system_roles")
    .select("user_id, role:system_roles(name)")
    .in("user_id", userIds);

  if (error) {
    console.error("users:roles:fetch", error);
    return new Map();
  }

  return mapRolesByUser((data ?? []) as unknown as UserSystemRoleRow[]);
}

export async function getAdminUsers({
  limit = 50,
  offset = 0,
  search = "",
}: {
  limit?: number;
  offset?: number;
  search?: string;
} = {}): Promise<{ items: AdminUserListItem[]; error: string | null }> {
  try {
    const supabase = await supabaseServer();
    let query = supabase
      .from("profiles")
      .select("id, full_name, email, city, account_type, provider_kind, guardian_status, provider_verification_status, email_verified_at, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      const term = sanitizeSearchTerm(search);
      // Simple OR search on text columns
      query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,city.ilike.%${term}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("users:list", error);
      return { items: [], error: normalizeError(error, "Failed to load users.") };
    }

    if (!data || data.length === 0) {
      return { items: [], error: null };
    }

    const userIds = data.map((u) => u.id);
    const rolesMap = await getRolesByUserIds(supabase, userIds);

    const items: AdminUserListItem[] = data.map((row) => ({
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
      roles: rolesMap.get(row.id) || [],
    }));

    return { items, error: null };
  } catch (error) {
    console.error("users:list:fatal", error);
    return { items: [], error: "Failed to load users." };
  }
}

export async function getAdminUser(userId: string): Promise<{ item: AdminUserDetail | null; error: string | null }> {
  try {
    const supabase = await supabaseServer();
    const admin = supabaseAdmin();

    // Parallel fetch for Profile, Roles, Applications, Jobs, and Messages
    const [profileResult, roleResult, applicationsResult, jobsResult, messagesResult] = await Promise.all([
      // 1. Profile
      supabase
        .from("profiles")
        .select("id, full_name, email, city, account_type, provider_kind, guardian_status, provider_verification_status, email_verified_at, created_at")
        .eq("id", userId)
        .maybeSingle(),

      // 2. Roles (Use Admin Client to bypass RLS)
      admin
        .from("user_system_roles")
        .select("user_id, role:system_roles(name)")
        .eq("user_id", userId),

      // 3. Applications (as applicant)
      supabase
        .from("applications")
        .select("id, job_id, status, created_at, job:jobs(title, status)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),

      // 4. Jobs (as provider)
      supabase
        .from("jobs")
        .select("id, title, status, created_at, applications(count)")
        .eq("posted_by", userId)
        .order("created_at", { ascending: false })
        .limit(20),

      // 5. Messages (sent by user)
      supabase
        .from("messages")
        .select("id, content, created_at, sender_id, application_id, application:applications(job:jobs(title))")
        .eq("sender_id", userId)
        .order("created_at", { ascending: false })
        .limit(50)
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

    // Process Roles
    const roles = sortStaffRoles(
      ((roleResult.data ?? []) as unknown as UserSystemRoleRow[])
        .map((row) => row.role?.name)
        .filter((value): value is string => Boolean(value)),
    );

    // Process Applications
    const applications: AdminUserApplication[] = (applicationsResult.data ?? []).map((app: any) => ({
      id: app.id,
      job_id: app.job_id,
      status: app.status,
      created_at: app.created_at,
      job: app.job,
    }));

    // Process Jobs
    const jobs: AdminUserJob[] = (jobsResult.data ?? []).map((job: any) => ({
      id: job.id,
      title: job.title,
      status: job.status,
      created_at: job.created_at,
      applications_count: job.applications?.[0]?.count ?? 0,
    }));

    // Process Messages
    const messages: AdminUserMessage[] = (messagesResult.data ?? []).map((msg: any) => ({
      id: msg.id,
      content: msg.content,
      created_at: msg.created_at,
      sender_id: msg.sender_id,
      application_id: msg.application_id,
      application: msg.application,
    }));

    const row = profileResult.data as ProfileRow;

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
        applications,
        jobs,
        messages,
      },
      error: null, // Aggregated error handling could be improved, but assuming partial data is better than none
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
