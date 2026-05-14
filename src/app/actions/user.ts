"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseServer } from "@/lib/supabaseServer";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Checks if a user has any system roles (staff) using the admin client
 * to bypass RLS policies that prevent users from seeing other users' roles.
 */
export async function checkIsStaffAction(userId: string): Promise<boolean> {
    if (!userId || !UUID_PATTERN.test(userId)) return false;
    
    try {
        const supabase = await supabaseServer();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return false;

        const { count, error } = await supabaseAdmin()
            .from("user_system_roles")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId);
            
        if (error) {
            console.error("Error checking staff status:", error);
            return false;
        }
        
        return (count || 0) > 0;
    } catch (e) {
        console.error("Exception checking staff status:", e);
        return false;
    }
}
