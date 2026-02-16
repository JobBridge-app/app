"use server";

import { supabaseServer } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import { requireCurrentStaffContext } from "@/lib/data/adminAuth";
import { grantRoleToUserByEmail, removeRoleFromUser, setUserRole } from "@/lib/data/adminRoles";

type DemoView = "job_seeker" | "job_provider";

async function revalidateAdminPaths() {
    revalidatePath("/admin");
    revalidatePath("/admin/demo");
    revalidatePath("/staff");
    revalidatePath("/staff/demo");
    revalidatePath("/app-home");
}

export async function setDemoMode(view: DemoView) {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "No user session found." };

    const { error } = await supabase.from("demo_sessions").upsert({
        user_id: user.id,
        enabled: true,
        demo_view: view,
        updated_at: new Date().toISOString(),
    });

    if (error) {
        console.error("setDemoMode failed:", error);
        return { error: "Failed to activate demo mode." };
    }

    await revalidateAdminPaths();
    return { success: true, enabled: true, demo_view: view };
}

export async function deactivateDemoMode() {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "No user session found." };

    const { data: currentSession } = await supabase
        .from("demo_sessions")
        .select("demo_view")
        .eq("user_id", user.id)
        .maybeSingle();

    const currentDemoView: DemoView = currentSession?.demo_view === "job_provider" ? "job_provider" : "job_seeker";

    const { error } = await supabase.from("demo_sessions").upsert({
        user_id: user.id,
        enabled: false,
        demo_view: currentDemoView,
        updated_at: new Date().toISOString(),
    });

    if (error) {
        console.error("deactivateDemoMode failed:", error);
        return { error: "Failed to deactivate demo mode." };
    }

    await revalidateAdminPaths();
    return { success: true, enabled: false };
}

export async function toggleDemoMode(enabled: boolean, view: DemoView = "job_seeker") {
    if (enabled) return setDemoMode(view);
    return deactivateDemoMode();
}

export async function seedDemoData() {
    return { error: "Demo data seeding is disabled in this environment." };
}

export async function setUserRoleAction(userId: string, roleName: string) {
    const context = await requireCurrentStaffContext({ requireAdmin: true });
    if (context.error) {
        return { error: context.error };
    }

    const { error } = await setUserRole(userId, roleName);
    if (error) return { error };

    revalidatePath("/admin/roles");
    revalidatePath("/staff/roles");

    // Also revalidate user details pages just in case
    revalidatePath(`/staff/users/${userId}`);
    return { success: true };
}

export async function removeRole(userId: string, roleName: string) {
    const context = await requireCurrentStaffContext({ requireAdmin: true });
    if (context.error) {
        return { error: context.error };
    }

    const { error } = await removeRoleFromUser(userId, roleName);
    if (error) return { error };

    revalidatePath("/admin/roles");
    revalidatePath("/staff/roles");
    revalidatePath(`/staff/users/${userId}`);
    return { success: true };
}

export async function searchUsersForRole(term: string) {
    if (!term || term.length < 2) return [];

    try {
        const supabase = await supabaseServer();
        const sanitized = term.replace(/[,%]/g, " ").trim();

        const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name, email, avatar_url, city")
            .or(`full_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`)
            .limit(10);

        if (error) {
            console.error("roles:search_users", error);
            return [];
        }

        return (data ?? []).map((u: any) => ({
            id: u.id,
            full_name: u.full_name,
            email: u.email,
            city: u.city,
            avatar_url: u.avatar_url,
        }));
    } catch (error) {
        console.error("roles:search_users:fatal", error);
        return [];
    }
}
