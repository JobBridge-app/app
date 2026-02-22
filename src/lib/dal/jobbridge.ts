import { supabaseServer } from "@/lib/supabaseServer";
import type { AccountType } from "@/lib/types";
import type { Database } from "@/lib/types/supabase";
import type { EffectiveViewSnapshot, ErrorInfo, JobsListItem, ApplicationRow, ApplicationStatus } from "@/lib/types/jobbridge";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// Haversine formula for calculating distance between two coordinates in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ────────────────────────────────────────────────────────────────────
// Shared helpers
// ────────────────────────────────────────────────────────────────────

type Result<T> = { ok: true; data: T } | { ok: false; error: ErrorInfo };

function toErrorInfo(error: unknown, extra?: Pick<ErrorInfo, "status" | "statusText">): ErrorInfo {
  if (!error) return { message: "Unknown error" };

  if (typeof error === "object" && error !== null && "message" in error) {
    const e = error as Partial<PostgrestError> & { message: string };
    return {
      message: e.message,
      code: typeof e.code === "string" ? e.code : undefined,
      details: typeof e.details === "string" ? e.details : undefined,
      hint: typeof e.hint === "string" ? e.hint : undefined,
      ...extra,
    };
  }

  if (typeof error === "string") return { message: error, ...extra };
  return { message: "Unknown error", ...extra };
}

// ────────────────────────────────────────────────────────────────────
// Auth helper
// ────────────────────────────────────────────────────────────────────

export async function getSessionUser(): Promise<Result<{ userId: string }>> {
  const supabase = await supabaseServer();
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return { ok: false, error: toErrorInfo(error) };
    if (!data.user?.id) return { ok: false, error: { message: "Nicht authentifiziert" } };
    return { ok: true, data: { userId: data.user.id } };
  } catch (e) {
    return { ok: false, error: toErrorInfo(e) };
  }
}

// ────────────────────────────────────────────────────────────────────
// Effective view (demo / role-override / base account type)
// ────────────────────────────────────────────────────────────────────

export async function getEffectiveView(opts?: {
  userId?: string;
  baseAccountType?: AccountType | null;
}): Promise<Result<EffectiveViewSnapshot>> {
  const supabase = await supabaseServer();

  // Resolve userId
  const userResult = opts?.userId ?? (await getSessionUser());
  if (typeof userResult !== "string" && !userResult.ok) return { ok: false, error: userResult.error };
  const userId = typeof userResult === "string" ? userResult : userResult.data.userId;
  if (!userId) return { ok: false, error: { message: "Missing userId" } };

  const [profileResult, rolesResult, demoResult, overrideResult] = await Promise.all([
    supabase.from("profiles").select("account_type").eq("id", userId).maybeSingle(),
    supabase.from("user_system_roles").select("role:system_roles(name)").eq("user_id", userId),
    supabase.from("demo_sessions" as any).select("enabled, demo_view").eq("user_id", userId).maybeSingle(),
    supabase.from("role_overrides" as never).select("view_as, expires_at").eq("user_id", userId).gt("expires_at", new Date().toISOString()).maybeSingle()
  ]);

  if (demoResult.error) return { ok: false, error: toErrorInfo(demoResult.error) };

  const systemRoles = rolesResult.data ? (rolesResult.data as any[]).map((r) => r.role?.name).filter(Boolean) : [];

  if ((demoResult.data as any)?.enabled === true) {
    const demoView = ((demoResult.data as any).demo_view as AccountType | null) ?? null;
    return {
      ok: true,
      data: {
        isDemoEnabled: true,
        viewRole: demoView ?? "job_seeker",
        source: "demo",
        roles: systemRoles,
        demoView,
        overrideExpiresAt: null,
      },
    };
  }

  // 2) Role override (live mode only)
  type RoleOverrideRow = { view_as: AccountType; expires_at: string };
  const override = (overrideResult.data ?? null) as unknown as RoleOverrideRow | null;

  // 3) Base account type
  let baseAccountType = opts?.baseAccountType ?? null;
  if (baseAccountType === undefined || baseAccountType === null) {
    if (opts?.baseAccountType === undefined) {
      baseAccountType = (profileResult.data?.account_type as AccountType | null) ?? null;
    }
  }

  const baseRole: AccountType = baseAccountType === "job_provider" ? "job_provider" : "job_seeker";

  return {
    ok: true,
    data: {
      isDemoEnabled: false,
      viewRole: override?.view_as ?? baseRole,
      source: "live",
      roles: systemRoles,
      overrideExpiresAt: override?.expires_at ?? null,
    },
  };
}

