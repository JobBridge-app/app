"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseServer } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

type ActionState = {
    success: boolean;
    message: string;
    details?: string;
};

export async function sendGlobalBroadcast(title: string, body: string, targetRoute?: string): Promise<ActionState> {
    const admin = supabaseAdmin();

    // 1. Get ALL users. This is heavy for a real app, but for "God Mode" in early stage it's fine.
    // Better: Helper function to batch insert.

    // Fetch all profile IDs
    const { data: profiles, error: fetchError } = await admin.from("profiles").select("id");

    if (fetchError || !profiles) {
        return { success: false, message: "Failed to fetch users", details: fetchError?.message };
    }

    const notifications = profiles.map(p => ({
        user_id: p.id,
        title,
        body,
        type: "system_broadcast",
        data: targetRoute ? { route: targetRoute } : undefined
    }));

    // Batch insert
    const { error: insertError } = await admin.from("notifications").insert(notifications);

    if (insertError) {
        return { success: false, message: "Failed to send notifications", details: insertError.message };
    }

    return { success: true, message: `Broadcast sent to ${profiles.length} users.` };
}

export async function sendDirectMessage(emailOrId: string, title: string, body: string): Promise<ActionState> {
    const admin = supabaseAdmin();

    let targetUserId = emailOrId;

    // Check if input is email
    if (emailOrId.includes("@")) {
        const { data: user, error } = await admin.from("profiles").select("id").eq("email", emailOrId).single();
        if (error || !user) {
            return { success: false, message: "User with that email not found." };
        }
        targetUserId = user.id;
    }

    const { error } = await admin.from("notifications").insert({
        user_id: targetUserId,
        title,
        body,
        type: "admin_message",
        data: { route: "/app-home/notifications" }
    });

    if (error) {
        return { success: false, message: "Failed to send message", details: error.message };
    }

    return { success: true, message: "Message sent successfully." };
}
