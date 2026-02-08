"use client";

import { Profile } from "@/lib/types";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export function DebugRolePanel({ profile }: { profile: Profile | null }) {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    if (process.env.NEXT_PUBLIC_SHOW_DEBUG_ROLE_PANEL !== "true") return null;

    // Derive account_type locally to compare with server passed one (if any)
    // But we rely on what was passed from server
    const serverAccountType = profile?.account_type || "undefined";
    const providerKind = profile?.provider_kind || "null";
    const guardianStatus = profile?.guardian_status || "null";
    const providerVerification = profile?.provider_verification_status || "null";

    return (
        <div className="fixed bottom-4 left-4 z-[9999] bg-black/80 text-white p-4 rounded text-xs font-mono border border-red-500 shadow-xl max-w-sm pointer-events-none">
            <h3 className="font-bold text-red-500 mb-2">DEBUG ROLE PANEL</h3>
            <div className="grid grid-cols-[80px_1fr] gap-1">
                <span className="text-slate-400">Path:</span>
                <span className="break-all">{pathname}</span>

                <span className="text-slate-400">ProvKind:</span>
                <span className="text-yellow-400">{providerKind}</span>

                <span className="text-slate-400">AccType:</span>
                <span className="text-green-400">{serverAccountType}</span>

                <span className="text-slate-400">Guardian:</span>
                <span className="text-yellow-400">{guardianStatus}</span>

                <span className="text-slate-400">ProvVer:</span>
                <span className="text-yellow-400">{providerVerification}</span>

                <span className="text-slate-400">ID:</span>
                <span className="truncate">{profile?.id}</span>
            </div>
        </div>
    );
}
