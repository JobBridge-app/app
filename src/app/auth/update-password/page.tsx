"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { ButtonPrimary } from "@/components/ui/ButtonPrimary";
import { useRouter } from "next/navigation";
import { LogoBadge } from "@/components/ui/LogoBadge";

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabaseBrowser.auth.updateUser({ password });
            if (error) throw error;

            // Redirect to home/dashboard after success
            router.push("/app-home");
            router.refresh();
        } catch (err: any) {
            setError(err.message || "Fehler beim Aktualisieren des Passworts.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="flex justify-center">
                    <LogoBadge size="lg" />
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white">Neues Passwort</h1>
                        <p className="text-slate-400 mt-2">
                            Bitte lege ein neues Passwort für deinen Account fest.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                                Neues Passwort
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                placeholder="Mindestens 6 Zeichen"
                            />
                        </div>

                        {error && (
                            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        <ButtonPrimary type="submit" disabled={loading} className="w-full py-3">
                            {loading ? "Speichern..." : "Passwort speichern"}
                        </ButtonPrimary>
                    </form>
                </div>
            </div>
        </div>
    );
}
