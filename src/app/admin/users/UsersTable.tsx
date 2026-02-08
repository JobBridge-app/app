"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calendar, Mail, MapPin, Shield, X } from "lucide-react";
import { type AdminUserDetail, type AdminUserListItem } from "@/lib/data/adminTypes";

type UsersTableProps = {
  users: AdminUserListItem[];
  selectedUser: AdminUserDetail | null;
  query: string;
};

export function UsersTable({ users, selectedUser, query }: UsersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const basePath = query ? `${pathname}?q=${encodeURIComponent(query)}` : pathname;

  function openUser(userId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("userId", userId);
    const nextUrl = `${pathname}?${params.toString()}`;
    router.push(nextUrl, { scroll: false });
  }

  function closeDrawer() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("userId");
    const nextQuery = params.toString();
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }

  return (
    <>
      <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900/80 border-b border-white/5 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-800 text-slate-300 border border-white/10 flex items-center justify-center font-bold text-xs uppercase group-hover:border-indigo-500/30 group-hover:bg-indigo-500/10 group-hover:text-indigo-300 transition-all">
                        {user.full_name?.substring(0, 2) || "??"}
                      </div>
                      <div>
                        <div className="font-medium text-white group-hover:text-indigo-200 transition-colors">{user.full_name || "Unknown User"}</div>
                        <div className="text-xs text-slate-500">{user.city || "No location"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400 font-mono">{user.email || "—"}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 rounded-md text-xs font-medium capitalize border ${
                        user.account_type === "job_provider"
                          ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}
                    >
                      {user.account_type === "job_provider"
                        ? (user.provider_kind === "company" ? "Unternehmen" : "Privat")
                        : "Jobsuchend"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.email_verified_at && (
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] items-center gap-1 bg-sky-500/10 text-sky-300 border border-sky-500/20">
                          Email verified
                        </span>
                      )}
                      {user.account_type === "job_seeker" && user.guardian_status === "linked" && (
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Guardian linked
                        </span>
                      )}
                      {user.account_type === "job_provider" && user.provider_verification_status === "verified" && (
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Provider verified
                        </span>
                      )}
                      {user.roles.map((role) => (
                        <span key={role} className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400 tabular-nums">{new Date(user.created_at).toLocaleDateString("de-DE")}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => openUser(user.id)}
                      className="text-indigo-400 hover:text-indigo-300 text-sm font-medium hover:underline"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-900/80 px-6 py-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {users.length} users
            {query ? ` for "${query}"` : ""}
          </span>
          <span>Deep link: `/staff/users?userId=&lt;uuid&gt;`</span>
        </div>
      </div>

      {selectedUser && (
        <>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close user drawer"
            className="fixed inset-0 bg-black/50 z-40"
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-slate-950 border-l border-white/10 p-6 overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 flex items-center justify-center font-bold uppercase">
                  {(selectedUser.full_name || "??").slice(0, 2)}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{selectedUser.full_name || "Unknown user"}</h2>
                  <p className="text-xs text-slate-400 font-mono">{selectedUser.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white border border-white/10 rounded-lg px-2 py-1"
              >
                <X size={12} />
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 mt-6">
              <div className="rounded-xl border border-white/5 bg-black/20 p-4 space-y-2">
                <p className="text-xs uppercase tracking-wider text-slate-500">Identity</p>
                <p className="text-sm text-slate-200 flex items-center gap-2">
                  <Mail size={14} /> {selectedUser.email || "No email"}
                </p>
                <p className="text-sm text-slate-200 flex items-center gap-2">
                  <MapPin size={14} /> {selectedUser.city || "No location"}
                </p>
                <p className="text-sm text-slate-200 flex items-center gap-2">
                  <Calendar size={14} /> {new Date(selectedUser.created_at).toLocaleDateString("de-DE")}
                </p>
                <p className="text-sm text-slate-300">
                  <span className="text-slate-500">Account type:</span> {selectedUser.account_type || "—"}
                </p>
                <p className="text-sm text-slate-300">
                  <span className="text-slate-500">Provider kind:</span> {selectedUser.provider_kind || "—"}
                </p>
                <p className="text-sm text-slate-300">
                  <span className="text-slate-500">Guardian:</span> {selectedUser.guardian_status || "—"}
                </p>
                <p className="text-sm text-slate-300">
                  <span className="text-slate-500">Provider verification:</span> {selectedUser.provider_verification_status || "—"}
                </p>
                <p className="text-sm text-slate-300">
                  <span className="text-slate-500">Email verified:</span> {selectedUser.email_verified_at ? "Yes" : "No"}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-black/20 p-4 space-y-2">
                <p className="text-xs uppercase tracking-wider text-slate-500">Staff roles</p>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.roles.length === 0 && <span className="text-sm text-slate-500">No staff role</span>}
                  {selectedUser.roles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-indigo-500/10 text-indigo-200 border border-indigo-500/20"
                    >
                      <Shield size={12} />
                      {role}
                    </span>
                  ))}
                </div>
                <Link href={basePath} className="inline-flex mt-3 text-xs text-slate-400 hover:text-slate-200">
                  Open without drawer param
                </Link>
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
