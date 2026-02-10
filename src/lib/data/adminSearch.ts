import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminSearchResult = {
  entity_type: "user" | "job";
  entity_id: string;
  title: string;
  subtitle: string;
  created_at: string;
  link: string;
};

type UserSearchRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  city: string | null;
  created_at: string;
};

type JobSearchRow = {
  id: string;
  title: string | null;
  description: string | null;
  created_at: string;
};

function sanitizeSearchTerm(search: string): string {
  return search.replace(/[,%]/g, " ").trim();
}

function toTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function searchAdminEntities(query: string, limit = 8): Promise<{ items: AdminSearchResult[]; error: string | null }> {
  try {
    const term = sanitizeSearchTerm(query);
    const safeLimit = Math.max(1, Math.min(50, limit));

    if (!term) {
      return { items: [], error: null };
    }

    const pattern = `%${term}%`;
    const adminClient = getSupabaseAdminClient();

    const [usersResult, jobsResult] = await Promise.all([
      adminClient
        .from("profiles")
        .select("id, full_name, email, city, created_at")
        .or(`full_name.ilike.${pattern},email.ilike.${pattern},city.ilike.${pattern}`)
        .order("created_at", { ascending: false })
        .limit(safeLimit),
      adminClient
        .from("jobs")
        .select("id, title, description, created_at")
        .or(`title.ilike.${pattern},description.ilike.${pattern}`)
        .order("created_at", { ascending: false })
        .limit(safeLimit),
    ]);

    const items: AdminSearchResult[] = [];
    const failedSources: string[] = [];

    if (usersResult.error) {
      console.error("search:users", { term, error: usersResult.error.message });
      failedSources.push("users");
    } else {
      items.push(
        ...((usersResult.data ?? []) as unknown as UserSearchRow[]).map((row) => ({
          entity_type: "user" as const,
          entity_id: row.id,
          title: row.full_name || "Unknown user",
          subtitle: [row.email, row.city].filter(Boolean).join(" · ") || "User profile",
          created_at: row.created_at,
          link: `/staff/users?userId=${row.id}`,
        })),
      );
    }

    const jobItemsStartIdx = items.length; // Mark where job items start for efficient merging

    if (jobsResult.error) {
      console.error("search:jobs", { term, error: jobsResult.error.message });
      failedSources.push("jobs");
    } else {
      items.push(
        ...((jobsResult.data ?? []) as unknown as JobSearchRow[]).map((row) => ({
          entity_type: "job" as const,
          entity_id: row.id,
          title: row.title || "Untitled job",
          subtitle: row.description?.slice(0, 120) || "Job posting",
          created_at: row.created_at,
          link: `/staff/jobs?jobId=${row.id}`,
        })),
      );
    }

    if (failedSources.length === 2) {
      return {
        items: [],
        error: "Failed to search users and jobs.",
      };
    }

    // Both sources are already sorted by created_at DESC from the database
    // Use merge algorithm for O(n) instead of sorting for O(n log n)
    // Items array is [all users, all jobs] for efficient indexing without extra filter passes
    const mergedItems: AdminSearchResult[] = [];
    let userIdx = 0;
    let jobIdx = jobItemsStartIdx;

    while (mergedItems.length < safeLimit && (userIdx < jobItemsStartIdx || jobIdx < items.length)) {
      if (userIdx >= jobItemsStartIdx) {
        mergedItems.push(items[jobIdx++]);
      } else if (jobIdx >= items.length) {
        mergedItems.push(items[userIdx++]);
      } else {
        // Both available, pick the more recent one
        const userTime = toTimestamp(items[userIdx].created_at);
        const jobTime = toTimestamp(items[jobIdx].created_at);
        if (userTime >= jobTime) {
          mergedItems.push(items[userIdx++]);
        } else {
          mergedItems.push(items[jobIdx++]);
        }
      }
    }

    return {
      items: mergedItems,
      error: null,
    };
  } catch (error) {
    console.error("search:init", {
      query,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      items: [],
      error: "Failed to search users and jobs.",
    };
  }
}
