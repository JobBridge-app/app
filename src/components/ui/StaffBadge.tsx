import { ShieldCheck } from "lucide-react";

export function StaffBadge({ size = "sm" }: { size?: "sm" | "md" }) {
    return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-medium ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}`}>
            <ShieldCheck size={size === 'sm' ? 12 : 14} />
            DropRidge Staff
        </span>
    );
}
