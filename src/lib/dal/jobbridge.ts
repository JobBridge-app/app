import { supabaseServer } from "@/lib/supabaseServer";
import type { AccountType, UserType } from "@/lib/types";
import type { Database } from "@/lib/types/supabase";
import type { EffectiveViewSnapshot, ErrorInfo, JobsListItem } from "@/lib/types/jobbridge";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

type Result<T> = { ok: true; data: T; debug: Record<string, unknown> } | { ok: false; error: ErrorInfo; debug: Record<string, unknown> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toErrorInfo(error: unknown, extra?: Pick<ErrorInfo, "status" | "statusText">): ErrorInfo {
  if (!error) return { message: "Unknown error" };

  if (isRecord(error) && typeof error.message === "string") {
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

function isLikelyMissingRpc(error: ErrorInfo): boolean {
  // PostgREST may use different codes depending on version/config. Be generous here.
  const msg = (error.message || "").toLowerCase();
  return (
    msg.includes("could not find the function") ||
    msg.includes("function") && msg.includes("does not exist") ||
    msg.includes("no function matches") ||
    error.code === "PGRST202"
  );
}

function debugEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_DEBUG_QUERY_PANEL === "true";
}

export async function getSessionUser(): Promise<Result<{ userId: string }>> {
  const supabase = await supabaseServer();

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      return { ok: false, error: toErrorInfo(error), debug: { step: "auth.getUser" } };
    }
    if (!data.user?.id) {
      return { ok: false, error: { message: "Nicht authentifiziert" }, debug: { step: "auth.getUser" } };
    }
    return { ok: true, data: { userId: data.user.id }, debug: { step: "auth.getUser" } };
  } catch (e) {
    return { ok: false, error: toErrorInfo(e), debug: { step: "auth.getUser" } };
  }
}

export async function getEffectiveView(opts?: {
  userId?: string;
  baseUserType?: UserType | null;
}): Promise<Result<EffectiveViewSnapshot>> {
  const supabase = await supabaseServer();

  const debug: Record<string, unknown> = {
    fn: "getEffectiveView",
  };

  const userId = opts?.userId ?? (await getSessionUser());
  if (typeof userId !== "string" && !userId.ok) {
    return { ok: false, error: userId.error, debug: { ...debug, step: "resolveUserId" } };
  }

  const resolvedUserId = typeof userId === "string" ? userId : userId.data.userId;
  if (!resolvedUserId) {
    return { ok: false, error: { message: "Missing userId" }, debug: { ...debug, step: "resolveUserId" } };
  }

  // 1) Demo mode is the ONLY switch for demo_* tables.
  const demoRes = await supabase
    .from("demo_sessions")
    .select("enabled, demo_view")
    .eq("user_id", resolvedUserId)
    .maybeSingle();

  debug.demo_sessions = {
    hasRow: Boolean(demoRes.data),
    enabled: demoRes.data?.enabled ?? null,
    demo_view: demoRes.data?.demo_view ?? null,
    status: demoRes.status,
    error: demoRes.error ? toErrorInfo(demoRes.error, { status: demoRes.status, statusText: demoRes.statusText }) : null,
  };

  if (demoRes.error) {
    return {
      ok: false,
      error: toErrorInfo(demoRes.error, { status: demoRes.status, statusText: demoRes.statusText }),
      debug,
    };
  }

  const isDemoEnabled = demoRes.data?.enabled === true;
  if (isDemoEnabled) {
    const demoView = (demoRes.data?.demo_view as AccountType | null | undefined) ?? null;
    const viewRole: AccountType = demoView ?? "job_seeker";
    const result: EffectiveViewSnapshot = {
      isDemoEnabled: true,
      viewRole,
      source: "demo",
      demoView,
      overrideExpiresAt: null,
    };
    return { ok: true, data: result, debug };
  }

  // 2) Role override is only relevant in live mode.
  const nowIso = new Date().toISOString();
  type RoleOverrideRow = { view_as: AccountType; expires_at: string };
  const overrideRes = await supabase
    .from("role_overrides" as never)
    .select("view_as, expires_at")
    .eq("user_id", resolvedUserId)
    .gt("expires_at", nowIso)
    .maybeSingle();
  const override = (overrideRes.data ?? null) as unknown as RoleOverrideRow | null;

  debug.role_overrides = {
    hasRow: Boolean(override),
    view_as: override?.view_as ?? null,
    expires_at: override?.expires_at ?? null,
    status: overrideRes.status,
    error: overrideRes.error ? toErrorInfo(overrideRes.error, { status: overrideRes.status, statusText: overrideRes.statusText }) : null,
  };

  if (overrideRes.error) {
    return { ok: false, error: toErrorInfo(overrideRes.error, { status: overrideRes.status, statusText: overrideRes.statusText }), debug };
  }

  let baseUserType = opts?.baseUserType ?? null;
  if (typeof opts?.baseUserType === "undefined") {
    const profileRes = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", resolvedUserId)
      .maybeSingle();

    debug.profiles = {
      hasRow: Boolean(profileRes.data),
      user_type: profileRes.data?.user_type ?? null,
      status: profileRes.status,
      error: profileRes.error ? toErrorInfo(profileRes.error, { status: profileRes.status, statusText: profileRes.statusText }) : null,
    };

    if (profileRes.error) {
      return { ok: false, error: toErrorInfo(profileRes.error, { status: profileRes.status, statusText: profileRes.statusText }), debug };
    }

    baseUserType = (profileRes.data?.user_type as UserType | null | undefined) ?? null;
  }

  const baseRole: AccountType = baseUserType === "youth" || baseUserType === null ? "job_seeker" : "job_provider";
  const overrideRole: AccountType | null = override?.view_as ?? null;

  const result: EffectiveViewSnapshot = {
    isDemoEnabled: false,
    viewRole: overrideRole ?? baseRole,
    source: "live",
    overrideExpiresAt: override?.expires_at ?? null,
  };

  return { ok: true, data: result, debug };
}

