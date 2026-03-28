"use client";

import { useState, useEffect, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { ensureConfirmationEmailTemplate } from "@/lib/authServerActions";

const COOLDOWN_SECONDS = 60;

interface UseEmailResendReturn {
    cooldown: number;
    message: string;
    error: string | null;
    loading: boolean;
    resend: () => Promise<void>;
}

/**
 * Hook für E-Mail-Resend mit Rate Limiting (60s Cooldown).
 */
export function useEmailResend(email: string): UseEmailResendReturn {
    const [cooldown, setCooldown] = useState(0);
    const [message, setMessage] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Countdown-Timer
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const resend = useCallback(async () => {
        if (cooldown > 0 || !email) return;

        setLoading(true);
        setMessage("");
        setError(null);

        try {
            let { error: err } = await supabaseBrowser.auth.resend({
                type: "signup",
                email,
                options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/verified` },
            });

            if (err?.message === "Error sending confirmation email") {
                const repaired = await ensureConfirmationEmailTemplate();
                if (repaired) {
                    const retry = await supabaseBrowser.auth.resend({
                        type: "signup",
                        email,
                        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/verified` },
                    });
                    err = retry.error;
                }
            }

            if (err) throw err;

            setMessage("E-Mail wurde erneut gesendet.");
            setCooldown(COOLDOWN_SECONDS);
        } catch (err) {
            const isRateLimit =
                (err as { status?: number })?.status === 429 ||
                (err as Error)?.message?.includes("security purposes");

            if (isRateLimit) {
                setError("E-Mail kann nur alle 60 Sekunden gesendet werden. Prüfe deinen Spam-Ordner.");
                setCooldown(COOLDOWN_SECONDS);
            } else {
                setError((err as Error)?.message || "Fehler beim Senden.");
            }
        } finally {
            setLoading(false);
        }
    }, [email, cooldown]);

    return { cooldown, message, error, loading, resend };
}
