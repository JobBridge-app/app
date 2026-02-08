import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getHighestStaffRole, getStaffRolesForUser } from "@/lib/data/adminAuth";
import {
  type ActivityItem,
  type ActivityResponse,
  type DashboardMetrics,
  type MetricWidget,
  type StaffRole,
  type StaffHeaderContext,
  type WorkQueueItem,
} from "@/lib/data/adminTypes";

type ProfileActivityRow = {
  id: string;
  full_name: string | null;
  city: string | null;
  created_at: string;
};

type JobActivityRow = {
  id: string;
  title: string | null;
  created_at: string;
};

type ApplicationActivityRow = {
  id: string;
  job_id: string;
  user_id: string;
  created_at: string;
};

type ReportActivityRow = {
  id: string;
  target_type: string | null;
  target_id: string | null;
  status: string | null;
  created_at: string;
};

type ModerationActivityRow = {
  id: string;
  action_type: string | null;
  target_type: string | null;
  target_id: string | null;
  created_at: string;
};

type WorkQueueReportRow = {
  id: string;
  reason_code: string | null;
  target_type: string | null;
  created_at: string;
};

type WorkQueueProfileRow = {
  id: string;
  full_name: string | null;
  account_type: string | null;
  guardian_status: string | null;
  provider_verification_status: string | null;
  created_at: string;
};

type WorkQueueApplicationRow = {
  id: string;
  job_id: string;
  user_id: string;
  status: string | null;
  created_at: string;
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

function shortId(value: string | null | undefined): string {
  if (!value) return "unknown";
  return value.slice(0, 8);
}

function toTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function countRows(
  table: "profiles" | "jobs" | "applications",
  queryName: string,
  fallbackError: string,
): Promise<MetricWidget> {
  const adminClient = getSupabaseAdminClient();
  const { count, error } = await adminClient.from(table).select("*", { count: "exact", head: true });

  if (error) {
    console.error(queryName, { error: error.message });
    return {
      value: null,
      error: fallbackError,
    };
  }

  return {
    value: count ?? 0,
    error: null,
  };
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const [users, jobs, applications] = await Promise.all([
      countRows("profiles", "dashboard:count:profiles", "Failed to load users count."),
      countRows("jobs", "dashboard:count:jobs", "Failed to load jobs count."),
      countRows("applications", "dashboard:count:applications", "Failed to load applications count."),
    ]);

    return {
      users,
      jobs,
      applications,
    };
  } catch (error) {
    console.error("dashboard:count:init", {
      error: normalizeError(error, "Failed to initialize dashboard metrics."),
    });
    return {
      users: { value: null, error: "Failed to load users count." },
      jobs: { value: null, error: "Failed to load jobs count." },
      applications: { value: null, error: "Failed to load applications count." },
    };
  }
}

export async function getStaffHeaderContext(userId: string): Promise<StaffHeaderContext> {
  try {
    const adminClient = getSupabaseAdminClient();

    const [profileResult, roleResult, demoSessionResult] = await Promise.all([
      adminClient.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
      getStaffRolesForUser(userId),
      adminClient.from("demo_sessions").select("enabled, demo_view").eq("user_id", userId).maybeSingle(),
    ]);

    const errors: string[] = [];
    if (profileResult.error) {
      console.error("dashboard:header:profile", { userId, error: profileResult.error.message });
      errors.push("Failed to load profile.");
    }
    if (roleResult.error) {
      console.error("dashboard:header:roles", { userId, error: roleResult.error });
      errors.push("Failed to load staff roles.");
    }
    if (demoSessionResult.error) {
      console.error("dashboard:header:demo", { userId, error: demoSessionResult.error.message });
      errors.push("Failed to load demo session.");
    }

    return {
      fullName: profileResult.data?.full_name?.trim() || "Staff Member",
      roles: roleResult.roles,
      highestRole: getHighestStaffRole(roleResult.roles),
      demoEnabled: Boolean(demoSessionResult.data?.enabled),
      demoView: demoSessionResult.data?.demo_view === "job_provider" ? "job_provider" : "job_seeker",
      error: errors.length > 0 ? errors.join(" ") : null,
    };
  } catch (error) {
    console.error("dashboard:header:init", {
      userId,
      error: normalizeError(error, "Failed to initialize dashboard header."),
    });
    return {
      fullName: "Staff Member",
      roles: [],
      highestRole: "staff",
      demoEnabled: false,
      demoView: "job_seeker",
      error: "Failed to load profile, roles and demo state.",
    };
  }
}

