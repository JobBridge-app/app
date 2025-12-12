"use client";

import { useState } from "react";
import { LocationAutocomplete, type OpenPlzLocality } from "@/components/ui/LocationAutocomplete";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface LocationStepProps {
    onComplete: (regionData: any) => void;
}

export function LocationStep({ onComplete }: LocationStepProps) {
    const [selectedLocality, setSelectedLocality] = useState<OpenPlzLocality | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleContinue = async () => {
        if (!selectedLocality) return;

        setIsChecking(true);
        setError(null);

        try {
            const response = await fetch("/api/region/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    city: selectedLocality.name,
                    postal_code: selectedLocality.postalcode,
                    federal_state: selectedLocality.federalState.name,
                    country: "DE",
                }),
            });

            if (!response.ok) {
                throw new Error("Fehler bei der Überprüfung");
            }

            const data = await response.json();

            if (data.status === "live") {
                // Region is live
                onComplete({
                    city: selectedLocality.name,
                    postal_code: selectedLocality.postalcode,
                    federal_state: selectedLocality.federalState.name,
                    country: "DE",
                    region_live_id: data.region?.id
                });
            } else {
                // Not live or unknown -> Waitlist
                const params = new URLSearchParams({
                    city: selectedLocality.name,
                    state: selectedLocality.federalState.name,
                    country: "DE",
                });
                if (selectedLocality.postalcode) {
                    params.append("zip", selectedLocality.postalcode);
                }

                // Use window.location to ensure full redirect, or router.push
                router.push(`/onboarding/waitlist?${params.toString()}`);
            }
        } catch (err) {
            console.error(err);
            setError("Die Regionsprüfung ist fehlgeschlagen. Bitte versuche es erneut.");
            setIsChecking(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Wo möchtest du JobBridge nutzen?</h2>
                <p className="text-gray-400">
                    Wir starten Schritt für Schritt in ausgewählten Regionen. Wähle deine Stadt, damit wir dir das passende Onboarding anzeigen können.
                </p>
            </div>

            <LocationAutocomplete
                selectedLocality={selectedLocality}
                onSelect={(loc) => {
                    setSelectedLocality(loc);
                    setError(null);
                }}
            />

            {error && (
                <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                    {error}
                </div>
            )}

            <button
                onClick={handleContinue}
                disabled={!selectedLocality || isChecking}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-4 rounded-xl font-medium transition-all"
            >
                {isChecking ? (
                    <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Wir prüfen deine Region …</span>
                    </>
                ) : (
                    <>
                        <span>Weiter</span>
                        <ArrowRight className="h-5 w-5" />
                    </>
                )}
            </button>
        </div>
    );
}
