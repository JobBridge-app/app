import { Gift } from "lucide-react";
import { requireStaffSectionAccess } from "@/lib/data/adminAccess";

export default async function DropsPage() {
    await requireStaffSectionAccess("system");

    return (
        <div className="max-w-4xl mx-auto text-center py-20">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <Gift size={32} className="text-slate-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Drops Management</h1>
            <p className="text-slate-400">Manage promotional drops and rewards.</p>
            <div className="mt-8 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl inline-block text-indigo-400 text-sm">
                Coming Soon
            </div>
        </div>
    );
}
