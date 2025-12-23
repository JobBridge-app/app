"use client";

import {
    Users,
    Briefcase,
    FileText,
    TrendingUp,
    Clock,
    AlertCircle,
    CheckCircle,
    Flag
} from "lucide-react";
import { cn } from "@/lib/utils";

type Stat = {
    label: string;
    value: string | number;
    trend?: string;
    icon: React.ElementType;
    color: "blue" | "purple" | "emerald" | "orange";
};

export function StatsBento({
    stats
}: {
    stats: { users: number; jobs: number; applications: number }
}) {
    // Mock trends for now
    const cards: Stat[] = [
        { label: "Total Users", value: stats.users, trend: "+12% this week", icon: Users, color: "blue" },
        { label: "Active Jobs", value: stats.jobs, trend: "+5 new today", icon: Briefcase, color: "purple" },
        { label: "Applications", value: stats.applications, trend: "8 pending review", icon: FileText, color: "emerald" },
    ];

    return (
        <div className="space-y-6">
            {/* Top Row: Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {cards.map((stat) => (
                    <div key={stat.label} className="group relative overflow-hidden bg-slate-900/50 border border-white/5 p-6 rounded-3xl hover:bg-white/5 transition-all duration-300">
                        <div className="flex items-start justify-between relative z-10">
                            <div>
                                <p className="text-slate-400 text-sm font-medium mb-1">{stat.label}</p>
                                <h3 className="text-4xl font-bold text-white tracking-tight">{stat.value}</h3>
                                <div className="flex items-center gap-1 mt-2 text-xs font-semibold">
                                    <TrendingUp size={14} className="text-emerald-400" />
                                    <span className="text-emerald-400">{stat.trend}</span>
                                </div>
                            </div>
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                                stat.color === "blue" && "bg-blue-500/20 text-blue-400",
                                stat.color === "purple" && "bg-purple-500/20 text-purple-400",
                                stat.color === "emerald" && "bg-emerald-500/20 text-emerald-400",
                                stat.color === "orange" && "bg-orange-500/20 text-orange-400",
                            )}>
                                <stat.icon size={24} />
                            </div>
                        </div>

                        {/* Background Decoration */}
                        <div className={cn(
                            "absolute -bottom-4 -right-4 w-32 h-32 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20",
                            stat.color === "blue" && "bg-blue-500",
                            stat.color === "purple" && "bg-purple-500",
                            stat.color === "emerald" && "bg-emerald-500",
                            stat.color === "orange" && "bg-orange-500",
                        )} />
                    </div>
                ))}
            </div>

            {/* Middle Row: Bento Mix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">

                {/* Large Block: Recent Activity */}
                <div className="md:col-span-2 bg-slate-900/50 border border-white/5 rounded-3xl p-6 min-h-[300px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Clock size={18} className="text-slate-400" />
                            Recent Activity
                        </h3>
                        <button className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-3 py-1 rounded-full bg-indigo-500/10">View All</button>
                    </div>

                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5 text-slate-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 group-hover:border-indigo-500/20 transition-all">
                                    <Users size={16} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-slate-200">
                                        <span className="font-semibold text-white">New User</span> registered: <span className="text-slate-400">user_{9000 + i}</span>
                                    </p>
                                    <p className="text-xs text-slate-500">2 minutes ago</p>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Side Column: Work Queue */}
                <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <AlertCircle size={18} className="text-orange-400" />
                        Work Queue
                    </h3>

                    <div className="flex-1 flex flex-col gap-3">
                        <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3">
                            <Flag size={18} className="text-orange-400 mt-1 shrink-0" />
                            <div>
                                <h5 className="text-sm font-semibold text-orange-200">Report #124</h5>
                                <p className="text-xs text-orange-400/80 mt-1">Spam content reported in Job A</p>
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                            <CheckCircle size={18} className="text-blue-400 mt-1 shrink-0" />
                            <div>
                                <h5 className="text-sm font-semibold text-blue-200">Verification</h5>
                                <p className="text-xs text-blue-400/80 mt-1">Provider identity check pending</p>
                            </div>
                        </div>
                    </div>

                    <button className="w-full mt-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-sm font-medium transition-all">
                        Open Queue (5)
                    </button>
                </div>
            </div>
        </div>
    );
}
