"use client";

import { useState } from "react";
import { Search, Shield, UserCog, Check, X, Loader2, AlertCircle, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { setUserRoleAction, removeRole, searchUsersForRole } from "../actions";
import { AdminRoleAssignment } from "@/lib/data/adminRoles";
import { RoleBadge } from "../components/RoleBadge";

type UserSearchResult = {
    id: string;
    full_name: string | null;
    email: string | null;
    city: string | null;
    avatar_url: string | null;
};

const AVAILABLE_ROLES = [
    { id: "admin", label: "Administrator", desc: "Full system access & user management" },
    { id: "moderator", label: "Moderator", desc: "Content review & safety tools" },
    { id: "analyst", label: "Analyst", desc: "View-only access to data & metrics" }
] as const;

export function RolesDashboard({ initialAssignments }: { initialAssignments: AdminRoleAssignment[] }) {
    const [assignments, setAssignments] = useState(initialAssignments);

    // Assignment Flow State
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    // Delete State
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleSearch = async (term: string) => {
        setSearchTerm(term);
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        const results = await searchUsersForRole(term);
        setSearchResults(results);
        setIsSearching(false);
    };

    const handleSetRole = async () => {
        if (!selectedUser || !selectedRole) return;

        setStatus("loading");
        // Use ID based action
        const res = await setUserRoleAction(selectedUser.id, selectedRole);

        if (res.error) {
            setStatus("error");
            setMessage(res.error);
        } else {
            setStatus("success");
            setMessage(`Updated role for ${selectedUser.full_name}`);

            // Optimistic update: Remove old entries for this user and add new one
            setAssignments(prev => {
                const filtered = prev.filter(a => a.user_id !== selectedUser.id);
                const newAssignment: AdminRoleAssignment = {
                    user_id: selectedUser.id,
                    full_name: selectedUser.full_name,
                    email: selectedUser.email,
                    city: selectedUser.city,
                    avatar_url: selectedUser.avatar_url,
                    role_name: selectedRole,
                    role_description: null,
                    created_at: new Date().toISOString(),
                };
                return [newAssignment, ...filtered];
            });

            // Reset after delay
            setTimeout(() => {
                setSelectedUser(null);
                setSelectedRole(null);
                setSearchTerm("");
                setSearchResults([]);
                setStatus("idle");
            }, 2000);
        }
    };

    const handleRemoveRole = async (userId: string, roleName: string) => {
        if (!confirm(`Revoke ${roleName} access?`)) return;

        setDeletingId(`${userId}-${roleName}`);
        const res = await removeRole(userId, roleName);

        if (res.error) {
            alert(res.error);
        } else {
            setAssignments(assignments.filter(a => !(a.user_id === userId && a.role_name === roleName)));
        }
        setDeletingId(null);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

            {/* Left Column: Staff List */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden shadow-2xl shadow-black/50 backdrop-blur-sm">
                    <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                                <Users size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-white">Active Staff Members</h2>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-white/5 text-xs font-medium text-slate-400 border border-white/5">
                            {assignments.length} Total
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 border-b border-white/5">
                                <tr>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">User</th>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Designation</th>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {assignments.map((item) => (
                                    <tr key={`${item.user_id}-${item.role_name}`} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 font-bold border border-white/5 text-sm shadow-inner group-hover:border-white/10 overflow-hidden">
                                                    {item.avatar_url ? (
                                                        <img src={item.avatar_url} alt={item.full_name || ""} className="w-full h-full object-cover" />
                                                    ) : (
                                                        item.full_name?.substring(0, 2)
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-200 group-hover:text-white transition-colors">{item.full_name || "Unknown"}</div>
                                                    <div className="text-xs text-slate-500 font-mono">{item.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <RoleBadge role={item.role_name} />
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button
                                                onClick={() => handleRemoveRole(item.user_id, item.role_name)}
                                                disabled={deletingId === `${item.user_id}-${item.role_name}`}
                                                className="p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                title="Revoke Access"
                                            >
                                                {deletingId === `${item.user_id}-${item.role_name}` ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={16} />
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {assignments.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-8 py-24 text-center">
                                            <div className="mx-auto w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-white/5">
                                                <Shield className="text-slate-600" size={32} />
                                            </div>
                                            <h3 className="text-slate-300 font-medium">No active staff</h3>
                                            <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">
                                                Assign a role using the panel on the right to get started.
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Right Column: Assignment Panel */}
            <div className="lg:col-span-1">
                <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 sticky top-8 backdrop-blur-xl shadow-2xl">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="p-2 bg-indigo-500 rounded-lg text-white shadow-lg shadow-indigo-500/20">
                            <UserCog size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Manage Access</h2>
                            <p className="text-xs text-slate-400">Assign or update user roles</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* 1. User Search */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select User</label>

                            {!selectedUser ? (
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        placeholder="Search name or email..."
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                    />
                                    {isSearching && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <Loader2 className="animate-spin text-indigo-500" size={16} />
                                        </div>
                                    )}

                                    {/* Dropdown */}
                                    {searchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                                            {searchResults.map((user) => (
                                                <button
                                                    key={user.id}
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setSearchTerm("");
                                                        setSearchResults([]);
                                                    }}
                                                    className="w-full text-left flex items-center gap-3 p-3 hover:bg-white/10 transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                                                        {user.full_name?.substring(0, 2)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-medium text-slate-200 truncate">{user.full_name}</div>
                                                        <div className="text-xs text-slate-500 truncate">{user.email}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between group">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20">
                                            {selectedUser.full_name?.substring(0, 2)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-white text-sm truncate">{selectedUser.full_name}</div>
                                            <div className="text-xs text-indigo-300 truncate">{selectedUser.email}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedUser(null)}
                                        className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-300 hover:text-white transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 2. Role Selection */}
                        <div className={cn("space-y-3 transition-opacity duration-300", !selectedUser && "opacity-50 pointer-events-none blur-[1px]")}>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Assign Role</label>
                            <div className="space-y-2">
                                {AVAILABLE_ROLES.map((role) => (
                                    <button
                                        key={role.id}
                                        onClick={() => setSelectedRole(role.id)}
                                        className={cn(
                                            "w-full text-left p-3 rounded-xl border transition-all relative",
                                            selectedRole === role.id
                                                ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20 translate-x-1"
                                                : "bg-black/20 border-white/5 text-slate-400 hover:bg-white/5 hover:border-white/10"
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="font-bold text-sm">{role.label}</span>
                                            {selectedRole === role.id && <Check size={14} />}
                                        </div>
                                        <div className={cn("text-[10px]", selectedRole === role.id ? "text-indigo-200" : "text-slate-600")}>
                                            {role.desc}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 3. Action */}
                        <div className={cn("pt-4 border-t border-white/5", !selectedRole && "opacity-50 pointer-events-none")}>
                            {status === "error" && (
                                <div className="mb-4 text-xs text-rose-300 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20 flex items-start gap-2">
                                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                    {message}
                                </div>
                            )}
                            {status === "success" && (
                                <div className="mb-4 text-xs text-emerald-300 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 flex items-start gap-2">
                                    <Check size={14} className="shrink-0 mt-0.5" />
                                    {message}
                                </div>
                            )}

                            <button
                                onClick={handleSetRole}
                                disabled={status === "loading" || status === "success"}
                                className="w-full py-3.5 bg-white text-black font-bold rounded-xl hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-white/10 active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {status === "loading" ? <Loader2 className="animate-spin" size={18} /> : "Update Access"}
                            </button>
                            <p className="text-[10px] text-slate-600 text-center mt-3">
                                This will replace any existing system roles for this user.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