export async function getRecentActivity(limit = 15, offset = 0): Promise<ActivityResponse> {
  try {
    const adminClient = getSupabaseAdminClient();

    const safeLimit = Math.max(1, limit);
    const safeOffset = Math.max(0, offset);
    const perSourceLimit = Math.max(10, safeLimit + safeOffset);

    const [profilesResult, jobsResult, applicationsResult, reportsResult, moderationResult] = await Promise.all([
      adminClient
        .from("profiles")
        .select("id, full_name, city, created_at")
        .order("created_at", { ascending: false })
        .limit(perSourceLimit),
      adminClient
        .from("jobs")
        .select("id, title, created_at")
        .order("created_at", { ascending: false })
        .limit(perSourceLimit),
      adminClient
        .from("applications")
        .select("id, job_id, user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(perSourceLimit),
      adminClient
        .from("reports")
        .select("id, target_type, target_id, status, created_at")
        .order("created_at", { ascending: false })
        .limit(perSourceLimit),
      adminClient
        .from("moderation_actions")
        .select("id, action_type, target_type, target_id, created_at")
        .order("created_at", { ascending: false })
        .limit(perSourceLimit),
    ]);

    const merged: ActivityItem[] = [];
    const failedSources: string[] = [];

    if (profilesResult.error) {
      console.error("dashboard:activity:profiles", { error: profilesResult.error.message });
      failedSources.push("users");
    } else {
      const rows = (profilesResult.data ?? []) as unknown as ProfileActivityRow[];
      merged.push(
        ...rows.map((row) => ({
          type: "user" as const,
          entityId: row.id,
          title: `New user: ${row.full_name?.trim() || "Unknown user"}`,
          subtitle: row.city ? `City: ${row.city}` : "Profile created",
          createdAt: row.created_at,
          href: `/staff/users?userId=${row.id}`,
        })),
      );
    }

    if (jobsResult.error) {
      console.error("dashboard:activity:jobs", { error: jobsResult.error.message });
      failedSources.push("jobs");
    } else {
      const rows = (jobsResult.data ?? []) as unknown as JobActivityRow[];
      merged.push(
        ...rows.map((row) => ({
          type: "job" as const,
          entityId: row.id,
          title: `New job: ${row.title || "Untitled job"}`,
          subtitle: "Job posting created",
          createdAt: row.created_at,
          href: `/staff/jobs?jobId=${row.id}`,
        })),
      );
    }

    if (applicationsResult.error) {
      console.error("dashboard:activity:applications", { error: applicationsResult.error.message });
      failedSources.push("applications");
    } else {
      const rows = (applicationsResult.data ?? []) as unknown as ApplicationActivityRow[];
      merged.push(
        ...rows.map((row) => ({
          type: "application" as const,
          entityId: row.id,
          title: "New application submitted",
          subtitle: `Job ${shortId(row.job_id)} by user ${shortId(row.user_id)}`,
          createdAt: row.created_at,
          href: `/staff/applications?applicationId=${row.id}`,
        })),
      );
    }

    if (reportsResult.error) {
      console.error("dashboard:activity:reports", { error: reportsResult.error.message });
      failedSources.push("reports");
    } else {
      const rows = (reportsResult.data ?? []) as unknown as ReportActivityRow[];
      merged.push(
        ...rows.map((row) => ({
          type: "report" as const,
          entityId: row.id,
          title: `Report filed (${row.status || "open"})`,
          subtitle: `${row.target_type || "target"} ${shortId(row.target_id)}`,
          createdAt: row.created_at,
          href: `/staff/moderation?reportId=${row.id}`,
        })),
      );
    }

    if (moderationResult.error) {
      console.error("dashboard:activity:moderation", { error: moderationResult.error.message });
      failedSources.push("moderation actions");
    } else {
      const rows = (moderationResult.data ?? []) as unknown as ModerationActivityRow[];
      merged.push(
        ...rows.map((row) => ({
          type: "moderation" as const,
          entityId: row.id,
          title: `Moderation: ${row.action_type || "action"}`,
          subtitle: `${row.target_type || "target"} ${shortId(row.target_id)}`,
          createdAt: row.created_at,
          href: `/staff/moderation?actionId=${row.id}`,
        })),
      );
    }

    const sorted = merged.sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt));
    const start = safeOffset;
    const end = start + safeLimit;

    let error: string | null = null;
    if (failedSources.length === 5) {
      error = "Failed to load recent activity.";
    } else if (failedSources.length > 0) {
      error = `Failed to load some activity sources: ${failedSources.join(", ")}.`;
    }

    return {
      items: sorted.slice(start, end),
      hasMore: sorted.length > end,
      error,
    };
  } catch (error) {
    console.error("dashboard:activity:init", {
      error: normalizeError(error, "Failed to initialize recent activity."),
    });
    return {
      items: [],
      hasMore: false,
      error: "Failed to load recent activity.",
    };
  }
}

