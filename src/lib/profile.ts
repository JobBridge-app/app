import type { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./types/supabase";
import { Profile } from "./types";

export const getProfileById = async (
  supabase: SupabaseClient<Database>,
  userId: string
) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
};

export const saveProfile = async (
  supabase: SupabaseClient<Database>,
  payload: Partial<Profile> & { id: string }
) => {
  // Cast to any because our local TS types can drift from the DB until we regenerate them.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertPayload: any = {
    id: payload.id,
    full_name: payload.full_name ?? "",
    birthdate: payload.birthdate ?? null,
    city: payload.city ?? null,
    market_id: payload.market_id ?? null,
    account_type: payload.account_type ?? null,
    provider_kind: payload.provider_kind ?? null,
    company_name: payload.company_name ?? null,
    company_contact_email: payload.company_contact_email ?? null,
    company_message: payload.company_message ?? null,
    // Add email if provided, otherwise rely on existing or DB trigger
    ...(payload.email ? { email: payload.email } : {}),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(insertPayload, { onConflict: "id" })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Profile; // Cast back to Profile (with birthdate)
};
