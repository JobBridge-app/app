"use server";

import { supabaseServer } from "@/lib/supabaseServer";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type GuardianInvitationResult = {
    token?: string;
    expires_at?: string;
    error?: string;
};

export async function createGuardianInvitation() {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Nicht authentifiziert" };
    }

    const { data, error } = await (supabase as any).rpc("create_guardian_invitation", {});

    if (error) {
        console.error("Guardian Invite Error:", error);
        return { error: "Einladungslink konnte nicht erstellt werden." };
    }

    const result = data as GuardianInvitationResult | null;
    if (result?.error || !result?.token || !result?.expires_at) {
        return { error: result?.error || "Einladungslink konnte nicht erstellt werden." };
    }

    return { success: true, token: result.token, expires_at: result.expires_at };
}

export async function getGuardians() {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Nicht authentifiziert" };

    // Fetch redeemed invitations to find guardians
    const { data: guardians } = await supabase
        .from("guardian_invitations")
        .select(`
            redeemed_by,
            updated_at,
            guardian_profile:redeemed_by (
                full_name,
                email
            )
        `)
        .eq("child_id", user.id)
        .eq("status", "redeemed");

    if (!guardians) return { guardians: [] };

    return {
        guardians: guardians.map((g: any) => ({
            id: g.redeemed_by,
            full_name: g.guardian_profile?.full_name || "Unbekannt",
            email: g.guardian_profile?.email || "",
            linked_at: g.updated_at
        }))
    };
}

export async function getWards() {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Nicht authentifiziert" };

    try {
        const adminClient = getSupabaseAdminClient();

        // Fetch active relationships from the correct table
        // We assume 'guardian_id' refers to the parent/provider and 'child_id' to the student
        const { data: wards, error } = await adminClient
            .from("guardian_relationships")
            .select(`
                child_id,
                created_at,
                child_profile:child_id (
                    full_name,
                    email
                )
            `)
            .eq("guardian_id", user.id)
            .eq("status", "active");

        if (error) {
            console.error("Error fetching wards:", error);
            return { wards: [] };
        }

        if (!wards) return { wards: [] };

        return {
            wards: wards.map((w: any) => ({
                id: w.child_id,
                full_name: w.child_profile?.full_name || "Unbekannt",
                email: w.child_profile?.email || "",
                linked_at: w.created_at
            }))
        };
    } catch (err) {
        console.error("Admin client error:", err);
        return { wards: [] };
    }
}
