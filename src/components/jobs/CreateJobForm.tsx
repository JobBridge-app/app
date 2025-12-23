"use client";

import { createJob } from "@/app/actions/jobs";
import { Loader2, Save } from "lucide-react";
import { useFormStatus } from "react-dom";
import { useActionState } from "react";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {pending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>Veröffentlichen</span>
        </button>
    );
}

export function CreateJobForm({ userId, marketId }: { userId: string, marketId: string }) {
    const [state, formAction] = useActionState(createJob, null);

    return (
        <form action={formAction} className="space-y-6">
            <div className="space-y-4">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-1">Titel des Jobs *</label>
                    <input
                        type="text"
                        name="title"
                        required
                        placeholder="z.B. Rasenmähen am Wochenende"
                        className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">Beschreibung</label>
                    <textarea
                        name="description"
                        rows={4}
                        placeholder="Beschreibe, was zu tun ist..."
                        className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y"
                    />
                </div>

                <div>
                    <label htmlFor="wage" className="block text-sm font-medium text-slate-300 mb-1">Stundenlohn (€)</label>
                    <input
                        type="number"
                        name="wage"
                        min="0"
                        step="0.50"
                        placeholder="12.00"
                        className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                </div>
            </div>

            {state?.error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {state.error}
                </div>
            )}

            <div className="pt-4 flex items-center justify-between border-t border-white/5 mt-6">
                <p className="text-xs text-slate-500">Dein Job wird für Jobsuchende in Rheinbach sichtbar sein.</p>
                <SubmitButton />
            </div>
        </form>
    );
}
