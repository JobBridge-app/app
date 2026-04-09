import { Shield, Eye, Gavel } from "lucide-react";
import { formatStaffRole } from "@/lib/adminNavigation";

export function RoleBadge({ role }: { role: string }) {
    const roleColors: Record<string, string> = {
        admin: "bg-red-500/10 text-red-400 border-red-500/20",
        moderator: "bg-orange-500/10 text-orange-400 border-orange-500/20",
        analyst: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    };

    const roleIcons: Record<string, React.ElementType> = {
        admin: Shield,
        moderator: Gavel,
        analyst: Eye,
    };

    const normalizeRole = role.toLowerCase();
    const style = roleColors[normalizeRole] || "bg-slate-500/10 text-slate-400 border-slate-500/20";
    const Icon = roleIcons[normalizeRole] || Shield;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
            <Icon size={12} />
            <span>{formatStaffRole(role)}</span>
        </span>
    );
}