// ────────────────────────────────────────────────────────────────────
// Fetch jobs
// ────────────────────────────────────────────────────────────────────

export type FetchJobsParams = {
  mode: "feed" | "my_jobs";
  view: EffectiveViewSnapshot;
  userId: string;
  marketId?: string | null;
  status?: Database["public"]["Enums"]["job_status"] | Database["public"]["Enums"]["job_status"][];
  limit?: number;
  offset?: number;
};

/** Fetch the map of job IDs -> Application Data the current user has applied to. */
async function fetchAppliedJobIds(userId: string): Promise<Map<string, { id: string; status: ApplicationStatus }>> {
  if (!userId) return new Map();

  // Try admin client to bypass RLS; fall back to user client.
  let client: SupabaseClient<Database>;
  try {
    const admin = getSupabaseAdminClient();
    client = admin ?? (await supabaseServer());
  } catch {
    client = await supabaseServer();
  }

  const { data, error } = await client
    .from("applications")
    .select("id, job_id, status")
    .eq("user_id", userId);

  if (error) {
    console.warn("[DAL] fetchAppliedJobIds error", error.message);
    return new Map();
  }
  return new Map(data?.map((a) => [a.job_id, { id: a.id, status: a.status as ApplicationStatus }]) ?? []);
}

/** Map a raw DB row to the normalized `JobsListItem` shape. */
function toJobsListItem(row: Database["public"]["Tables"]["jobs"]["Row"] | Database["public"]["Tables"]["demo_jobs"]["Row"]): JobsListItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    posted_by: row.posted_by,
    status: row.status,
    created_at: String(row.created_at ?? ""),
    market_id: row.market_id ?? null,
    public_location_label: row.public_location_label ?? null,
    public_lat: row.public_lat ? Number(row.public_lat) : null,
    public_lng: row.public_lng ? Number(row.public_lng) : null,
    wage_hourly: row.wage_hourly != null ? Number(row.wage_hourly) : null,
    category: row.category ?? "",
    address_reveal_policy: row.address_reveal_policy ?? "after_apply",
    reach: (row as any).reach ?? 'internal_rheinbach',
    is_applied: false,
  };
}

/**
 * Enrich jobs with market info from `regions_live`.
 * The table has `city` (no `display_name` / `brand_prefix`).
 */
async function enrichWithMarketNames(
  supabase: SupabaseClient<Database>,
  items: JobsListItem[],
): Promise<JobsListItem[]> {
  const ids = [...new Set(items.filter((j) => j.market_id && !j.market_name).map((j) => j.market_id!))];
  if (ids.length === 0) return items;

  const { data, error } = await supabase.from("regions_live").select("id, city, display_name, brand_prefix").in("id", ids);
  if (error || !data) return items;

  const map = new Map(data.map((r) => [r.id, { city: r.city, displayName: r.display_name, brandPrefix: r.brand_prefix }]));
  return items.map((j) => {
    if (!j.market_id || j.market_name) return j;
    const m = map.get(j.market_id);
    return m ? { ...j, market_name: m.displayName || m.city, brand_prefix: m.brandPrefix } : j;
  });
}

/** Enrich jobs with creator profile info. */
async function enrichWithCreators(
  supabase: SupabaseClient<Database>,
  items: JobsListItem[],
): Promise<JobsListItem[]> {
  const ids = [...new Set(items.map((i) => i.posted_by).filter(Boolean))];
  if (ids.length === 0) return items;

  const { data: creators } = await supabase
    .from("profiles")
    .select("id, full_name, company_name, account_type, avatar_url")
    .in("id", ids);

  if (!creators) return items;

  const creatorMap = new Map(creators.map((c) => [c.id, c]));
  return items.map((i) => {
    const c = creatorMap.get(i.posted_by);
    return {
      ...i,
      creator: c ? { full_name: c.full_name, company_name: c.company_name, account_type: c.account_type as AccountType } : null,
    };
  });
}

