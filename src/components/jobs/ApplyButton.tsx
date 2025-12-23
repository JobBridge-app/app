"use client";

import { useState } from "react";
import { ButtonPrimary } from "@/components/ui/ButtonPrimary";
import { Lock } from "lucide-react";

// Simple Modal implementation if UI components are missing/different, 
// to avoid assuming shadcn setup structure without checking.
// Actually, I'll use a simple custom modal for now to be safe and dependency-free.

import { applyToJob } from "@/app/app-home/jobs/actions";

export function ApplyButton({ isVerified, jobId }: { isVerified: boolean; jobId: string }) {
    const [showModal, setShowModal] = useState(false);
    const [applied, setApplied] = useState(false);
    const [loading, setLoading] = useState(false);

    // In future: Check if already applied via props or client-fetch

    const handleClick = async () => {
        if (!isVerified) {
            setShowModal(true);
        } else {
            setLoading(true);
            const result = await applyToJob(jobId);
            setLoading(false);

            if (result.success) {
                setApplied(true);
            } else {
                alert(result.error);
            }
        }
    };

    if (applied) {
        return (
            <ButtonPrimary disabled className="w-full bg-emerald-500/20 text-emerald-400 border-none">
                Beworben
            </ButtonPrimary>
        );
    }

    return (
        <>
            <ButtonPrimary onClick={handleClick} className="w-full">
                {!isVerified && <Lock size={16} className="mr-2 inline" />}
                Jetzt bewerben
            </ButtonPrimary>

            {/* Verification Required Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#121217] border border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
                        <div className="mb-4">
                            <h2 className="text-xl font-bold text-white mb-2">Elternbestätigung erforderlich</h2>
                            <p className="text-slate-300">
                                Du kannst diesen Job ansehen, aber für eine Bewerbung müssen deine Eltern dein Konto bestätigen.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <ButtonPrimary onClick={() => alert("Link generation...")}>
                                Bestätigungslink erstellen
                            </ButtonPrimary>
                            <button
                                onClick={() => setShowModal(false)}
                                className="py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                            >
                                Später
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
