"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { GuardianConsentModal } from "@/components/GuardianConsentModal";

export function AddGuardianButton() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1.5 text-[10px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/5 hover:bg-indigo-500/15 px-2.5 py-1 rounded text-center border border-indigo-500/10"
                title="Weiteren Erziehungsberechtigten hinzufügen"
            >
                <Plus size={12} />
                <span className="hidden sm:inline">Hinzufügen</span>
            </button>

            <GuardianConsentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                variant="add"
            />
        </>
    );
}
