"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Checks if a user has any system roles (staff) using the admin client
 * to bypass RLS policies that prevent users from seeing other users' roles.
 */
export async function checkIsStaffAction(userId: string): Promise<boolean> {
    if (!userId) return false;
    
    try {
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
