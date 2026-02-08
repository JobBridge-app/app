"use client";

import { useState } from "react";
import { ButtonPrimary } from "@/components/ui/ButtonPrimary";
import { Lock } from "lucide-react";
import type { GuardianStatus } from "@/lib/types";
import { applyToJob } from "@/app/app-home/jobs/actions";
import { GuardianConsentModal } from "@/components/GuardianConsentModal";

export function ApplyButton({ canApply, guardianStatus: initialStatus, jobId }: { canApply: boolean; guardianStatus: GuardianStatus; jobId: string }) {
    const [showModal, setShowModal] = useState(false);
    const [applied, setApplied] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        if (!canApply) {
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
            <ButtonPrimary onClick={handleClick} className="w-full" disabled={loading}>
                {!canApply && <Lock size={16} className="mr-2 inline" />}
                {loading ? "Wird gesendet..." : "Jetzt bewerben"}
            </ButtonPrimary>

            <GuardianConsentModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
            />
        </>
    );
}

