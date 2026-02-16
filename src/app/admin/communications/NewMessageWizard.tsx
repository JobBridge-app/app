"use client";

import { useState } from "react";
import { Search, User, X, Check, Loader2, Send, Radio } from "lucide-react";
import { searchUsersForMessage, getCommunicationLogs } from "@/lib/data/adminCommunications";
import { sendDirectMessage, sendGlobalBroadcast } from "./actions";
import { AdminUserListItem } from "@/lib/data/adminTypes";
import { useRouter } from "next/navigation";

export function NewMessageWizard({ onFailure, onSuccess }: { onFailure?: (msg: string) => void, onSuccess?: () => void }) {
    const router = useRouter();
    const [mode, setMode] = useState<'direct' | 'broadcast'>('direct');
    const [step, setStep] = useState(1);

    // Search State
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<AdminUserListItem[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);

    // Message State
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [route, setRoute] = useState(""); // Optional deep link
    const [sending, setSending] = useState(false);

    // Debounced Search
    function handleSearch(term: string) {
        setSearchTerm(term);
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        // Debounce could be added here, but for now simple async
        searchUsersForMessage(term).then(res => {
            setSearchResults(res);
            setSearching(false);
        });
    }

    async function handleSend() {
        setSending(true);
        try {
            let result;
            if (mode === 'broadcast') {
                result = await sendGlobalBroadcast(title, body, route || undefined);
            } else {
                if (!selectedUser) {
                    throw new Error("No user selected");
                }
                result = await sendDirectMessage(selectedUser.id, title, body);
            }

            if (result.success) {
                if (onSuccess) onSuccess();
                // Reset form
                setStep(1);
                setTitle("");
                setBody("");
                setSelectedUser(null);
                setSearchTerm("");
            } else {
                if (onFailure) onFailure(result.message);
            }
        } catch (e: any) {
            if (onFailure) onFailure(e.message || "An unexpected error occurred.");
        } finally {
            setSending(false);
        }
    }

    // --- RENDER STEPS ---

    // Step 1: Select Recipient (Only for Direct)
    if (step === 1 && mode === 'direct') {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <button
                            onClick={() => setMode('direct')}
                            className="flex-1 py-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all bg-indigo-500/20 border-indigo-500 text-indigo-400"
                        >
                            <User size={18} /> Direct Message
                        </button>
                        <button
                            onClick={() => { setMode('broadcast'); setStep(2); }}
                            className="flex-1 py-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all bg-white/5 border-white/10 text-slate-400 opacity-50"
                        >
                            <Radio size={18} /> Broadcast
                        </button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Search user by name or email..."
                            className="w-full bg-slate-900 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                            autoFocus
                        />
                        {searching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-slate-500" size={18} />}
                    </div>

                    {/* Results List */}
                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                        {searchResults.map(user => (
                            <button
                                key={user.id}
                                onClick={() => { setSelectedUser(user); setStep(2); }}
                                className="w-full text-left p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all flex items-center gap-3 group"
                            >
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold uppercase group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors">
                                    {user.full_name?.substring(0, 2) || "??"}
                                </div>
                                <div>
                                    <div className="text-white font-medium">{user.full_name}</div>
                                    <div className="text-xs text-slate-400">{user.email}</div>
                                </div>
                                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400 text-xs font-bold uppercase tracking-wider">
                                    Select &rarr;
                                </div>
                            </button>
                        ))}
                        {searchTerm.length > 1 && searchResults.length === 0 && !searching && (
                            <div className="text-center p-4 text-slate-500 text-sm italic">No users found.</div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Step 2: Write Content
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">

            {/* Context Header */}
            <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                <div className="flex items-center gap-3">
                    {mode === 'direct' ? (
                        <>
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase">
                                {selectedUser?.full_name?.substring(0, 2)}
                            </div>
                            <div className="text-sm">
                                <span className="text-slate-400">To: </span>
                                <span className="text-white font-medium">{selectedUser?.full_name}</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                                <Radio size={14} />
                            </div>
                            <div className="text-sm">
                                <span className="text-slate-400">To: </span>
                                <span className="text-white font-medium">All Users (Broadcast)</span>
                            </div>
                        </>
                    )}
                </div>
                {mode === 'direct' && (
                    <button onClick={() => setStep(1)} className="text-xs text-slate-500 hover:text-white underline">Change</button>
                )}
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Subject</label>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Message Subject"
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        autoFocus
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Message</label>
                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={6}
                        placeholder="Type your message here..."
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                    />
                </div>

                {mode === 'broadcast' && (
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Deep Link (Optional)</label>
                        <input
                            value={route}
                            onChange={(e) => setRoute(e.target.value)}
                            placeholder="/app-home/settings"
                            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono text-sm"
                        />
                    </div>
                )}
            </div>

            <div className="flex gap-4 pt-2">
                {mode === 'broadcast' && (
                    <button
                        onClick={() => { setMode('direct'); setStep(1); }}
                        className="px-6 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 font-medium transition-colors"
                    >
                        Cancel
                    </button>
                )}
                <button
                    onClick={handleSend}
                    disabled={!title || !body || sending}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                >
                    {sending ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                    Send {mode === 'broadcast' ? 'Broadcast' : 'Message'}
                </button>
            </div>

        </div>
    );
}
