import { requireCompleteProfile } from "@/lib/auth";
import { getAdminRoleAssignments } from "@/lib/data/adminRoles";
import { RolesDashboard } from "./RolesDashboard";
import { Shield } from "lucide-react";

export default async function RolesPage() {
    await requireCompleteProfile();
    const { items: assignments } = await getAdminRoleAssignments();

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400 border border-indigo-500/20">
                    <Shield size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white">System Roles</h1>
                    <p className="text-slate-400">Manage staff access and permissions.</p>
                </div>
            </div>

            <RolesDashboard initialAssignments={assignments} />
        </div>
    );
}
