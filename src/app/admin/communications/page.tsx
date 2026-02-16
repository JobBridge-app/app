
import { requireCompleteProfile } from "@/lib/auth";
import { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { CommunicationsDashboard } from "./CommunicationsDashboard";
import { getCommunicationLogs } from "@/lib/data/adminCommunications";

export const metadata: Metadata = {
    title: "Communication Center | JobBridge Admin",
};

export default async function CommunicationsPage() {
    await requireCompleteProfile();

    // Fetch initial logs
    const { items: initialLogs } = await getCommunicationLogs({ limit: 50 });

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400 shadow-lg shadow-indigo-500/10">
                    <MessageSquare size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Communication Center</h1>
                    <p className="text-slate-400">Manage system broadcasts and direct user messages.</p>
                </div>
            </div>

            <CommunicationsDashboard initialLogs={initialLogs} />
        </div>
    );
}
