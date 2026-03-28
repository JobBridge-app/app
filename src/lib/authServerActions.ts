"use server";

import { supabaseAdmin } from "./supabaseAdmin";

const FALLBACK_CONFIRMATION_TEMPLATE = `<h2>Bitte bestätige deine Registrierung</h2>
<p>Willkommen bei JobBridge. Bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren.</p>
<p><a href="{{ .ConfirmationURL }}">E-Mail bestätigen</a></p>
<p>Alternativ kannst du diesen Bestätigungscode in der App eingeben:</p>
<p><strong>{{ .Token }}</strong></p>
<p>Wenn du dich nicht registriert hast, kannst du diese E-Mail ignorieren.</p>`;

type SupabaseAuthConfig = {
    mailer_subjects_confirmation?: string | null;
};

function getSupabaseProjectRef(): string {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
    }

    const hostname = new URL(supabaseUrl).hostname;
    const projectRef = hostname.split(".")[0];

    if (!projectRef) {
        throw new Error("Unable to determine Supabase project ref.");
    }

    return projectRef;
}

function getManagementHeaders() {
    const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
    if (!accessToken) {
        return null;
    }

    return {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
    };
}

async function fetchAuthConfig(): Promise<SupabaseAuthConfig | null> {
    const headers = getManagementHeaders();
    if (!headers) return null;

    const projectRef = getSupabaseProjectRef();
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
        method: "GET",
        headers,
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Supabase auth config fetch failed (${response.status}).`);
    }

    return response.json();
}

export async function ensureConfirmationEmailTemplate(): Promise<boolean> {
    const headers = getManagementHeaders();
    if (!headers) return false;

    let config: SupabaseAuthConfig | null = null;
    try {
        config = await fetchAuthConfig();
    } catch {
        config = null;
    }

    const projectRef = getSupabaseProjectRef();
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
            mailer_subjects_confirmation: config?.mailer_subjects_confirmation || "Confirm Your Signup",
            mailer_templates_confirmation_content: FALLBACK_CONFIRMATION_TEMPLATE,
        }),
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Supabase confirmation template repair failed (${response.status}).`);
    }

    return true;
}

/**
 * Checks if a profile exists for a given email by querying the auth.users table
 * via the admin client, or by checking the profiles table.
 * We'll check the profiles table joined with email if we store it, 
 * or we can just try to find a user by calling admin.listUsers or similar.
 * A simpler way for JobBridge: The user table is not directly queriable by anon.
 * We will use supabaseAdmin logic to safely check if a given email is registered.
 */
export async function checkEmailExists(email: string): Promise<boolean> {
    if (!email) return false;

    // wir können entweder die auth.users durchsuchen, wenn wir admin rechte haben, 
    // oder wir schauen in der öffentlichen (oder durch service_role zugänglichen) profiles tabelle.
    // Da Email nicht in public.profiles liegt bei Supabase standardmäßig,
    // nutzen wir das admin Backend.

    const adminClient = supabaseAdmin();

    // List users matching the email. This requires service_role key.
    // Search only for exact match
    const { data, error } = await adminClient.auth.admin.listUsers();

    if (error || !data || !data.users) {
        // If admin check fails (e.g. no service key in this environment context),
        // fallback to returning true so it proceeds to normal login failure.
        console.error("Error checking email existence, falling back safely:", error);
        return true;
    }

    const userExists = data.users.some(u => u.email?.toLowerCase() === email.toLowerCase());
    return userExists;
}
