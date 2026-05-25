import { getCurrentSessionAndProfile } from "@/lib/auth";
import { AlertTriangle } from "lucide-react";

export async function TestModeBanner() {
    const { session, effectiveView } = await getCurrentSessionAndProfile();
    if (!session) return null;

    const overrideExpiresAt = effectiveView?.source === "live" ? effectiveView.overrideExpiresAt : null;
    if (!overrideExpiresAt) return null;

    const viewRole = effectiveView?.viewRole ?? "job_seeker";
    const minutesLeft = Math.ceil((new Date(overrideExpiresAt).getTime() - new Date().getTime()) / 60000);

    return (
        <div className="bg-indigo-600 text-white px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 relative z-50">
            <AlertTriangle size={16} className="text-yellow-300" />
            <span>
                Test Mode Active: Viewing as <span className="underline capitalize">{viewRole.replace('_', ' ')}</span>.
                Ends in {minutesLeft}m.
            </span>
        </div>
    );
}
