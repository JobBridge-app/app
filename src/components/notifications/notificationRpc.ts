"use client";

import { supabaseBrowser } from "@/lib/supabaseClient";

const FALLBACK_RPC_ERROR = "Die Änderung konnte nicht bestätigt werden.";

function getRpcError(result: unknown, transportError?: string) {
    if (transportError) return transportError;
    if (!result || typeof result !== "object" || Array.isArray(result)) {
        return FALLBACK_RPC_ERROR;
    }

    const response = result as { ok?: boolean; error?: string };
    return response.ok ? null : response.error ?? FALLBACK_RPC_ERROR;
}

export async function markNotificationRead(notificationId: string) {
    try {
        const { data, error } = await supabaseBrowser.rpc("mark_notification_read", {
            p_notification_id: notificationId,
        });
        return getRpcError(data, error?.message);
    } catch {
        return FALLBACK_RPC_ERROR;
    }
}

export async function markAllNotificationsRead() {
    try {
        const { data, error } = await supabaseBrowser.rpc("mark_all_notifications_read");
        return getRpcError(data, error?.message);
    } catch {
        return FALLBACK_RPC_ERROR;
    }
}
