"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { ButtonPrimary } from "@/components/ui/ButtonPrimary";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { LogoBadge } from "@/components/ui/LogoBadge";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/update-password`,
            });

            if (error) throw error;
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || "Ein Fehler ist aufgetreten.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4">
            <div className="absolute top-8 left-8">
                <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft size={16} />
                    Zurück
                </Link>
            </div>

            <div className="w-full max-w-md space-y-8">
                <div className="flex justify-center">
                    <LogoBadge size="lg" />
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
                    {success ? (
                        <div className="text-center space-y-4">
                            <div className="mx-auto w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
                                <CheckCircle2 size={24} />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Email gesendet</h2>
                            <p className="text-slate-300">
                                Wir haben dir einen Link zum Zurücksetzen deines Passworts an <strong>{email}</strong> gesendet.
                            </p>
                            <div className="pt-4">
                                <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm font-medium">Zurück zum Login</Link>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-8">
                                <h1 className="text-2xl font-bold text-white">Passwort vergessen?</h1>
                                <p className="text-slate-400 mt-2">
                                    Gib deine Email-Adresse ein, um dein Passwort zurückzusetzen.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                                        Email-Adresse
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                        placeholder="name@beispiel.de"
                                    />
                                </div>

                                {error && (
                                    <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                                        {error}
                                    </div>
                                )}

                                <ButtonPrimary type="submit" disabled={loading} className="w-full py-3">
                                    {loading ? "Sende..." : "Link senden"}
                                </ButtonPrimary>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