export type FetchJobsParams = {
  mode: "feed" | "my_jobs";
  view: EffectiveViewSnapshot;
  userId: string;
  marketId?: string | null;
  status?: Database["public"]["Enums"]["job_status"];
  limit?: number;
  offset?: number;
};

function rangeFor(limit: number | undefined, offset: number | undefined): { from: number; to: number } | null {
  if (!limit) return null;
  const from = Math.max(0, offset ?? 0);
  const to = from + Math.max(0, limit - 1);
  return { from, to };
}

function mapJobsListItem(row: unknown): JobsListItem {
  const r = isRecord(row) ? row : {};
  return {
    id: String(r.id ?? ""),
    title: String(r.title ?? ""),
    description: String(r.description ?? ""),
    posted_by: String(r.posted_by ?? ""),
    status: r.status as JobsListItem["status"],
    created_at: String(r.created_at ?? ""),
    market_id: (r.market_id as string | null | undefined) ?? null,
    public_location_label: (r.public_location_label as string | null | undefined) ?? null,
    wage_hourly: typeof r.wage_hourly === "number" ? r.wage_hourly : (r.wage_hourly as number | null | undefined) ?? null,
    distance_km: typeof r.distance_km === "number" ? r.distance_km : (r.distance_km as number | null | undefined) ?? null,
    market_name: typeof r.market_name === "string" ? r.market_name : (r.market_name as string | null | undefined) ?? null,
    brand_prefix: typeof r.brand_prefix === "string" ? r.brand_prefix : (r.brand_prefix as string | null | undefined) ?? null,
  };
}

