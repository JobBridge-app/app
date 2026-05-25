import { GuardianConsentModal } from "@/components/GuardianConsentModal";
import type { GuardianStatus } from "@/lib/types";

interface VerificationRequiredModalProps {
    isOpen: boolean;
    onClose: () => void;
    guardianStatus?: GuardianStatus | null;
}

export function VerificationRequiredModal({ isOpen, onClose, guardianStatus = null }: VerificationRequiredModalProps) {
    if (!isOpen) return null;

    return (
        <GuardianConsentModal
            isOpen={isOpen}
            onClose={onClose}
            variant="initial"
            guardianStatus={guardianStatus}
        />
    );
}

