import { BarChart3, Users, Briefcase, Shield, FileText, Flag } from "lucide-react";
import { StatsBento } from "./dashboard/StatsBento";
import { getDashboardMetrics, getRecentActivity, getStaffHeaderContext, getWorkQueue } from "@/lib/data/adminDashboard";
import Link from "next/link";
import { canAccessAdminSection, getStaffRoleDescription } from "@/lib/adminNavigation";
import { requireStaffSectionAccess } from "@/lib/data/adminAccess";
import { AdminGlobalSearch } from "./components/AdminGlobalSearch";

export default async function AdminDashboard() {
  const { session, highestRole } = await requireStaffSectionAccess("overview");

  const [metrics, activity, workQueue, staffHeader] = await Promise.all([
    getDashboardMetrics(),
    getRecentActivity(15, 0),
    getWorkQueue(),
    getStaffHeaderContext(session.user.id),
  ]);

  const firstName = staffHeader.fullName.split(" ")[0] || "Staff";

  const metricsAllFailed = Boolean(metrics.users.error && metrics.jobs.error && metrics.applications.error);
  const allSectionsFailed = metricsAllFailed && Boolean(activity.error) && Boolean(workQueue.error);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
  const dateLabel = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
  const roleDescription = getStaffRoleDescription(highestRole);
  const analystSummary = [
    { label: "Nutzer", value: metrics.users.value ?? 0, icon: Users, tone: "text-blue-300 bg-blue-500/10 border-blue-500/20" },
    { label: "Jobs", value: metrics.jobs.value ?? 0, icon: Briefcase, tone: "text-violet-300 bg-violet-500/10 border-violet-500/20" },
    { label: "Bewerbungen", value: metrics.applications.value ?? 0, icon: FileText, tone: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" },
  ];
  const quickLinks = [
    {
      label: "Statistiken",
      href: "/staff/statistics",
      show: canAccessAdminSection(highestRole, "statistics"),
      icon: BarChart3,
      className: "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15 text-blue-200",
    },
    {
      label: "Users",
      href: "/staff/users",
      show: canAccessAdminSection(highestRole, "management"),
      icon: Users,
      className: "bg-slate-800/50 border-white/5 hover:bg-slate-800/80 text-slate-300",
    },
    {
      label: "Jobs",
      href: "/staff/jobs",
      show: canAccessAdminSection(highestRole, "management"),
      icon: Briefcase,
      className: "bg-slate-800/50 border-white/5 hover:bg-slate-800/80 text-slate-300",
    },
    {
      label: "Applications",
      href: "/staff/applications",
      show: canAccessAdminSection(highestRole, "management"),
      icon: FileText,
      className: "bg-slate-800/50 border-white/5 hover:bg-slate-800/80 text-slate-300",
    },
    {
      label: "Moderation",
      href: "/staff/moderation",
      show: canAccessAdminSection(highestRole, "operations"),
      icon: Flag,
      className: "bg-slate-800/50 border-white/5 hover:bg-slate-800/80 text-slate-300",
    },
    {
      label: "Roles & perms",
      href: "/staff/roles",
      show: canAccessAdminSection(highestRole, "system"),
      icon: Shield,
      className: "bg-slate-800/50 border-white/5 hover:bg-slate-800/80 text-slate-300",
    },
  ].filter((item) => item.show).slice(0, 4);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
        <div className="min-w-0 flex-1 max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{greeting}, {firstName}.</h1>
          <p className="text-sm text-slate-400 mt-1">{dateLabel} · {roleDescription}</p>
        </div>
        <div className="w-full lg:w-[420px] lg:max-w-[420px] lg:ml-auto shrink-0">
          <AdminGlobalSearch />
        </div>
      </div>

      {staffHeader.error && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="text-sm text-amber-200">Failed to load header metadata completely.</p>
          <p className="text-xs text-amber-300/80 mt-1">{staffHeader.error}</p>
        </div>
      )}

      {allSectionsFailed && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          <p className="text-sm text-rose-200 font-medium">Dashboard data could not be loaded.</p>
          <p className="text-xs text-rose-300/80 mt-1">
            {[metrics.users.error, metrics.jobs.error, metrics.applications.error, activity.error, workQueue.error]
              .filter(Boolean)
              .join(" ")}
          </p>
        </div>
      )}

      {highestRole === "analyst" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analystSummary.map((item) => (
              <div key={item.label} className={`rounded-3xl border p-6 ${item.tone}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-300">{item.label}</p>
                    <p className="mt-2 text-4xl font-bold text-white tabular-nums">{item.value}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl border border-white/10 bg-black/20 flex items-center justify-center">
                    <item.icon size={22} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/staff/statistics"
            className="block rounded-3xl border border-blue-500/20 bg-blue-500/10 p-6 hover:bg-blue-500/15 transition-colors"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-200">Statistikbereich</p>
                <p className="mt-1 text-sm text-blue-100/75">
                  Öffne Kennzahlen, Trends und die aktuelle Signalverteilung in einer fokussierten Analystenansicht.
                </p>
              </div>
              <BarChart3 size={22} className="text-blue-300 shrink-0" />
            </div>
          </Link>
        </div>
      ) : (
        <StatsBento
          metrics={metrics}
          activity={activity.items}
          activityHasMore={activity.hasMore}
          activityError={activity.error}
          workQueue={workQueue.items}
          workQueueError={workQueue.error}
        />
      )}

      {quickLinks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`p-4 border rounded-2xl flex items-center justify-between group transition-all ${item.className}`}
            >
              <span className="font-semibold">{item.label}</span>
              <item.icon size={18} className="group-hover:scale-110 transition-transform" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