/** Enrich reserved jobs with the active applicant info. */
async function enrichWithActiveApplicants(
  supabase: SupabaseClient<Database>,
  items: JobsListItem[],
): Promise<JobsListItem[]> {
  const reservedJobIds = items.filter(j => j.status === 'reserved').map(j => j.id);
  if (reservedJobIds.length === 0) return items;

  const { data: activeApps } = await supabase
    .from("applications")
    .select(`
      job_id,
      profiles (full_name, avatar_url)
    `)
    .in("job_id", reservedJobIds)
    .in("status", ["negotiating", "accepted"]);

  if (!activeApps) return items;

  const reserverMap = new Map();
  for (const app of activeApps) {
    const applicant = Array.isArray(app.profiles) ? app.profiles[0] : app.profiles;
    if (applicant) {
      reserverMap.set(app.job_id, applicant);
    }
  }

  return items.map((i) => {
    if (i.status === 'reserved') {
      const reserver = reserverMap.get(i.id);
      if (reserver) {
        return {
          ...i,
          active_applicant: {
            full_name: reserver.full_name,
            avatar_url: reserver.avatar_url
          }
        };
      }
    }
    return i;
  });
}

export async function fetchJobs(params: FetchJobsParams): Promise<Result<JobsListItem[]>> {
  const supabase = await supabaseServer();
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const status = params.status ?? "open";

  const applyRange = (q: any) => {
    if (!limit) return q;
    return q.range(offset, offset + limit - 1);
  };

  // Fetch user coordinates for distance calculation
  let userLat: number | null = null;
  let userLng: number | null = null;
  if (params.userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("lat, lng")
      .eq("id", params.userId)
      .single();
    if (profile) {
      userLat = profile.lat ?? null;
      userLng = profile.lng ?? null;
    }
  }

  // ── DEMO ──────────────────────────────────────────────────────────
  if (params.view.source === "demo") {
    let q = supabase.from("demo_jobs").select("*");
    if (params.mode === "feed") {
      if (Array.isArray(status)) {
        q = q.in("status", status);
      } else {
        q = q.eq("status", status);
      }
    }
    if (params.mode === "my_jobs") q = q.eq("posted_by", params.userId);
    q = q.order("created_at", { ascending: false });
    q = applyRange(q) as typeof q;

    const { data, error } = await q;
    if (error) return { ok: false, error: toErrorInfo(error) };

    const items = (data ?? []).map((row) => ({ ...toJobsListItem(row), is_applied: false }));
    return { ok: true, data: items };
  }

  // ── LIVE ──────────────────────────────────────────────────────────
  const appliedJobIds = await fetchAppliedJobIds(params.userId);

  let q = supabase.from("jobs").select("*");
  if (params.mode === "feed") {
    if (Array.isArray(status)) {
      q = q.in("status", status);
    } else {
      q = q.eq("status", status);
    }
    // Fetch local jobs OR extended jobs from other regions
    if (params.marketId) {
      q = q.or(`market_id.eq.${params.marketId},reach.eq.extended`);
    } else {
      // Fallback if user has no market_id: show everything for now or just extended? 
      // Safest is to just let it show everything if no market_id is set.
    }
  }
  if (params.mode === "my_jobs") q = q.eq("posted_by", params.userId);
  q = q.order("created_at", { ascending: false });
  q = applyRange(q) as typeof q;

  const { data, error } = await q;
  if (error) return { ok: false, error: toErrorInfo(error) };

  let items = (data ?? []).map((row) => {
    const appData = appliedJobIds.get(row.id);
    let distance_km = null;
    if (userLat != null && userLng != null && row.public_lat != null && row.public_lng != null) {
      distance_km = calculateDistance(userLat, userLng, Number(row.public_lat), Number(row.public_lng));
    }

    return {
      ...toJobsListItem(row),
      is_applied: !!appData,
      application_id: appData?.id || null,
      application_status: appData?.status || null,
      distance_km
    };
  });

  items = await enrichWithMarketNames(supabase, items) as typeof items;
  items = await enrichWithCreators(supabase, items) as typeof items;
  items = await enrichWithActiveApplicants(supabase, items) as typeof items;

  return { ok: true, data: items };
}

// ────────────────────────────────────────────────────────────────────
// Create job
// ────────────────────────────────────────────────────────────────────

export type CreateJobInput = {
  posted_by: string;
  market_id: string;
  title: string;
  description: string;
  wage_hourly: number;
  status: Database["public"]["Enums"]["job_status"];
  category: string;
  address_reveal_policy?: string | null;
  public_location_label?: string;
  public_lat?: number | null;
  public_lng?: number | null;
  reach?: 'internal_rheinbach' | 'extended' | null;
};

