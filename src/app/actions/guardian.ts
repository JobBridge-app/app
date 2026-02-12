"use server";

import { supabaseServer } from "@/lib/supabaseServer";
import { v4 as uuidv4 } from "uuid";

export async function createGuardianInvitation() {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Nicht authentifiziert" };
    }

    // Check current profile status
    const { data: profile } = await supabase
        .from("profiles")
        .select("guardian_status")
        .eq("id", user.id)
        .single();

    const isAlreadyLinked = profile?.guardian_status === "linked";

    // Check for existing active invitation
    const { data: existing } = await supabase
        .from("guardian_invitations")
        .select("token, expires_at")
        .eq("child_id", user.id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .single();

    if (existing) {
        // Return existing active token
        return { success: true, token: existing.token, expires_at: existing.expires_at };
    }

    const token = uuidv4();
    // Expires in 48 hours
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from("guardian_invitations").insert({
        child_id: user.id,
        token: token,
        status: "active",
        expires_at: expiresAt
    });

    if (error) {
        console.error("Guardian Invite Error:", error);
        return { error: "Einladungslink konnte nicht erstellt werden." };
    }

    // Update profile status ONLY if not already linked (to avoid downgrading status)
    if (!isAlreadyLinked) {
        await supabase.from("profiles").update({ guardian_status: "pending" }).eq("id", user.id);
    }

    return { success: true, token, expires_at: expiresAt };
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

export async function getActiveGuardianInvitation() {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Nicht authentifiziert" };

    const { data: existing } = await supabase
        .from("guardian_invitations")
        .select("token, expires_at")
        .eq("child_id", user.id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .single();

    if (existing) {
        return { success: true, token: existing.token, expires_at: existing.expires_at };
    }

    return { success: false };
}

export async function getWards() {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Nicht authentifiziert" };

    // Fetch invitations redeemed BY the current user (so they are the guardian)
    const { data: wards } = await supabase
        .from("guardian_invitations")
        .select(`
            child_id,
            updated_at,
            child_profile:child_id (
                full_name,
                email
            )
        `)
        .eq("redeemed_by", user.id)
        .eq("status", "redeemed");

    if (!wards) return { wards: [] };

    return {
        wards: wards.map((w: any) => ({
            id: w.child_id,
            full_name: w.child_profile?.full_name || "Unbekannt",
            email: w.child_profile?.email || "",
            linked_at: w.updated_at
        }))
    };
}