export async function getWorkQueue(limit = 10): Promise<{ items: WorkQueueItem[]; error: string | null }> {
  try {
    const adminClient = getSupabaseAdminClient();
    const safeLimit = Math.max(1, limit);

    const [reportsResult, profilesResult, applicationsResult] = await Promise.all([
      adminClient
        .from("reports")
        .select("id, reason_code, target_type, created_at")
        .in("status", ["open", "reviewing"])
        .order("created_at", { ascending: false })
        .limit(8),
      adminClient
        .from("profiles")
        .select("id, full_name, account_type, guardian_status, provider_verification_status, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
      adminClient
        .from("applications")
        .select("id, job_id, user_id, status, created_at")
        .eq("status", "submitted")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const items: WorkQueueItem[] = [];
    const failedSources: string[] = [];

    if (reportsResult.error) {
      console.error("dashboard:work_queue:reports", { error: reportsResult.error.message });
      failedSources.push("reports");
    } else {
      const rows = (reportsResult.data ?? []) as unknown as WorkQueueReportRow[];
      items.push(
        ...rows.map((row) => ({
          id: row.id,
          type: "report" as const,
          title: `Report: ${row.reason_code || "unspecified"}`,
          subtitle: `Target ${row.target_type || "unknown"}`,
          priority: "high" as const,
          created_at: row.created_at,
          link: `/staff/moderation?reportId=${row.id}`,
        })),
      );
    }

    if (profilesResult.error) {
      console.error("dashboard:work_queue:profiles", { error: profilesResult.error.message });
      failedSources.push("profiles");
    } else {
      const rows = (profilesResult.data ?? []) as unknown as WorkQueueProfileRow[];
      const needsAttention = (row: WorkQueueProfileRow) => {
        if (row.account_type === "job_provider") return row.provider_verification_status !== "verified";
        if (row.account_type === "job_seeker") return row.guardian_status !== "linked";
        return false;
      };
      items.push(
        ...rows
          .filter(needsAttention)
          .slice(0, 8)
          .map((row) => ({
            id: row.id,
            type: "verification" as const,
            title: `${row.account_type === "job_provider" ? "Verify provider" : "Guardian confirmation"}: ${row.full_name || "Unknown user"}`,
            subtitle: row.account_type === "job_provider"
              ? `Provider status: ${row.provider_verification_status || "none"}`
              : `Guardian status: ${row.guardian_status || "none"}`,
            priority: row.account_type === "job_provider" ? ("medium" as const) : ("low" as const),
            created_at: row.created_at,
            link: `/staff/users?userId=${row.id}`,
          })),
      );
    }

    if (applicationsResult.error) {
      console.error("dashboard:work_queue:applications", { error: applicationsResult.error.message });
      failedSources.push("applications");
    } else {
      const rows = (applicationsResult.data ?? []) as unknown as WorkQueueApplicationRow[];
      items.push(
        ...rows.map((row) => ({
          id: row.id,
          type: "application" as const,
          title: "Review submitted application",
          subtitle: `Job ${shortId(row.job_id)} by user ${shortId(row.user_id)}`,
          priority: "low" as const,
          created_at: row.created_at,
          link: `/staff/applications?applicationId=${row.id}`,
        })),
      );
    }

    const sorted = items.sort((left, right) => toTimestamp(right.created_at) - toTimestamp(left.created_at));

    let error: string | null = null;
    if (failedSources.length === 3) {
      error = "Failed to load work queue.";
    } else if (failedSources.length > 0) {
      error = `Work queue partially loaded (${failedSources.join(", ")}).`;
    }

    return {
      items: sorted.slice(0, safeLimit),
      error,
    };
  } catch (error) {
    console.error("dashboard:work_queue:init", {
      error: normalizeError(error, "Failed to initialize work queue."),
    });
    return {
      items: [],
      error: "Failed to load work queue.",
    };
  }
}

export async function getStaffIdentity(userId: string): Promise<{
  full_name: string;
  roles: string[];
  highest_role: StaffRole;
  error: string | null;
}> {
  try {
    const adminClient = getSupabaseAdminClient();

    const [profileResult, roleResult] = await Promise.all([
      adminClient.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
      getStaffRolesForUser(userId),
    ]);

    if (profileResult.error) {
      console.error("dashboard:staff_identity:profile", { userId, error: profileResult.error.message });
    }

    return {
      full_name: profileResult.data?.full_name?.trim() || "Staff Member",
      roles: roleResult.roles,
      highest_role: getHighestStaffRole(roleResult.roles),
      error:
        [
          profileResult.error ? normalizeError(profileResult.error, "Failed to load profile.") : null,
          roleResult.error,
        ]
          .filter((value): value is string => Boolean(value))
          .join(" ") || null,
    };
  } catch (error) {
    console.error("dashboard:staff_identity:init", {
      userId,
      error: normalizeError(error, "Failed to initialize staff identity."),
    });
    return {
      full_name: "Staff Member",
      roles: [],
      highest_role: "staff",
      error: "Failed to load staff identity.",
    };
  }
}