async function enrichMarketsIfPossible(
  supabase: SupabaseClient<Database>,
  items: JobsListItem[],
  debug: Record<string, unknown>
): Promise<JobsListItem[]> {
  // Only enrich when missing market_name and we have market_id values.
  const missing = items.filter((j) => (j.market_id ? !j.market_name : false));
  const ids = Array.from(new Set(missing.map((j) => j.market_id).filter(Boolean))) as string[];
  if (ids.length === 0) return items;

  const regionRes = await supabase.from("regions_live").select("id, display_name, brand_prefix").in("id", ids);

  debug.regions_live = {
    attempted: true,
    ids: ids.length,
    status: regionRes.status,
    error: regionRes.error ? toErrorInfo(regionRes.error, { status: regionRes.status, statusText: regionRes.statusText }) : null,
  };

  if (regionRes.error || !Array.isArray(regionRes.data)) return items;

  const map = new Map<string, { display_name?: string | null; brand_prefix?: string | null }>();
  for (const r of regionRes.data) {
    map.set(String(r.id), { display_name: r.display_name ?? null, brand_prefix: r.brand_prefix ?? null });
  }

  return items.map((j) => {
    if (!j.market_id || j.market_name) return j;
    const m = map.get(j.market_id);
    if (!m) return j;
    return { ...j, market_name: m.display_name ?? null, brand_prefix: m.brand_prefix ?? null };
  });
}

export async function fetchJobs(params: FetchJobsParams): Promise<Result<JobsListItem[]>> {
  const supabase = await supabaseServer();

  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const status = params.status ?? "open";

  const debug: Record<string, unknown> = {
    fn: "fetchJobs",
    source: params.view.source,
    viewRole: params.view.viewRole,
    mode: params.mode,
    filters: {
      status,
      marketId: params.marketId ?? null,
      limit,
      offset,
    },
  };

  const log = (event: string, payload: Record<string, unknown>) => {
    if (!debugEnabled()) return;
    console.log(`[DAL] ${event}`, payload);
  };

  // DEMO
  if (params.view.source === "demo") {
    const table = "demo_jobs";
    log("fetchJobs.demo.start", { table, mode: params.mode, status, limit, offset });

    let q = supabase.from(table).select("*");
    if (params.mode === "feed") q = q.eq("status", status);
    if (params.mode === "my_jobs") q = q.eq("posted_by", params.userId);
    q = q.order("created_at", { ascending: false });

    const r = rangeFor(limit, offset);
    if (r) q = q.range(r.from, r.to);

    const res = await q;
    debug.primary = { kind: "table", target: table, status: res.status };

    if (res.error) {
      const err = toErrorInfo(res.error, { status: res.status, statusText: res.statusText });
      debug.primary = { ...(debug.primary as Record<string, unknown>), error: err };
      log("fetchJobs.demo.error", { table, err });
      return { ok: false, error: err, debug };
    }

    const items = Array.isArray(res.data) ? res.data.map(mapJobsListItem) : [];
    log("fetchJobs.demo.ok", { table, rows: items.length });
    return { ok: true, data: items, debug };
  }

  // LIVE
  if (params.mode === "feed" && params.marketId) {
    log("fetchJobs.live.rpc.start", { rpc: "get_jobs_feed", marketId: params.marketId, limit, offset });
    const rpcRes = await supabase.rpc("get_jobs_feed", {
      p_market_id: params.marketId,
      p_user_lat: null,
      p_user_lng: null,
      p_limit: limit,
      p_offset: offset,
    });

    debug.primary = { kind: "rpc", target: "get_jobs_feed", status: rpcRes.status };

    const rpcRows = rpcRes.data as unknown;
    if (!rpcRes.error && Array.isArray(rpcRows)) {
      const items = (rpcRows as unknown[]).map((row) => {
        const item = mapJobsListItem(row);
        // RPC doesn't always return wage_hourly; keep UI stable.
        return { ...item, wage_hourly: null };
      });
      log("fetchJobs.live.rpc.ok", { rows: items.length });

      // Defensive: If RPC returns [], still try table fallback to avoid masking RLS/joins as "no jobs".
      if (items.length > 0) {
        return { ok: true, data: items, debug };
      }
      debug.primary = { ...(debug.primary as Record<string, unknown>), note: "rpc returned empty array; trying table fallback" };
    }

    if (rpcRes.error) {
      const err = toErrorInfo(rpcRes.error, { status: rpcRes.status, statusText: rpcRes.statusText });
      debug.primary = { ...(debug.primary as Record<string, unknown>), error: err };
      log("fetchJobs.live.rpc.error", { err });
      // Fall through to table fallback.
    } else {
      debug.primary = { ...(debug.primary as Record<string, unknown>), note: "rpc returned non-array data" };
    }
  } else {
    debug.primary = params.mode === "feed"
      ? { kind: "rpc", target: "get_jobs_feed", skipped: true, reason: "missing marketId" }
      : { kind: "rpc", target: "get_jobs_feed", skipped: true, reason: "mode != feed" };
  }

  // Fallback: table select
  const liveTable = "jobs";
  log("fetchJobs.live.table.start", { table: liveTable, mode: params.mode, status, limit, offset });

  let q = supabase.from(liveTable).select("*");
  if (params.mode === "feed") q = q.eq("status", status);
  if (params.mode === "my_jobs") q = q.eq("posted_by", params.userId);
  q = q.order("created_at", { ascending: false });

  const r = rangeFor(limit, offset);
  if (r) q = q.range(r.from, r.to);

  const tableRes = await q;
  debug.fallback = { kind: "table", target: liveTable, status: tableRes.status };

  if (tableRes.error) {
    const err = toErrorInfo(tableRes.error, { status: tableRes.status, statusText: tableRes.statusText });
    debug.fallback = { ...(debug.fallback as Record<string, unknown>), error: err };
    log("fetchJobs.live.table.error", { err });
    return { ok: false, error: err, debug };
  }

  let items = Array.isArray(tableRes.data) ? tableRes.data.map(mapJobsListItem) : [];
  items = await enrichMarketsIfPossible(supabase, items, debug);

  log("fetchJobs.live.table.ok", { rows: items.length });
  return { ok: true, data: items, debug };
}

