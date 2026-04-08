"use server";

import { supabaseAdmin } from "./supabaseAdmin";

const DEFAULT_BRANDED_CONFIRMATION_TEMPLATE = `<!DOCTYPE html>
<html lang="de">
  <body style="margin:0;padding:24px;background:#f1f3f7;font-family:Arial,Helvetica,sans-serif;color:#0f1720;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;">
      <tr>
        <td style="padding:28px 28px 12px;text-align:center;background:linear-gradient(135deg,#0b1117,#16202d);color:#ffffff;">
          <div style="font-size:30px;font-weight:700;letter-spacing:-0.03em;">JobBridge</div>
          <div style="margin-top:10px;font-size:15px;line-height:1.5;color:#d6dde8;">Bitte bestätige deine Registrierung</div>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;">
          <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Willkommen bei JobBridge. Bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren.</p>
          <p style="margin:0 0 24px;text-align:center;">
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 24px;border-radius:999px;background:#00c4cc;color:#ffffff;font-size:17px;font-weight:700;text-decoration:none;">E-Mail bestätigen</a>
          </p>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Alternativ kannst du diesen Bestätigungscode in der App eingeben:</p>
          <div style="margin:0 0 24px;text-align:center;">
            <span style="display:inline-block;padding:12px 18px;border-radius:999px;background:#eef2f7;font-size:22px;font-weight:700;letter-spacing:0.16em;">{{ .Token }}</span>
          </div>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#5c6673;">Wenn du dich nicht registriert hast, kannst du diese E-Mail ignorieren.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:22px 28px;background:#070300;color:#f4f2ed;">
          <div style="font-size:20px;font-weight:700;">Brauchst du Hilfe?</div>
          <div style="margin-top:10px;font-size:14px;line-height:1.6;">Schreib uns unter <a href="mailto:support@jobbridge.app" style="color:#f4f2ed;font-weight:700;text-decoration:none;">support@jobbridge.app</a></div>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const CONFIRMATION_LINK_BLOCK = `<p style="margin:24px 0 0;text-align:center;"><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 24px;border-radius:999px;background:#00c4cc;color:#ffffff;font-size:17px;font-weight:700;text-decoration:none;">E-Mail bestätigen</a></p>`;
const CONFIRMATION_TOKEN_BLOCK = `<p style="margin:18px 0 0;text-align:center;font-size:15px;line-height:1.6;">Bestätigungscode:</p><div style="margin:12px 0 0;text-align:center;"><span style="display:inline-block;padding:12px 18px;border-radius:999px;background:#eef2f7;font-size:22px;font-weight:700;letter-spacing:0.16em;">{{ .Token }}</span></div>`;

type SupabaseAuthConfig = {
    mailer_subjects_confirmation?: string | null;
    mailer_templates_confirmation_content?: string | null;
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

function insertBeforeClosingTag(template: string, block: string): string {
    if (template.includes("</body>")) {
        return template.replace("</body>", `${block}</body>`);
    }

    if (template.includes("</html>")) {
        return template.replace("</html>", `${block}</html>`);
    }

    return `${template}${block}`;
}

function repairConfirmationTemplate(template: string | null | undefined): string {
    let repaired = template?.trim() || DEFAULT_BRANDED_CONFIRMATION_TEMPLATE;

    repaired = repaired.replace(
        /href\s*=\s*(?=(?:\s*(?:target=|rel=|style=|class=|id=|aria-|data-|>)))/i,
        'href="{{ .ConfirmationURL }}" '
    );

    if (!repaired.includes("{{ .ConfirmationURL }}")) {
        repaired = insertBeforeClosingTag(repaired, CONFIRMATION_LINK_BLOCK);
    }

    if (!repaired.includes("{{ .Token }}")) {
        repaired = insertBeforeClosingTag(repaired, CONFIRMATION_TOKEN_BLOCK);
    }

    return repaired;
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

    const repairedTemplate = repairConfirmationTemplate(config?.mailer_templates_confirmation_content);
    if (config?.mailer_templates_confirmation_content === repairedTemplate) {
        return true;
    }

    const projectRef = getSupabaseProjectRef();
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
            mailer_subjects_confirmation: config?.mailer_subjects_confirmation || "Confirm Your Signup",
            mailer_templates_confirmation_content: repairedTemplate,
        }),
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Supabase confirmation template repair failed (${response.status}).`);
    }

    return true;
}

export async function checkEmailExists(email: string): Promise<boolean> {
    if (!email) return false;

    // wir können entweder die auth.users durchsuchen, wenn wir admin rechte haben, 
    // oder wir schauen in der öffentlichen (oder durch service_role zugänglichen) profiles tabelle.
    // admin.listUsers() liefert standardmäßig nur 50 User, was bei mehr als 50 Usern zu "Account nicht gefunden" führt.

    const adminClient = supabaseAdmin();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Zuerst effizient in der profiles-Tabelle nachschauen (mit ilike werden auch Leerzeichen-Probleme teils entschärft)
    const { data: profile } = await adminClient
        .from('profiles')
        .select('id')
        .ilike('email', cleanEmail)
        .limit(1)
        .maybeSingle();

    if (profile) {
        return true;
    }

    // 2. Fallback: Falls die email nicht in profiles steht, prüfen wir auth.users, 
    // aber mit perPage: 1000, damit wir nicht auf 50 Nutzer limitiert sind.
    const { data, error } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000
    });

    if (error || !data || !data.users) {
        // If admin check fails (e.g. no service key in this environment context),
        // fallback to returning true so it proceeds to normal login failure.
        console.error("Error checking email existence, falling back safely:", error);
        return true;
    }

    // Trim check to handle manual database entries that might have trailing spaces
    const userExists = data.users.some(u => u.email?.toLowerCase().trim() === cleanEmail);
    return userExists;
}
