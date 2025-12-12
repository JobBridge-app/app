"use client";

import { createBrowserClient } from "@supabase/ssr";
import { Database } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("Missing Supabase env vars. Bitte NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local setzen.");
}

export const supabaseBrowser = createBrowserClient<Database>(url, anonKey);

// Legacy export für Kompatibilität während der Migration
export const createSupabaseClient = () => supabaseBrowser;
