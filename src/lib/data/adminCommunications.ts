"use server";

import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { CommunicationLogItem, AdminUserListItem } from "@/lib/data/adminTypes";

function normalizeError(error: unknown, fallback: string): string {
    if (!error) return fallback;
    if (typeof error === "string") return error;
    if (typeof error === "object" && error !== null && "message" in error) {
        const message = (error as { message?: string }).message;
        if (message) return message;
    }
    return fallback;
}

export async function getCommunicationLogs({
    page = 1,
    limit = 20,
    search = "",
    type = "all",
}: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
} = {}): Promise<{ items: CommunicationLogItem[]; total: number; error: string | null }> {
    try {
        const supabase = await supabaseServer();
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
            .from("notifications")
            .select("id, type, title, body, created_at, read_at, user:profiles(id, full_name, email, avatar_url)", { count: "exact" })
            .order("created_at", { ascending: false })
            .range(from, to);

        if (type !== "all") {
            query = query.eq("type", type);
        }

        if (search) {
            // We can't easily search joined tables with a simple OR in Supabase JS client without a stored procedure or intricate syntax,
            // so for now we'll search title/body. 
            // Ideally this would filter by user email too, but that requires !inner join which filters the TOP level rows.
            // For a better UX, we'd search users FIRST, get their IDs, then filter notifications by those IDs.
            const term = search.trim();
            query = query.or(`title.ilike.%${term}%,body.ilike.%${term}%`);
        }

        const { data, count, error } = await query;

        if (error) {
            console.error("communications:logs", error);
            return { items: [], total: 0, error: normalizeError(error, "Failed to fetch logs.") };
        }

        const items: CommunicationLogItem[] = (data ?? []).map((row: any) => ({
            id: row.id,
            type: row.type,
            title: row.title,
            body: row.body,
            created_at: row.created_at,
            read_at: row.read_at,
            user: row.user ? {
                id: row.user.id,
                full_name: row.user.full_name,
                email: row.user.email,
                avatar_url: row.user.avatar_url,
            } : null,
        }));

        return { items, total: count ?? 0, error: null };
    } catch (error) {
        console.error("communications:logs:fatal", error);
        return { items: [], total: 0, error: "Failed to load communication logs." };
    }
}

export async function searchUsersForMessage(term: string): Promise<AdminUserListItem[]> {
    if (!term || term.length < 2) return [];

    try {
        const supabase = await supabaseServer();
        const sanitized = term.replace(/[,%]/g, " ").trim();

        const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name, email, avatar_url, account_type")
            .or(`full_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`)
            .limit(10);

        if (error) {
            console.error("communications:search_users", error);
            return [];
        }

        return (data ?? []).map((u: any) => ({
            id: u.id,
            full_name: u.full_name,
            email: u.email,
            city: null, // Not needed for autocomplete
            account_type: u.account_type,
            provider_kind: null,
            guardian_status: null,
            provider_verification_status: null,
            email_verified_at: null,
            created_at: "",
            roles: [],
        }));
    } catch (error) {
        console.error("communications:search_users:fatal", error);
        return [];
    }
}

export async function deleteNotificationAction(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const supabase = await supabaseAdmin();
        const { error } = await supabase
            .from("notifications")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("communications:delete", error);
            return { success: false, error: normalizeError(error, "Failed to delete notification.") };
        }

        return { success: true, error: null };
    } catch (error) {
        console.error("communications:delete:fatal", error);
        return { success: false, error: "Failed to perform deletion." };
    }
}