export type CreateJobInput = {
  posted_by: string;
  market_id: string;
  title: string;
  description: string;
  wage_hourly: number;
  status: Database["public"]["Enums"]["job_status"];
  category: Database["public"]["Enums"]["job_category"];
  address_reveal_policy?: "after_apply" | "after_accept";
  public_location_label?: string;
  public_lat?: number | null;
  public_lng?: number | null;
};

export type JobPrivateInput = {
  address_full?: string | null;
  private_lat?: number | null;
  private_lng?: number | null;
  notes?: string | null;
  location_id?: string | null;
};

export type CreateJobOutcome =
  | { outcome: "success"; jobId: string; privateDetails: "ok" | "skipped"; createdVia: "rpc" | "table" | "demo" }
  | { outcome: "partial"; jobId: string; privateDetails: "failed"; createdVia: "table"; privateError: ErrorInfo };

async function upsertJobPrivateDetailsNewSchema(
  supabase: SupabaseClient<Database>,
  jobId: string,
  params: JobPrivateInput
): Promise<{ ok: true } | { ok: false; error: ErrorInfo }> {
  // The backend schema is messy/out-of-sync. Allow extra columns via an index signature.
  const payload = {
    job_id: jobId,
    address_full: params.address_full ?? null,
    private_lat: params.private_lat ?? null,
    private_lng: params.private_lng ?? null,
    notes: params.notes ?? null,
    location_id: params.location_id ?? null,
  } as Database["public"]["Tables"]["job_private_details"]["Insert"] & Record<string, unknown>;

  const res = await supabase.from("job_private_details").upsert(payload, { onConflict: "job_id" });

  if (res.error) return { ok: false, error: toErrorInfo(res.error, { status: res.status, statusText: res.statusText }) };
  return { ok: true };
}

async function upsertJobPrivateDetailsLegacySchema(
  supabase: SupabaseClient<Database>,
  jobId: string,
  params: JobPrivateInput
): Promise<{ ok: true } | { ok: false; error: ErrorInfo }> {
  // Legacy schema seen in generated types: address_street/contact_email/contact_phone.
  const payload: Database["public"]["Tables"]["job_private_details"]["Insert"] = {
    job_id: jobId,
    address_street: params.address_full ?? null,
    contact_email: null,
    contact_phone: null,
  };
  const res = await supabase.from("job_private_details").upsert(payload, { onConflict: "job_id" });

  if (res.error) return { ok: false, error: toErrorInfo(res.error, { status: res.status, statusText: res.statusText }) };
  return { ok: true };
}

