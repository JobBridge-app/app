"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

export function PasswordResetButton({ email }: { email: string | null }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handlePasswordReset = async () => {
    if (!email) return;

    setLoading(true);
    await supabaseBrowser.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    setLoading(false);
    setSent(true);
  };

  return (
    <button
      onClick={handlePasswordReset}
      disabled={loading || sent || !email}
      className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
    >
      {sent ? "Email gesendet" : loading ? "Wird gesendet..." : "Passwort zurücksetzen (Email senden)"}
    </button>
  );
}
