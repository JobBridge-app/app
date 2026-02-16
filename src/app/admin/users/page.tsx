import { requireCompleteProfile } from "@/lib/auth";
import { getAdminUser, getAdminUsers } from "@/lib/data/adminUsers";
import Link from "next/link";
import { Search } from "lucide-react";
import { UsersTable } from "./UsersTable";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function readString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireCompleteProfile();

  const params = await searchParams;
  const query = readString(params.q).trim();
  const userId = readString(params.userId);

  /* const [usersResult, selectedUserResult] = await Promise.all([
    getAdminUsers({ limit: 100, search: query }),
    userId ? getAdminUser(userId) : Promise.resolve({ item: null, error: null }),
  ]);*/

  // Only fetch list, detail is separate page now
  const usersResult = await getAdminUsers({ limit: 100, search: query });

  const users = usersResult.items;
  const error = usersResult.error;
  // const selectedUser = selectedUserResult.item;
  // const selectedError = selectedUserResult.error;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">User Management</h1>
          <p className="text-slate-400 mt-1">View and manage all registered users.</p>
        </div>

        <form method="GET" action="/staff/users" className="relative group flex items-center gap-2">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors"
            size={16}
          />
          <input
            name="q"
            defaultValue={query}
            type="text"
            placeholder="Search full name, email or city..."
            className="bg-slate-900 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 w-64 md:w-80 transition-all hover:bg-slate-800/50"
          />
          <button
            type="submit"
            className="px-3 py-2 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-sm"
          >
            Search
          </button>
          {query && (
            <Link
              href="/staff/users"
              className="px-3 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 text-sm"
            >
              Clear
            </Link>
          )}
        </form>
      </div>


      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          <p className="text-sm text-rose-200">{error}</p>
        </div>
      )}

      <UsersTable users={users} query={query} />
    </div>
  );
}
