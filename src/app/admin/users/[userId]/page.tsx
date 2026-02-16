import { requireCompleteProfile } from "@/lib/auth";
import { getAdminUser } from "@/lib/data/adminUsers";
import { ArrowLeft, Mail, MapPin, Calendar, CheckCircle, Shield, Briefcase, FileText, MessageCircle } from "lucide-react";
import Link from "next/link";
import { UserQuickActions } from "./UserQuickActions";

type UserRoleEntry = {
    role: {
        name: string;
    };
};

export default async function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
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
        <div className="max-w-[1600px] mx-auto space-y-8">
            <Link href="/staff/users" className="flex items-center text-slate-400 hover:text-white transition-colors">
                <ArrowLeft size={16} className="mr-2" />
                Back to Users
            </Link>

            {/* Header / Profile Card */}
            <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 flex flex-col md:flex-row gap-6 items-start">
                <div className="w-24 h-24 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-3xl font-bold uppercase border-2 border-indigo-500/30 shrink-0">
                    {profile.full_name?.substring(0, 2) || "??"}
                </div>

                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-3xl font-bold text-white">{profile.full_name}</h1>
                        {verifiedBadge && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                                <CheckCircle size={12} /> Verified
                            </span>
                        )}
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-xs font-medium capitalize border border-white/10">
                            {typeLabel}
                        </span>
                        <div className="text-xs text-slate-500 font-mono bg-black/20 px-2 py-0.5 rounded border border-white/5">
                            ID: {profile.id}
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center gap-4 text-slate-400 text-sm mt-2">
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

                {/* Minimized System Roles - READ ONLY */}
                <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-xl p-4 min-w-[200px]">
                    <h3 className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Shield size={12} /> System Role
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {roleEntries.length > 0 ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30 text-xs text-indigo-300 font-bold shadow-lg shadow-indigo-500/10">
                                <span>{roleEntries[0].role.name}</span>
                            </div>
                        ) : (
                            <p className="text-slate-500 text-xs italic">No role assigned.</p>
                        )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-indigo-500/10">
                        <Link href="/staff/roles" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                            Manage Access <Briefcase size={10} />
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column: God Mode Data Dashboard */}
                <div className="xl:col-span-2 space-y-8">

                    {/* Applications (Only for Job Seekers mainly, but shown for all if data exists) */}
                    {(profile.applications?.length ?? 0) > 0 && (
                        <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-white/5 bg-slate-900/80 flex items-center justify-between">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <FileText className="text-blue-400" size={18} />
                                    Applications History ({profile.applications!.length})
                                </h3>
                            </div>
                            <div className="divide-y divide-white/5 text-sm">
                                {profile.applications!.map((app) => (
                                    <div key={app.id} className="px-6 py-3 flex items-center justify-between hover:bg-white/5 transition-colors">
                                        <div>
                                            <div className="font-medium text-slate-200">{app.job?.title || "Unknown Job"}</div>
                                            <div className="text-xs text-slate-500">{new Date(app.created_at).toLocaleString()}</div>
                                        </div>
                                        <div>
                                            <span className={`px-2 py-1 rounded text-xs border ${app.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                app.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                    'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                                }`}>
                                                {app.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Jobs (For Providers) */}
                    {(profile.jobs?.length ?? 0) > 0 && (
                        <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-white/5 bg-slate-900/80 flex items-center justify-between">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Briefcase className="text-purple-400" size={18} />
                                    Posted Jobs ({profile.jobs!.length})
                                </h3>
                            </div>
                            <div className="divide-y divide-white/5 text-sm">
                                {profile.jobs!.map((job) => (
                                    <div key={job.id} className="px-6 py-3 flex items-center justify-between hover:bg-white/5 transition-colors">
                                        <div>
                                            <div className="font-medium text-slate-200">{job.title}</div>
                                            <div className="text-xs text-slate-500">
                                                Posted {new Date(job.created_at).toLocaleDateString()} • {job.applications_count} Applicants
                                            </div>
                                        </div>
                                        <div>
                                            <span className="px-2 py-1 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700">
                                                {job.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Messages (All Users) */}
                    <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/5 bg-slate-900/80 flex items-center justify-between">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <MessageCircle className="text-pink-400" size={18} />
                                Recent Messages ({(profile.messages?.length ?? 0)})
                            </h3>
                        </div>
                        <div className="divide-y divide-white/5 text-sm max-h-[400px] overflow-y-auto">
                            {(profile.messages?.length ?? 0) === 0 ? (
                                <div className="px-6 py-8 text-center text-slate-500 italic">No messages sent.</div>
                            ) : (
                                profile.messages!.map((msg) => (
                                    <div key={msg.id} className="px-6 py-3 hover:bg-white/5 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-semibold text-slate-400">
                                                To job: {msg.application?.job?.title || "Unknown"}
                                            </span>
                                            <span className="text-xs text-slate-600">
                                                {new Date(msg.created_at || '').toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="text-slate-300 bg-black/20 p-2 rounded border border-white/5">
                                            {msg.content}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Empty State if no lists */}
                    {(profile.applications?.length === 0 && profile.jobs?.length === 0 && profile.messages?.length === 0) && (
                        <div className="p-12 text-center border border-dashed border-white/10 rounded-3xl">
                            <p className="text-slate-500">No activity data found for this user.</p>
                        </div>
                    )}

                </div>

                {/* Right Column: Actions */}
                <div className="space-y-6">
                    <UserQuickActions
                        userId={profile.id}
                        isBanned={false}
                        isVerified={verifiedBadge || false}
                    />
                </div>
            </div>
        </div>
    );
}
