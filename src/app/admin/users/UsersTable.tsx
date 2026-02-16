"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Mail, MapPin } from "lucide-react";
import { type AdminUserListItem } from "@/lib/data/adminTypes";

type UsersTableProps = {
  users: AdminUserListItem[];
  query: string;
};

export function UsersTable({ users, query }: UsersTableProps) {
  return (
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
                    className={`inline-flex px-2 py-1 rounded-md text-xs font-medium capitalize border ${user.account_type === "job_provider"
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
                  <Link
                    href={`/staff/users/${user.id}`}
                    className="text-indigo-400 hover:text-indigo-300 text-sm font-medium hover:underline"
                  >
                    Open
                  </Link>
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
      </div>
    </div>
  );
}
