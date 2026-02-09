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
        // Only set to pending if NOT already verifying/linked to someone else
        // Actually, if they are already linked, we don't want to revert to pending globally.
        // We just return the token.
        if (!isAlreadyLinked) {
            await supabase.from("profiles").update({ guardian_status: "pending" }).eq("id", user.id);
        }
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

    // Update profile status ONLY if not already linked
    if (!isAlreadyLinked) {
        await supabase.from("profiles").update({ guardian_status: "pending" }).eq("id", user.id);
    }

    return { success: true, token, expires_at: expiresAt };
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
