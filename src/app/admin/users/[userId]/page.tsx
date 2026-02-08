import { requireCompleteProfile } from "@/lib/auth";
import { getAdminUser } from "@/lib/data/adminUsers";
import { RoleBadge } from "../../components/RoleBadge";
import { ArrowLeft, Mail, MapPin, Calendar, CheckCircle, Shield } from "lucide-react";
import Link from "next/link";
import { RemoveRoleButton } from "../../roles/RemoveRoleButton";

type UserRoleEntry = {
    role: {
        name: string;
    };
};

export default async function UserDetailPage({ params }: { params: { userId: string } }) {
    await requireCompleteProfile();
    const { userId } = await params;

    const { item: profile } = await getAdminUser(userId);
    if (!profile) return <div className="text-white">User not found</div>;

    const roleEntries = (profile.roles ?? []).map((name) => ({ role: { name } })) as UserRoleEntry[];
    const verifiedBadge =
        profile.account_type === "job_provider"
            ? profile.provider_verification_status === "verified"
            : profile.guardian_status === "linked";
    const typeLabel =
        profile.account_type === "job_provider"
            ? (profile.provider_kind === "company" ? "Unternehmen" : "Privat")
            : "Jobsuchend";

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <Link href="/staff/users" className="flex items-center text-slate-400 hover:text-white transition-colors">
                <ArrowLeft size={16} className="mr-2" />
                Back to Users
            </Link>

            {/* Header / Profile Card */}
            <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 flex flex-col md:flex-row gap-6 items-start">
                <div className="w-24 h-24 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-3xl font-bold uppercase border-2 border-indigo-500/30">
                    {profile.full_name?.substring(0, 2) || "??"}
                </div>

                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-white">{profile.full_name}</h1>
                        {verifiedBadge && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                                <CheckCircle size={12} /> Verified
                            </span>
                        )}
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-xs font-medium capitalize border border-white/10">
                            {typeLabel}
                        </span>
                    </div>

                    <div className="flex flex-col gap-1 text-slate-400 text-sm">
                        <div className="flex items-center gap-2">
                            <Mail size={14} /> {profile.email || "No email visible"}
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin size={14} /> {profile.city || "No location"}
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar size={14} /> Joined {new Date(profile.created_at).toLocaleDateString()}
                        </div>
                    </div>
                </div>

                {/* ID Card */}
                <div className="p-4 bg-black/20 rounded-xl border border-white/5 text-xs text-slate-500 font-mono">
                    ID: {profile.id}
                </div>
            </div>

            {/* Verification & System Roles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* System Roles */}
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                        <Shield className="text-indigo-400" size={20} />
                        System Roles
                    </h3>

                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {roleEntries.length > 0 ? roleEntries.map((r) => (
                                <div key={r.role.name} className="flex items-center gap-2 pr-2 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                                    <div className="pl-2">
                                        <RoleBadge role={r.role.name} />
                                    </div>
                                    <RemoveRoleButton userId={profile.id} role={r.role.name} />
                                </div>
                            )) : (
                                <p className="text-slate-500 text-sm italic">No system roles assigned.</p>
                            )}
                        </div>

                        {/* We reuse AddRoleForm but simpler? Or direct integration? 
                           AddRoleForm is email based currently. I should probably make one for ID based assignment or repurpose logic.
                           For now, the roles page handles general assignment nicely. 
                           I'll leave it as view-only management for now or rely on Roles page.
                           But I can add a link to Roles page.
                        */}
                        <div className="mt-4 pt-4 border-t border-white/5">
                            <Link href="/staff/roles" className="text-sm text-indigo-400 hover:text-indigo-300">
                                Manage Roles &rarr;
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Account Status / Actions */}
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Account Actions</h3>

                    <div className="space-y-3">
                        <button className="w-full py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-sm text-slate-300 transition-colors text-left flex justify-between">
                            Reset Password Email
                            <Mail size={16} />
                        </button>
                        {/* More potential actions */}
                    </div>
                </div>
            </div>
        </div>
    );
}
