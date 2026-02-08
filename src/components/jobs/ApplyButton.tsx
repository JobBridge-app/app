"use client";

import { useState } from "react";
import { ButtonPrimary } from "@/components/ui/ButtonPrimary";
import { Lock, Check, ExternalLink, ShieldCheck, Copy, Info } from "lucide-react";
import type { GuardianStatus } from "@/lib/types";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { Modal } from "@/components/ui/Modal";
import { applyToJob } from "@/app/app-home/jobs/actions";
import { motion } from "framer-motion";

type InvitePayload = { token: string; expires_at: string };

export function ApplyButton({ canApply, guardianStatus: initialStatus, jobId }: { canApply: boolean; guardianStatus: GuardianStatus; jobId: string }) {
    const [showModal, setShowModal] = useState(false);
    const [applied, setApplied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [guardianStatus, setGuardianStatus] = useState<GuardianStatus>(initialStatus);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleClick = async () => {
        if (!canApply) {
            setShowModal(true);
        } else {
            setLoading(true);
            const result = await applyToJob(jobId);
            setLoading(false);

            if (result.success) {
                setApplied(true);
            } else {
                alert(result.error);
            }
        }
    };

    const handleCopy = async () => {
        if (!inviteLink) return;
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const generateLink = async () => {
        try {
            const { data, error } = await supabaseBrowser.rpc("create_guardian_invitation", { p_invited_email: null });
            if (error) throw error;
            const payload = data as unknown as InvitePayload | null;
            if (!payload?.token) throw new Error("Invite konnte nicht erstellt werden.");

            const link = `${window.location.origin}/guardian/accept?token=${encodeURIComponent(payload.token)}`;
            setInviteLink(link);
            setGuardianStatus("pending");
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
            alert(`Fehler: ${msg}`);
        }
    };

    if (applied) {
        return (
            <ButtonPrimary disabled className="w-full bg-emerald-500/20 text-emerald-400 border-none">
                Beworben
            </ButtonPrimary>
        );
    }

    return (
        <>
            <ButtonPrimary onClick={handleClick} className="w-full">
                {!canApply && <Lock size={16} className="mr-2 inline" />}
                Jetzt bewerben
            </ButtonPrimary>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={
                    <div className="flex items-center gap-2.5">
                        <div className="bg-amber-500/10 p-1.5 rounded-lg text-amber-500">
                            <ShieldCheck size={20} />
                        </div>
                        <span className="text-white font-medium">Jugendschutz & Sicherheit</span>
                    </div>
                }
            >
                <div className="space-y-8">
                    {/* Intro Text */}
                    <div className="space-y-4">
                        <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                            <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                                <Info size={16} className="text-indigo-400" />
                                Bestätigung erforderlich
                            </h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Um die Sicherheit auf unserer Plattform zu gewährleisten und den gesetzlichen Schutzbestimmungen für Minderjährige gerecht zu werden, benötigen wir eine einmalige Bestätigung durch einen Erziehungsberechtigten.
                            </p>
                        </div>

                        {!inviteLink && (
                            <p className="text-slate-300 text-sm leading-relaxed px-1">
                                Dein Konto ist aktuell noch eingeschränkt. Du kannst interessante Jobs entdecken, aber für eine Bewerbung müssen deine Eltern dein Profil freischalten. Dies dient deiner Absicherung.
                            </p>
                        )}
                    </div>

                    {/* Action Area */}
                    <div className="relative">
                        {inviteLink ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-5"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <h4 className="text-indigo-200 font-medium text-sm">Dein Bestätigungslink</h4>
                                        <p className="text-indigo-300/60 text-xs">Sende diesen Link an deine Eltern.</p>
                                    </div>
                                    <div className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                                        48h gültig
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <div className="relative flex-1 group">
                                        <div className="absolute inset-0 bg-indigo-500/5 rounded-xl blur-sm group-hover:bg-indigo-500/10 transition-colors" />
                                        <input
                                            type="text"
                                            readOnly
                                            value={inviteLink}
                                            className="relative w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-4 pr-10 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono"
                                        />
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-500">
                                            <ExternalLink size={14} />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleCopy}
                                        className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 flex items-center justify-center transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                                    >
                                        {copied ? <Check size={20} /> : <Copy size={20} />}
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col gap-3"
                            >
                                <div className="flex items-center gap-4 p-4 border border-dashed border-white/10 rounded-xl bg-white/5">
                                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                                        1
                                    </div>
                                    <div className="text-sm text-slate-400">
                                        Erstelle einen sicheren Einladungslink für deine Eltern.
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 border border-dashed border-white/10 rounded-xl bg-white/5 opacity-50">
                                    <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center text-slate-500 shrink-0">
                                        2
                                    </div>
                                    <div className="text-sm text-slate-500">
                                        Ein Elternteil bestätigt dein Konto & du kannst dich bewerben.
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 flex flex-col gap-3">
                        {!inviteLink ? (
                            <ButtonPrimary onClick={generateLink} className="w-full bg-indigo-600 hover:bg-indigo-500 border-none py-4 text-base shadow-indigo-500/20 hover:shadow-indigo-500/40">
                                Bestätigungslink jetzt erstellen
                            </ButtonPrimary>
                        ) : (
                            <ButtonPrimary onClick={() => setShowModal(false)} className="w-full bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 py-3">
                                Schließen
                            </ButtonPrimary>
                        )}

                        {!inviteLink && (
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-full py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
                            >
                                Abbrechen
                            </button>
                        )}
                    </div>
                </div>
            </Modal>
        </>
    );
}
