"use server";

import { supabaseServer } from "@/lib/supabaseServer";
import { v4 as uuidv4 } from "uuid";

export async function createGuardianInvitation() {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Nicht authentifiziert" };
    }

    // Check if minor
    // We trust usage of this action is gated by UI, but good to check DB too if we had birthdate handy.
    // For now, just create the invitation.

    // Check for existing active invitation
    const { data: existing } = await supabase
        .from("guardian_invitations")
        .select("token")
        .eq("child_id", user.id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .single();

    if (existing) {
        // Return existing valid token if one exists, to avoid spamming DB
        // In a real app we might want to regenerate or have a "resend" logic, 
        // but for this MVP, reusing valid token is fine.
        return { success: true, token: existing.token };
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

    return { success: true, token };
}