async function saveJobPrivateDetailsDefensive(
  supabase: SupabaseClient<Database>,
  jobId: string,
  params: JobPrivateInput,
  debug: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; error: ErrorInfo }> {
  const first = await upsertJobPrivateDetailsNewSchema(supabase, jobId, params);
  debug.job_private_details = { attempt: "new_schema", ok: first.ok, error: first.ok ? null : first.error };
  if (first.ok) return { ok: true };

  // If columns don't exist (or similar), try legacy mapping.
  const msg = (first.error.message || "").toLowerCase();
  const looksLikeSchemaMismatch = msg.includes("column") || msg.includes("address_full") || msg.includes("private_lat") || first.error.code === "42703";
  if (!looksLikeSchemaMismatch) return first;

  const second = await upsertJobPrivateDetailsLegacySchema(supabase, jobId, params);
  debug.job_private_details = {
    attempt: "legacy_schema",
    ok: second.ok,
    firstError: first.error,
    error: second.ok ? null : second.error,
  };
  return second;
}

export async function createJob(params: {
  view: EffectiveViewSnapshot;
  userId: string;
  job: CreateJobInput;
  privateDetails: JobPrivateInput | null;
}): Promise<Result<CreateJobOutcome>> {
  const supabase = await supabaseServer();

  const debug: Record<string, unknown> = {
    fn: "createJob",
    source: params.view.source,
    viewRole: params.view.viewRole,
  };

  const log = (event: string, payload: Record<string, unknown>) => {
    if (!debugEnabled()) return;
    console.log(`[DAL] ${event}`, payload);
  };

  // DEMO
  if (params.view.source === "demo") {
    log("createJob.demo.start", { table: "demo_jobs" });
    const payload = {
      posted_by: params.userId,
      market_id: params.job.market_id,
      title: params.job.title,
      description: params.job.description,
      wage_hourly: params.job.wage_hourly ?? null,
      status: params.job.status,
      category: params.job.category,
      address_reveal_policy: params.job.address_reveal_policy ?? "after_apply",
      public_location_label: params.job.public_location_label ?? null,
      public_lat: params.job.public_lat ?? null,
      public_lng: params.job.public_lng ?? null,
    } as Database["public"]["Tables"]["demo_jobs"]["Insert"] & Record<string, unknown>;

    const res = await supabase.from("demo_jobs").insert(payload).select().single();

    debug.demo_jobs = { status: res.status, error: res.error ? toErrorInfo(res.error, { status: res.status, statusText: res.statusText }) : null };

    if (res.error || !res.data?.id) {
      const err = toErrorInfo(res.error ?? { message: "Demo job insert returned no row" }, { status: res.status, statusText: res.statusText });
      log("createJob.demo.error", { err });
      return { ok: false, error: err, debug };
    }

    log("createJob.demo.ok", { jobId: res.data.id });
    return {
      ok: true,
      data: { outcome: "success", jobId: res.data.id, privateDetails: "skipped", createdVia: "demo" },
      debug,
    };
  }

  // LIVE
  // 1) Try atomic RPC if available.
  log("createJob.live.rpc.start", { rpc: "create_job_atomic" });
  const rpcRes = await supabase.rpc("create_job_atomic", {
    p_market_id: params.job.market_id,
    p_title: params.job.title,
    p_description: params.job.description,
    p_wage_hourly: params.job.wage_hourly,
    p_category: params.job.category,
    p_address_reveal_policy: params.job.address_reveal_policy ?? "after_apply",
    p_public_location_label: params.job.public_location_label ?? "",
    p_public_lat: params.job.public_lat ?? null,
    p_public_lng: params.job.public_lng ?? null,
    // Private Details
    p_address_full: params.privateDetails?.address_full ?? null,
    p_private_lat: params.privateDetails?.private_lat ?? null,
    p_private_lng: params.privateDetails?.private_lng ?? null,
    p_notes: params.privateDetails?.notes ?? null,
    p_location_id: params.privateDetails?.location_id ?? null,
  });

  debug.create_job_atomic = {
    status: rpcRes.status,
    error: rpcRes.error ? toErrorInfo(rpcRes.error, { status: rpcRes.status, statusText: rpcRes.statusText }) : null,
    hasData: Boolean(rpcRes.data),
  };

  const rpcData = rpcRes.data as unknown;
  if (!rpcRes.error && isRecord(rpcData) && "id" in rpcData) {
    const jobId = String((rpcData as Record<string, unknown>).id ?? "");
    log("createJob.live.rpc.ok", { jobId });
    return { ok: true, data: { outcome: "success", jobId, privateDetails: "ok", createdVia: "rpc" }, debug };
  }

  if (rpcRes.error) {
    const rpcErr = toErrorInfo(rpcRes.error, { status: rpcRes.status, statusText: rpcRes.statusText });
    log("createJob.live.rpc.error", { rpcErr });
    debug.create_job_atomic = { ...(debug.create_job_atomic as Record<string, unknown>), fallback: "table", rpcKind: isLikelyMissingRpc(rpcErr) ? "missing" : "error" };
  } else {
    // RPC returned no error but also no usable data; fall back for safety.
    debug.create_job_atomic = { ...(debug.create_job_atomic as Record<string, unknown>), note: "no id returned; falling back to table inserts" };
  }

  // 2) Table fallback (non-atomic). Must handle partial success explicitly.
  log("createJob.live.table.start", { table: "jobs" });
  const insertPayload = {
    posted_by: params.userId,
    market_id: params.job.market_id,
    title: params.job.title,
    description: params.job.description,
    wage_hourly: params.job.wage_hourly,
    status: params.job.status,
    category: params.job.category,
    address_reveal_policy: params.job.address_reveal_policy ?? "after_apply",
    public_location_label: params.job.public_location_label ?? "",
    public_lat: params.job.public_lat ?? null,
    public_lng: params.job.public_lng ?? null,
  } as Database["public"]["Tables"]["jobs"]["Insert"] & Record<string, unknown>;

  const jobInsert = await supabase.from("jobs").insert(insertPayload).select().single();

  debug.jobs_insert = {
    status: jobInsert.status,
    error: jobInsert.error ? toErrorInfo(jobInsert.error, { status: jobInsert.status, statusText: jobInsert.statusText }) : null,
    hasRow: Boolean(jobInsert.data),
  };

  if (jobInsert.error || !jobInsert.data?.id) {
    const err = toErrorInfo(jobInsert.error ?? { message: "jobs insert returned no row" }, { status: jobInsert.status, statusText: jobInsert.statusText });
    log("createJob.live.table.error", { err });
    return { ok: false, error: err, debug };
  }

  const jobId = String(jobInsert.data.id);
  log("createJob.live.table.ok", { jobId });

  if (!params.privateDetails) {
    return { ok: true, data: { outcome: "success", jobId, privateDetails: "skipped", createdVia: "table" }, debug };
  }

  log("createJob.live.private.start", { table: "job_private_details", jobId });
  const privRes = await saveJobPrivateDetailsDefensive(supabase, jobId, params.privateDetails, debug);
  if (privRes.ok) {
    log("createJob.live.private.ok", { jobId });
    return { ok: true, data: { outcome: "success", jobId, privateDetails: "ok", createdVia: "table" }, debug };
  }

  log("createJob.live.private.error", { jobId, err: privRes.error });
  return { ok: true, data: { outcome: "partial", jobId, privateDetails: "failed", createdVia: "table", privateError: privRes.error }, debug };
}

export async function retrySaveJobPrivateDetails(params: {
  jobId: string;
  privateDetails: JobPrivateInput;
}): Promise<Result<{ ok: true }>> {
  const supabase = await supabaseServer();
  const debug: Record<string, unknown> = { fn: "retrySaveJobPrivateDetails", jobId: params.jobId };

  const res = await saveJobPrivateDetailsDefensive(supabase, params.jobId, params.privateDetails, debug);
  if (res.ok) return { ok: true, data: { ok: true }, debug };
  return { ok: false, error: res.error, debug };
}
