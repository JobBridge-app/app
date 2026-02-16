import { createClient } from "@supabase/supabase-js";
import { Database } from "@/lib/types/supabase";

export function supabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
        throw new Error("Missing Supabase Admin env vars. Bitte SUPABASE_SERVICE_ROLE_KEY in .env.local setzen.");
    }

    return createClient<Database>(url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
