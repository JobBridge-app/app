"use client";

import { useState } from "react";
import {
    Mail,
    Lock,
    Ban,
    Trash2,
    CheckCircle,
    XCircle,
    Loader2,
    AlertTriangle,
    Zap
} from "lucide-react";
import {
    sendPasswordResetEmail,
    banUser,
    unbanUser,
    deleteUser,
    updateUserProfile,
    sendMagicLinkEmail
} from "@/app/staff/users/actions";
import { useRouter } from "next/navigation";

export function UserQuickActions({ userId, isBanned, isVerified }: { userId: string, isBanned: boolean, isVerified: boolean }) {
    const [loading, setLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const router = useRouter();

    const handleAction = async (actionName: string, actionFn: () => Promise<any>, confirmMsg?: string) => {
        if (confirmMsg && !confirm(confirmMsg)) return;

        setLoading(actionName);
        setMessage(null);

        try {
            const res = await actionFn();
            if (res.success) {
                setMessage({ type: 'success', text: res.message });
                router.refresh();
            } else {
                setMessage({ type: 'error', text: res.message + (res.details ? `: ${res.details}` : '') });
            }
        } catch (e: any) {
            setMessage({ type: 'error', text: "Action failed: " + e.message });
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Status Message */}
            {message && (
                <div className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${message.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                    {message.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                    {message.text}
                </div>
            )}

            {/* Auth Actions */}
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Lock className="text-indigo-400" size={20} />
                    Authentication & Access
                </h3>
                <div className="flex flex-col gap-2">
                    <ActionButton
                        icon={Mail}
                        label="Send Password Reset Email"
                        loading={loading === 'reset'}
                        onClick={() => handleAction('reset', () => sendPasswordResetEmail(userId), "Send password reset email to user?")}
                    />
                    <ActionButton
                        icon={Zap}
                        label="Send Magic Link (Login)"
                        loading={loading === 'magic'}
                        onClick={() => handleAction('magic', () => sendMagicLinkEmail(userId), "Send magic login link?")}
                    />

                    {isBanned ? (
                        <ActionButton
                            icon={CheckCircle}
                            label="Unban User"
                            className="text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20"
                            loading={loading === 'unban'}
                            onClick={() => handleAction('unban', () => unbanUser(userId), "Unban this user?")}
                        />
                    ) : (
                        <ActionButton
                            icon={Ban}
                            label="Ban User (100 Years)"
                            className="text-amber-400 hover:bg-amber-500/10 border-amber-500/20"
                            loading={loading === 'ban'}
                            onClick={() => handleAction('ban', () => banUser(userId), "Are you sure you want to BAN this user unreasonably?")}
                        />
                    )}
                </div>
            </div>

            {/* Data Actions */}
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="text-emerald-400" size={20} />
                    Data & Verification
                </h3>
                <div className="flex flex-col gap-2">
                    {isVerified ? (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 text-sm">
                            <CheckCircle size={16} />
                            User is verified.
                        </div>
                    ) : (
                        <ActionButton
                            icon={CheckCircle}
                            label="Grant Verification (God Mode)"
                            className="text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20"
                            loading={loading === 'verify'}
                            onClick={() => handleAction('verify', () => updateUserProfile(userId, { verified: true }), "Force verify this user?")}
                        />
                    )}
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                    <AlertTriangle size={20} />
                    Danger Zone
                </h3>
                <ActionButton
                    icon={Trash2}
                    label="Delete User (Irreversible)"
                    className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                    loading={loading === 'delete'}
                    onClick={() => handleAction('delete', () => deleteUser(userId), "WARNING: This will permanently delete the user and all their data. Continue?")}
                />
            </div>
        </div>
    );
}

function ActionButton({
    icon: Icon,
    label,
    onClick,
    loading,
    className = ""
}: {
    icon: any,
    label: string,
    onClick: () => void,
    loading: boolean,
    className?: string
}) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className={`w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-all flex items-center justify-between group ${className}`}
        >
            <span className="flex items-center gap-3">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
                {label}
            </span>
        </button>
    );
}