export type JobRow = Database["public"]["Tables"]["jobs"]["Row"] & {
  market_name?: string | null;
  distance_km?: number | null;
  is_applied?: boolean;
  creator?: {
    full_name: string | null;
    company_name: string | null;
    account_type: Database["public"]["Enums"]["account_type"] | null;
  } | null;
};

export type JobPrivateInput = {
  address_full?: string | null;
  private_lat?: number | null;
  private_lng?: number | null;
  notes?: string | null;
  /** Kept for RPC compatibility; not stored in the table directly. */
  location_id?: string | null;
};

export type CreateJobOutcome =
  | { outcome: "success"; jobId: string; privateDetails: "ok" | "skipped"; createdVia: "rpc" | "table" | "demo" }
  | { outcome: "partial"; jobId: string; privateDetails: "failed"; createdVia: "table"; privateError: ErrorInfo };

/** Upsert private details for a job. */
async function upsertJobPrivateDetails(
  supabase: SupabaseClient<Database>,
  jobId: string,
  params: JobPrivateInput,
): Promise<{ ok: true } | { ok: false; error: ErrorInfo }> {
  // Note: The generated Supabase types may be stale — the real DB columns are
  // address_full, private_lat, private_lng, notes. Cast to bypass type mismatch.
  const payload = {
    job_id: jobId,
    address_full: params.address_full ?? null,
    private_lat: params.private_lat ?? null,
    private_lng: params.private_lng ?? null,
    notes: params.notes ?? null,
  };

  const res = await supabase.from("job_private_details" as any).upsert(payload, { onConflict: "job_id" });
  if (res.error) return { ok: false, error: toErrorInfo(res.error) };
  return { ok: true };
}

export async function createJob(params: {
  view: EffectiveViewSnapshot;
  userId: string;
  job: CreateJobInput;
  privateDetails: JobPrivateInput | null;
}): Promise<Result<CreateJobOutcome>> {
  const supabase = await supabaseServer();

  // ── DEMO ──────────────────────────────────────────────────────────
  if (params.view.source === "demo") {
    const res = await supabase
      .from("demo_jobs" as any)
      .insert({
        posted_by: params.userId,
        market_id: params.job.market_id,
        title: params.job.title,
        description: params.job.description,
        wage_hourly: params.job.wage_hourly ?? null,
        status: params.job.status,
        category: params.job.category,
        address_reveal_policy: params.job.address_reveal_policy ?? "after_accept",
        public_location_label: params.job.public_location_label ?? null,
        public_lat: params.job.public_lat ?? null,
        public_lng: params.job.public_lng ?? null,
      })
      .select("id")
      .single();

    if (res.error || !(res.data as any)?.id) {
      return { ok: false, error: toErrorInfo(res.error ?? { message: "Demo job insert returned no row" }) };
    }
    return { ok: true, data: { outcome: "success", jobId: (res.data as any).id, privateDetails: "skipped", createdVia: "demo" } };
  }

  // ── LIVE: Try atomic RPC first ────────────────────────────────────
  const rpcRes = await (supabase.rpc as any)("create_job_atomic", {
    p_market_id: params.job.market_id,
    p_title: params.job.title,
    p_description: params.job.description,
    p_wage_hourly: params.job.wage_hourly,
    p_category: params.job.category,
    p_address_reveal_policy: params.job.address_reveal_policy ?? "after_accept",
    p_public_location_label: params.job.public_location_label ?? "",
    p_public_lat: params.job.public_lat ?? null,
    p_public_lng: params.job.public_lng ?? null,
    p_address_full: params.privateDetails?.address_full ?? null,
    p_private_lat: params.privateDetails?.private_lat ?? null,
    p_private_lng: params.privateDetails?.private_lng ?? null,
    p_notes: params.privateDetails?.notes ?? null,
    p_location_id: params.privateDetails?.location_id ?? null,
  });

  const rpcData = rpcRes.data as unknown;
  if (!rpcRes.error && typeof rpcData === "object" && rpcData !== null && "id" in rpcData) {
    return { ok: true, data: { outcome: "success", jobId: String((rpcData as { id: string }).id), privateDetails: "ok", createdVia: "rpc" } };
  }

  // Log RPC failure but continue to table fallback
  if (rpcRes.error) {
    console.warn("[DAL] create_job_atomic RPC failed, falling back to table insert:", rpcRes.error.message);
  }

  // ── LIVE: Table fallback (non-atomic) ─────────────────────────────
  const jobInsert = await supabase
    .from("jobs")
    .insert({
      posted_by: params.userId,
      market_id: params.job.market_id,
      title: params.job.title,
      description: params.job.description,
      wage_hourly: params.job.wage_hourly,
      status: params.job.status,
      category: params.job.category,
      address_reveal_policy: params.job.address_reveal_policy ?? "after_accept",
      public_location_label: params.job.public_location_label ?? "",
      public_lat: params.job.public_lat ?? null,
      public_lng: params.job.public_lng ?? null,
    } as any)
    .select("id")
    .single();

  if (jobInsert.error || !jobInsert.data?.id) {
    return { ok: false, error: toErrorInfo(jobInsert.error ?? { message: "jobs insert returned no row" }) };
  }

  const jobId = jobInsert.data.id;

  if (!params.privateDetails) {
    return { ok: true, data: { outcome: "success", jobId, privateDetails: "skipped", createdVia: "table" } };
  }

  const privRes = await upsertJobPrivateDetails(supabase, jobId, params.privateDetails);
  if (privRes.ok) {
    return { ok: true, data: { outcome: "success", jobId, privateDetails: "ok", createdVia: "table" } };
  }

  return { ok: true, data: { outcome: "partial", jobId, privateDetails: "failed", createdVia: "table", privateError: privRes.error } };
}

