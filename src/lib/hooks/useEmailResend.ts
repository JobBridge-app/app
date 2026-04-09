"use client";

import { useState, useEffect, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { ensureConfirmationEmailTemplate } from "@/lib/authServerActions";

const COOLDOWN_SECONDS = 60;
const STORAGE_PREFIX = "jobbridge-confirmation-email-last-sent:";

const normalizeEmail = (value: string) => value.trim().toLowerCase();

function getStorageKey(email: string) {
    return `${STORAGE_PREFIX}${normalizeEmail(email)}`;
}

function getRemainingCooldown(email: string): number {
    if (typeof window === "undefined" || !email) return 0;

    const raw = window.localStorage.getItem(getStorageKey(email));
    const lastSentAt = raw ? Number.parseInt(raw, 10) : 0;
    if (!lastSentAt) return 0;

    const elapsedSeconds = Math.floor((Date.now() - lastSentAt) / 1000);
    return Math.max(0, COOLDOWN_SECONDS - elapsedSeconds);
}

function persistLastSent(email: string) {
    if (typeof window === "undefined" || !email) return;
    window.localStorage.setItem(getStorageKey(email), String(Date.now()));
}

interface UseEmailResendReturn {
    cooldown: number;
    message: string;
    error: string | null;
    loading: boolean;
    resend: () => Promise<void>;
    markSent: (message?: string) => void;
}

/**
 * Hook für E-Mail-Resend mit Rate Limiting (60s Cooldown).
 */
export function useEmailResend(email: string): UseEmailResendReturn {
    const [cooldown, setCooldown] = useState(0);
    const [message, setMessage] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!email) {
            setCooldown(0);
            return;
        }

        const syncCooldown = () => {
            setCooldown(getRemainingCooldown(email));
        };

        syncCooldown();
        const interval = window.setInterval(syncCooldown, 1000);
        return () => window.clearInterval(interval);
    }, [email]);

    const markSent = useCallback((nextMessage = "Bestätigungs-E-Mail mit Code wurde gesendet.") => {
        if (!email) return;

        persistLastSent(email);
        setCooldown(getRemainingCooldown(email));
        setError(null);
        setMessage(nextMessage);
    }, [email]);

    const resend = useCallback(async () => {
        if (cooldown > 0 || !email) return;

        setLoading(true);
        setMessage("");
        setError(null);

        try {
            try {
                await ensureConfirmationEmailTemplate();
            } catch {
                // Emergency fallback: continue with resend even if template sync is temporarily unavailable.
            }

            let { error: err } = await supabaseBrowser.auth.resend({
                type: "signup",
                email,
            });

            if (err?.message === "Error sending confirmation email") {
                try {
                    const repaired = await ensureConfirmationEmailTemplate();
                    if (repaired) {
                        const retry = await supabaseBrowser.auth.resend({
                            type: "signup",
                            email,
                        });
                        err = retry.error;
                    }
                } catch {
                    // Keep the original resend error if template sync also fails.
                }
            }

            if (err) throw err;

            markSent("Bestätigungs-E-Mail mit Code wurde erneut gesendet.");
        } catch (err) {
            const isRateLimit =
                (err as { status?: number })?.status === 429 ||
                (err as Error)?.message?.includes("security purposes");

            if (isRateLimit) {
                persistLastSent(email);
                setError("E-Mail kann nur alle 60 Sekunden gesendet werden. Prüfe deinen Spam-Ordner.");
                setCooldown(getRemainingCooldown(email));
            } else {
                setError((err as Error)?.message || "Fehler beim Senden.");
            }
        } finally {
            setLoading(false);
        }
    }, [email, cooldown, markSent]);

    return { cooldown, message, error, loading, resend, markSent };
}
