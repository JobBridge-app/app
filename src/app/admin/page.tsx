import { requireCompleteProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import { Users, Briefcase, FileText, Shield } from "lucide-react";
import { StatsBento } from "./dashboard/StatsBento";

export default async function AdminDashboard() {
    const { profile } = await requireCompleteProfile(); // Layout already checks permissions
    const supabase = await supabaseServer();

    // Fetch real stats
    const { count: usersCount } = await supabase.from("profiles").select("*", { count: 'exact', head: true });
    const { count: jobsCount } = await supabase.from("jobs").select("*", { count: 'exact', head: true });
    const { count: applicationsCount } = await supabase.from("applications").select("*", { count: 'exact', head: true });

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header with Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Staff Console</h1>
                    <p className="text-slate-400">Welcome back, {profile?.full_name?.split(" ")[0] || "Admin"}.</p>
                </div>

                {/* Search Bar - Visual only for now */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Users className="h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search users, jobs..."
                        className="bg-slate-900 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-full md:w-64 transition-all"
                    />
                </div>
            </div>

            {/* Stats Grid */}
            <StatsBento stats={{ users: usersCount || 0, jobs: jobsCount || 0, applications: applicationsCount || 0 }} />

            {/* Quick Actions (Still useful) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <a href="/admin/demo" className="p-4 bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600/20 rounded-2xl flex items-center justify-between group transition-all">
                    <span className="font-semibold text-indigo-300">Demo Setup</span>
                    <Briefcase size={18} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                </a>
                <a href="/admin/roles" className="p-4 bg-slate-800/50 border border-white/5 hover:bg-slate-800/80 rounded-2xl flex items-center justify-between group transition-all">
                    <span className="font-semibold text-slate-300">Roles & perms</span>
                    <Shield size={18} className="text-slate-400 group-hover:scale-110 transition-transform" />
                </a>
            </div>
        </div>
    );
}
