import { getAdminApplication, getAdminApplications } from "@/lib/data/adminApplications";
import Link from "next/link";
import { Search } from "lucide-react";
import { ApplicationsTable } from "./ApplicationsTable";
import { requireStaffSectionAccess } from "@/lib/data/adminAccess";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function readString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireStaffSectionAccess("management");

  const params = await searchParams;
  const query = readString(params.q).trim();
  const applicationId = readString(params.applicationId);

  const [applicationsResult, selectedApplicationResult] = await Promise.all([
    getAdminApplications({ limit: 120, search: query }),
    applicationId ? getAdminApplication(applicationId) : Promise.resolve({ item: null, error: null }),
  ]);

  const applications = applicationsResult.items;
  const error = applicationsResult.error;
  const selectedApplication = selectedApplicationResult.item;
  const selectedError = selectedApplicationResult.error;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Applications</h1>
          <p className="text-slate-400 mt-1">Review incoming job applications.</p>
        </div>

        <form method="GET" action="/staff/applications" className="relative group flex items-center gap-2">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors"
            size={16}
          />
          <input
            name="q"
            defaultValue={query}
            type="text"
            placeholder="Search applications..."
            className="bg-slate-900 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 w-64 md:w-96 transition-all hover:bg-slate-800/50"
          />
          <button
            type="submit"
            className="px-3 py-2 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-sm"
          >
            Search
          </button>
          {query && (
            <Link
              href="/staff/applications"
              className="px-3 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 text-sm"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {(error || selectedError) && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          <p className="text-sm text-rose-200">{error || selectedError}</p>
        </div>
      )}

      <ApplicationsTable applications={applications} selectedApplication={selectedApplication} query={query} />
    </div>
  );
}
