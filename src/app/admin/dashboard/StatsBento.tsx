"use client";

import { Users, Briefcase, FileText, Clock, AlertCircle, CheckCircle, Flag, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ActivityItem, type DashboardMetrics, type WorkQueueItem } from "@/lib/data/adminTypes";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

type Stat = {
  label: string;
  metric: {
    value: number | null;
    error: string | null;
  };
  href: string;
  trend?: string;
  icon: React.ElementType;
  color: "blue" | "purple" | "emerald" | "orange";
};

export function StatsBento({
  metrics,
  activity,
  activityHasMore,
  activityError,
  workQueue,
  workQueueError,
}: {
  metrics: DashboardMetrics;
  activity: ActivityItem[];
  activityHasMore: boolean;
  activityError: string | null;
  workQueue: WorkQueueItem[];
  workQueueError: string | null;
}) {
  const cards: Stat[] = [
    { label: "Total Users", metric: metrics.users, href: "/staff/users", trend: "—", icon: Users, color: "blue" },
    { label: "Jobs", metric: metrics.jobs, href: "/staff/jobs", trend: "—", icon: Briefcase, color: "purple" },
    { label: "Applications", metric: metrics.applications, href: "/staff/applications", trend: "—", icon: FileText, color: "emerald" },
  ];

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "user":
        return Users;
      case "job":
        return Briefcase;
      case "application":
        return FileText;
      case "report":
        return Flag;
      default:
        return Clock;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((stat) => (
          <Link
            href={stat.href}
            key={stat.label}
            className="group relative overflow-hidden bg-slate-900/50 border border-white/5 p-6 rounded-3xl hover:bg-white/5 transition-all duration-300"
          >
            <div className="flex items-start justify-between relative z-10 gap-4">
              <div>
                <p className="text-slate-400 text-sm font-medium mb-1">{stat.label}</p>
                <h3 className="text-4xl font-bold text-white tracking-tight">{stat.metric.value ?? "—"}</h3>
                {stat.metric.error ? (
                  <div className="mt-2">
                    <p className="text-xs text-rose-300">{stat.metric.error}</p>
                    <p className="text-[11px] text-indigo-300">Open section</p>
                  </div>
                ) : (
                  <p className="text-xs font-semibold mt-2 text-slate-500">{stat.trend}</p>
                )}
              </div>
              <div
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                  stat.color === "blue" && "bg-blue-500/20 text-blue-400",
                  stat.color === "purple" && "bg-purple-500/20 text-purple-400",
                  stat.color === "emerald" && "bg-emerald-500/20 text-emerald-400",
                  stat.color === "orange" && "bg-orange-500/20 text-orange-400",
                )}
              >
                <stat.icon size={24} />
              </div>
            </div>

            <div
              className={cn(
                "absolute -bottom-4 -right-4 w-32 h-32 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20",
                stat.color === "blue" && "bg-blue-500",
                stat.color === "purple" && "bg-purple-500",
                stat.color === "emerald" && "bg-emerald-500",
                stat.color === "orange" && "bg-orange-500",
              )}
            />
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
        <div className="md:col-span-2 bg-slate-900/50 border border-white/5 rounded-3xl p-6 min-h-[300px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock size={18} className="text-slate-400" />
              Recent Activity
            </h3>
            <div className="flex items-center gap-2">
              <div className="group relative">
                <span className="text-xs text-slate-500 cursor-help border border-white/10 rounded-full w-5 h-5 flex items-center justify-center">
                  <Info size={12} />
                </span>
                <div className="absolute right-0 top-6 w-72 p-2 bg-slate-800 text-xs text-slate-300 rounded shadow-lg border border-white/10 hidden group-hover:block z-50">
                  Latest events from: users, jobs, applications, reports, moderation actions.
                </div>
              </div>
              <Link
                href="/staff/activity"
                className="text-xs text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20"
              >
                View all
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            {activityError ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
                <p className="text-sm text-rose-200">{activityError}</p>
                <Link href="/staff" className="text-xs text-indigo-300 hover:text-indigo-200 mt-1 inline-flex">
                  Retry
                </Link>
              </div>
            ) : activity.length === 0 ? (
              <p className="text-slate-500 text-sm">No recent activity.</p>
            ) : (
              activity.slice(0, 5).map((item, index) => {
                const Icon = getActivityIcon(item.type);
                return (
                  <Link
                    href={item.href}
                    key={`${item.type}-${item.entityId}-${index}`}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group block"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5 text-slate-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 group-hover:border-indigo-500/20 transition-all">
                      <Icon size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-200 font-medium">{item.title}</p>
                      {item.subtitle && <p className="text-xs text-slate-500">{item.subtitle}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{formatTimestamp(item.createdAt)}</p>
                    </div>
                  </Link>
                );
              })
            )}

            {!activityError && activityHasMore && (
              <div className="pt-2">
                <Link href="/staff/activity" className="text-xs text-slate-400 hover:text-slate-200">
                  More activity items available
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertCircle size={18} className="text-orange-400" />
              Work Queue
            </h3>
            <div className="group relative">
              <span className="text-xs text-slate-500 cursor-help border border-white/10 rounded-full w-5 h-5 flex items-center justify-center">?</span>
              <div className="absolute right-0 top-6 w-48 p-2 bg-slate-800 text-xs text-slate-300 rounded shadow-lg border border-white/10 hidden group-hover:block z-50">
                Sources: open reports, unverified users, submitted applications.
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-3">
            {workQueueError ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
                <p className="text-sm text-rose-200">{workQueueError}</p>
                <Link href="/staff" className="text-xs text-indigo-300 hover:text-indigo-200 mt-1 inline-flex">
                  Retry
                </Link>
              </div>
            ) : workQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <CheckCircle size={32} className="text-emerald-500/20 mb-2" />
                <p className="text-slate-500 text-sm">All caught up!</p>
              </div>
            ) : (
              workQueue.slice(0, 5).map((item) => (
                <Link
                  href={item.link || "/staff"}
                  key={item.id}
                  className={cn(
                    "p-4 rounded-2xl border flex items-start gap-3 transition-all hover:translate-x-1",
                    item.priority === "high" ? "bg-orange-500/10 border-orange-500/20" : "bg-blue-500/10 border-blue-500/20",
                  )}
                >
                  {item.type === "report" ? (
                    <Flag size={18} className="text-orange-400 mt-1 shrink-0" />
                  ) : (
                    <CheckCircle size={18} className="text-blue-400 mt-1 shrink-0" />
                  )}
                  <div>
                    <h5 className={cn("text-sm font-semibold", item.priority === "high" ? "text-orange-200" : "text-blue-200")}>{item.title}</h5>
                    <p className={cn("text-xs mt-1", item.priority === "high" ? "text-orange-400/80" : "text-blue-400/80")}>{item.subtitle}</p>
                  </div>
                </Link>
              ))
            )}
          </div>

          <Link
            href="/staff/moderation"
            className="w-full mt-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-sm font-medium transition-all text-center"
          >
            View All Tasks
          </Link>
        </div>
      </div>
    </div>
  );
}

function formatTimestamp(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}
