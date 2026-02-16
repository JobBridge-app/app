"use client";

import { useEffect, useState } from "react";
import { CommunicationLogItem } from "@/lib/data/adminTypes";
import { CheckCircle, Clock, Mail, MessageSquare, AlertTriangle, Info, Trash2, Loader2 } from "lucide-react";
import { deleteNotificationAction } from "@/lib/data/adminCommunications";
import { useRouter } from "next/navigation";

type HistoryTableProps = {
    logs: CommunicationLogItem[];
    loading?: boolean;
};

export function NotificationHistoryTable({ logs, loading }: HistoryTableProps) {
    const router = useRouter();
    const [displayLogs, setDisplayLogs] = useState(logs);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        setDisplayLogs(logs);
    }, [logs]);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this notification?")) return;

        setDeletingId(id);
        // Optimistic update
        const previousLogs = [...displayLogs];
        setDisplayLogs(prev => prev.filter(l => l.id !== id));

        const { success, error } = await deleteNotificationAction(id);

        if (!success) {
            alert(error || "Failed to delete");
            setDisplayLogs(previousLogs); // Revert
        } else {
            router.refresh(); // Sync server state
        }
        setDeletingId(null);
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500 animate-pulse">Loading history...</div>;
    }

    if (displayLogs.length === 0) {
        return (
            <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                <p className="text-slate-400">No communication logs found.</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-900/80 border-b border-white/5 backdrop-blur-sm">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Recipient</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Content</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Sent</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Status</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {displayLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border ${log.type === 'system_broadcast'
                                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        }`}>
                                        {log.type === 'system_broadcast' ? <AlertTriangle size={12} /> : <MessageSquare size={12} />}
                                        {log.type === 'system_broadcast' ? 'Broadcast' : 'Direct'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {log.user ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 border border-white/10 flex items-center justify-center font-bold text-xs uppercase">
                                                {log.user.full_name?.substring(0, 2) || "??"}
                                            </div>
                                            <div>
                                                <div className="font-medium text-white text-sm">{log.user.full_name || "Unknown"}</div>
                                                <div className="text-xs text-slate-500">{log.user.email}</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-slate-500 italic text-sm">Deleted User</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 max-w-[300px]">
                                    <div className="font-medium text-slate-200 text-sm truncate">{log.title}</div>
                                    <div className="text-xs text-slate-500 truncate">{log.body}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-400 tabular-nums">
                                    {new Date(log.created_at).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {log.read_at ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                                            <CheckCircle size={14} /> Read
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-slate-500 text-xs">
                                            <Clock size={14} /> Unread
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handleDelete(log.id)}
                                        disabled={deletingId === log.id}
                                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50"
                                        title="Delete notification"
                                    >
                                        {deletingId === log.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
