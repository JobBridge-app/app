"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

function WaitlistContent() {
    const searchParams = useSearchParams();
    const city = searchParams.get("city") || "";
    const state = searchParams.get("state") || "";
    const country = searchParams.get("country") || "DE";
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !city || !role) {
            setError("Bitte fülle alle Pflichtfelder aus.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        try {
            const { error: insertError } = await supabase.from("waitlist").insert({
                email,
                city,
                federal_state: state,
                country,
                role,
            });

            if (insertError) {
                // Ignore duplicate key error for email+city if logic was unique, but we used ID PK.
                // If we want to prevent duplicates, we might get an error if we added unique constraint.
                // Here we assume it succeeds.
                throw insertError;
            }

            setSuccess(true);
        } catch (err) {
            console.error(err);
            setError("Ein Fehler ist aufgetreten. Bitte versuche es später erneut.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#07090f]">
                <div className="max-w-md w-full relative bg-white/10 backdrop-blur-[28px] border border-white/10 rounded-3xl p-8 md:p-12 text-center">
                    <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-8 h-8 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4">Vielen Dank!</h2>
                    <p className="text-slate-300 mb-8">
                        Wir melden uns per E-Mail bei dir, sobald JobBridge in <strong>{city}</strong> startet.
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        Zurück zur Startseite
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#07090f]">
            <div className="max-w-xl w-full relative bg-white/10 backdrop-blur-[28px] border border-white/10 rounded-3xl shadow-2xl p-8 md:p-12">
                <div className="pointer-events-none absolute -top-16 -left-16 w-56 h-56 bg-blue-500/20 blur-[100px] opacity-50" />

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-3">JobBridge ist in deiner Region noch nicht gestartet.</h1>
                    <p className="text-slate-300 leading-relaxed">
                        Wir expandieren Schritt für Schritt. Trage dich unverbindlich ein, und wir informieren dich, sobald es in <strong>{city}</strong> losgeht.
                    </p>
                    <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-200">
                        Kein Spam, kein Newsletter. Nur eine Benachrichtigung zum Start.
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Stadt</label>
                            <input
                                type="text"
                                value={city}
                                readOnly
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white opacity-60 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Bundesland</label>
                            <input
                                type="text"
                                value={state}
                                readOnly
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white opacity-60 cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-lg font-medium text-white mb-2">Deine E-Mail-Adresse</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="name@beispiel.de"
                            className="w-full bg-white/5 border border-white/20 rounded-xl px-5 py-4 text-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </div>

                    <div>
                        <label className="block text-lg font-medium text-white mb-2">Ich bin...</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            required
                            className="w-full bg-white/5 border border-white/20 rounded-xl px-5 py-4 text-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none bg-no-repeat bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZT0id2hpdGUiIGNsYXNzPSJ3LTYgaC02Ij48cGF0aCBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0xOS41IDguMjVsLTcuNSA3LjUtNy41LTcuNSIgLz48L3N2Zz4=')] bg-[right_1.25rem_center] bg-[length:1.25rem_1.25rem]"
                        >
                            <option value="" className="bg-slate-900">Bitte wählen</option>
                            <option value="youth" className="bg-slate-900">Jugendliche/r</option>
                            <option value="parent" className="bg-slate-900">Elternteil</option>
                            <option value="client" className="bg-slate-900">Auftraggeber/in</option>
                            <option value="company" className="bg-slate-900">Organisation</option>
                        </select>
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 mt-4"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Wird gespeichert...</span>
                            </>
                        ) : (
                            <>
                                <span>Informiert mich</span>
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function WaitlistPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#07090f] text-white">Laden...</div>}>
            <WaitlistContent />
        </Suspense>
    );
}