// ────────────────────────────────────────────────────────────────────
// Retry private details (used when initial save fails)
// ────────────────────────────────────────────────────────────────────

export async function retrySaveJobPrivateDetails(params: {
  jobId: string;
  privateDetails: JobPrivateInput;
}): Promise<Result<{ ok: true }>> {
  const supabase = await supabaseServer();
  const res = await upsertJobPrivateDetails(supabase, params.jobId, params.privateDetails);
  if (res.ok) return { ok: true, data: { ok: true } };
  return { ok: false, error: res.error };
}

// ────────────────────────────────────────────────────────────────────
// Fetch job applications
// ────────────────────────────────────────────────────────────────────

export async function fetchJobApplications(jobId: string, _userId: string): Promise<Result<ApplicationRow[]>> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: toErrorInfo(error) };

  let items = (data as ApplicationRow[]) ?? [];

  // Enrich with applicant profile
  const applicantIds = [...new Set(items.map((i) => i.user_id).filter(Boolean))];
  if (applicantIds.length > 0) {
    const { data: applicants } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", applicantIds);

    if (applicants) {
      const map = new Map(applicants.map((a) => [a.id, a]));
      items = items.map((i) => ({ ...i, applicant: map.get(i.user_id) ?? null }));
    }
  }

  return { ok: true, data: items };
}

export async function fetchCandidateApplications(userId: string): Promise<Result<{ job: JobsListItem; status: Database["public"]["Enums"]["application_status"] }[]>> {
  const supabase = await supabaseServer();

  // Fetch user coordinates for distance calculation
  let userLat: number | null = null;
  let userLng: number | null = null;
  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("lat, lng")
      .eq("id", userId)
      .single();
    if (profile) {
      userLat = profile.lat ?? null;
      userLng = profile.lng ?? null;
    }
  }

  const { data, error } = await supabase
    .from("applications")
    .select("status, job:jobs(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: toErrorInfo(error) };

  // Map to JobsListItem
  let items = (data ?? []).map((row: any) => {
    const rawJob = row.job;
    let distance_km = null;

    // Calculate distance if both user and public job coordinates exist
    if (userLat != null && userLng != null && rawJob.public_lat != null && rawJob.public_lng != null) {
      distance_km = calculateDistance(userLat, userLng, Number(rawJob.public_lat), Number(rawJob.public_lng));
    }

    return {
      job: {
        ...toJobsListItem(rawJob),
        is_applied: true,
        application_status: row.status,
        application_id: row.id,
        distance_km
      } as JobsListItem,
      status: row.status as any // force cast
    };
  });

  // Enrich with market/creator (optimization: we could batch this, but for now reuse existing)
  // We need to extract the jobs list to enrich
  let jobsList = items.map((i: any) => i.job);
  jobsList = await enrichWithMarketNames(supabase, jobsList) as JobsListItem[];
  jobsList = await enrichWithCreators(supabase, jobsList) as JobsListItem[];

  // Re-attach enriched jobs
  const enrichedItems = items.map((item: any, index: number) => ({
    ...item,
    job: jobsList[index]
  }));

  return { ok: true, data: enrichedItems };
}
