import { BarChart3, Briefcase, FileText, TrendingUp, Users } from "lucide-react";
import { getDashboardMetrics, getRecentActivity } from "@/lib/data/adminDashboard";
import { requireStaffSectionAccess } from "@/lib/data/adminAccess";
import { getStaffRoleDescription } from "@/lib/adminNavigation";

function formatValue(value: number | null) {
  return new Intl.NumberFormat("de-DE").format(value ?? 0);
}

export default async function StatisticsPage() {
  const { highestRole } = await requireStaffSectionAccess("statistics");

  const [metrics, activity] = await Promise.all([
    getDashboardMetrics(),
    getRecentActivity(18, 0),
  ]);

  const recentCounts = activity.items.reduce(
    (acc, item) => {
      if (item.type === "user") acc.users += 1;
      if (item.type === "job") acc.jobs += 1;
      if (item.type === "application") acc.applications += 1;
      return acc;
    },
    { users: 0, jobs: 0, applications: 0 }
  );

  const totalUsers = metrics.users.value ?? 0;
  const totalJobs = metrics.jobs.value ?? 0;
  const totalApplications = metrics.applications.value ?? 0;
  const applicationPerJob = totalJobs > 0 ? (totalApplications / totalJobs).toFixed(1) : "0.0";
  const roleDescription = getStaffRoleDescription(highestRole);

  const metricCards = [
    {
      label: "Registrierte Nutzer",
      value: formatValue(totalUsers),
      helper: metrics.users.error ?? "Gesamtbestand aller Profile",
      icon: Users,
      tone: "bg-blue-500/10 border-blue-500/20 text-blue-200",
    },
    {
      label: "Aktive Jobs",
      value: formatValue(totalJobs),
      helper: metrics.jobs.error ?? "Gesamtbestand aller Stellen",
      icon: Briefcase,
      tone: "bg-violet-500/10 border-violet-500/20 text-violet-200",
    },
    {
      label: "Bewerbungen",
      value: formatValue(totalApplications),
      helper: metrics.applications.error ?? "Gesamtvolumen aller Bewerbungen",
      icon: FileText,
      tone: "bg-emerald-500/10 border-emerald-500/20 text-emerald-200",
    },
  ];

  const recentSignalCards = [
    {
      label: "Neue Nutzer",
      value: recentCounts.users,
      helper: "Letzte 18 Signale",
      icon: Users,
    },
    {
      label: "Neue Jobs",
      value: recentCounts.jobs,
      helper: "Letzte 18 Signale",
      icon: Briefcase,
    },
    {
      label: "Neue Bewerbungen",
      value: recentCounts.applications,
      helper: "Letzte 18 Signale",
      icon: FileText,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl border border-blue-500/20 bg-blue-500/10 flex items-center justify-center text-blue-300">
            <BarChart3 size={22} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Statistiken</h1>
            <p className="text-slate-400 mt-1">{roleDescription}</p>
          </div>
        </div>
        <p className="text-sm text-slate-500">
          Fokussierter Kennzahlenbereich für Trends, Volumen und aktuelle Plattform-Signale.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metricCards.map((card) => (
          <div key={card.label} className={`rounded-3xl border p-6 ${card.tone}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-300">{card.label}</p>
                <p className="mt-2 text-4xl font-bold text-white tabular-nums">{card.value}</p>
                <p className="mt-2 text-xs text-slate-400">{card.helper}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl border border-white/10 bg-black/20 flex items-center justify-center">
                <card.icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="rounded-3xl border border-white/5 bg-slate-900/50 p-6">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-300" />
            <h2 className="text-lg font-semibold text-white">Signal Summary</h2>
          </div>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recentSignalCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/5 bg-black/20 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-300">{card.label}</p>
                  <card.icon size={16} className="text-slate-500" />
                </div>
                <p className="mt-3 text-3xl font-bold text-white tabular-nums">{card.value}</p>
                <p className="mt-1 text-xs text-slate-500">{card.helper}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/5 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white">Derived Ratios</h2>
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-4">
              <p className="text-sm text-slate-300">Bewerbungen pro Job</p>
              <p className="mt-2 text-3xl font-bold text-white tabular-nums">{applicationPerJob}</p>
              <p className="mt-1 text-xs text-slate-500">Basierend auf allen erfassten Bewerbungen und Jobs</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-4">
              <p className="text-sm text-slate-300">Aktuelle Signalbasis</p>
              <p className="mt-2 text-3xl font-bold text-white tabular-nums">{activity.items.length}</p>
              <p className="mt-1 text-xs text-slate-500">Zuletzt ausgewertete Aktivitätseinträge</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/5 bg-slate-900/50 p-6">
        <h2 className="text-lg font-semibold text-white">Latest Signal Feed</h2>
        <div className="mt-4 divide-y divide-white/5">
          {activity.items.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">Keine aktuellen Signale verfügbar.</p>
          ) : (
            activity.items.slice(0, 8).map((item, index) => (
              <div key={`${item.type}-${item.entityId}-${index}`} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-100">{item.title}</p>
                  {item.subtitle && <p className="mt-1 text-xs text-slate-500">{item.subtitle}</p>}
                </div>
                <span className="text-xs text-slate-500 shrink-0">{new Date(item.createdAt).toLocaleString("de-DE")}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
