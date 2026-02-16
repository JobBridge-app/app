"use client";

import { useState } from "react";
import { Radio, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { sendGlobalBroadcast } from "./actions";

export function BroadcastForm() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setMessage(null);

        const title = formData.get("title") as string;
        const body = formData.get("body") as string;
        const route = formData.get("route") as string;

        try {
            const res = await sendGlobalBroadcast(title, body, route || undefined);
            if (res.success) {
                setMessage({ type: 'success', text: res.message });
                (document.getElementById("broadcast-form") as HTMLFormElement).reset();
            } else {
                setMessage({ type: 'error', text: res.message + (res.details ? `: ${res.details}` : '') });
            }
        } catch (e: any) {
            setMessage({ type: 'error', text: "An unexpected error occurred." });
        } finally {
            setLoading(false);
        }
    }

    return (
        <form id="broadcast-form" action={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Title</label>
                <input
                    name="title"
                    required
                    placeholder="e.g. Server Maintenance Tonight"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
            </div>

            <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Message Body</label>
                <textarea
                    name="body"
                    required
                    rows={4}
                    placeholder="We will be undergoing maintenance..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
            </div>

            <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Target Route (Optional)</label>
                <input
                    name="route"
                    placeholder="/app-home/settings"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono text-sm"
                />
            </div>

            {message && (
                <div className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${message.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                    {message.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                    {message.text}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin" /> : <Radio size={18} />}
                Send Broadcast
            </button>
        </form>
    );
}
