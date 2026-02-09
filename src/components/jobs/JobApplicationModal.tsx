"use client";

import { Fragment, useState } from "react";
import type { ReactNode } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Send, Lock, AlertTriangle } from "lucide-react";
import { ButtonPrimary } from "@/components/ui/ButtonPrimary";
import { applyToJob } from "@/app/app-home/jobs/actions";
import { GuardianConsentModal } from "@/components/GuardianConsentModal";

interface JobApplicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobTitle: string;
    jobId: string;
    canApply: boolean;
    guardianStatus: string;
}

export function JobApplicationModal({ isOpen, onClose, jobTitle, jobId, canApply, guardianStatus }: JobApplicationModalProps) {
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [showGuardianModal, setShowGuardianModal] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!canApply) {
            setShowGuardianModal(true);
            return;
        }

        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append("message", message);
        formData.append("jobId", jobId);

        const result = await applyToJob(formData);

        setLoading(false);

        if (result.success) {
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setMessage("");
            }, 2000);
        } else {
            setError(result.error || "Ein unbekannter Fehler ist aufgetreten.");
        }
    };

    return (
        <>
            <Transition appear show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[60]" onClose={onClose}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#121217] border border-white/10 p-6 text-left align-middle shadow-xl transition-all">
                                    <div className="absolute top-4 right-4">
                                        <button
                                            onClick={onClose}
                                            className="text-slate-400 hover:text-white transition-colors p-1"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    {success ? (
                                        <div className="py-12 flex flex-col items-center text-center">
                                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                                                <Send size={32} />
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2">Bewerbung gesendet!</h3>
                                            <p className="text-slate-400">Viel Erfolg! Der Anbieter wird sich bald bei dir melden.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Dialog.Title
                                                as="h3"
                                                className="text-xl font-bold leading-6 text-white mb-1"
                                            >
                                                Bewerbung schreiben
                                            </Dialog.Title>
                                            <p className="text-sm text-slate-400 mb-6">
                                                Für: <span className="text-indigo-400 font-medium">{jobTitle}</span>
                                            </p>

                                            {!canApply && (
                                                <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3 items-start">
                                                    <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                                                    <div className="text-sm">
                                                        <h4 className="font-semibold text-amber-100 mb-1">Bestätigung & Jugendschutz</h4>
                                                        <p className="text-amber-200/70">
                                                            Du benötigst die Bestätigung eines Erziehungsberechtigten, bevor du dich bewerben kannst.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <form onSubmit={handleSubmit} className="space-y-4">
                                                <div>
                                                    <label htmlFor="message" className="block text-sm font-medium text-slate-300 mb-2">
                                                        Deine Nachricht (Optional)
                                                    </label>
                                                    <textarea
                                                        id="message"
                                                        rows={5}
                                                        className="w-full rounded-xl bg-black/20 border border-white/10 p-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm resize-none"
                                                        placeholder="Hallo, ich habe Interesse an dem Job weil..."
                                                        value={message}
                                                        onChange={(e) => setMessage(e.target.value)}
                                                    />
                                                    <p className="mt-2 text-xs text-slate-500">
                                                        Stelle dich kurz vor und schreibe, warum du der/die Richtige für den Job bist.
                                                    </p>
                                                </div>

                                                {error && (
                                                    <p className="text-sm text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                                                        {error}
                                                    </p>
                                                )}

                                                <div className="pt-2">
                                                    <ButtonPrimary
                                                        type="submit"
                                                        disabled={loading}
                                                        className="w-full"
                                                        onClick={(e: any) => {
                                                            if (!canApply) {
                                                                e.preventDefault();
                                                                setShowGuardianModal(true);
                                                            }
                                                        }}
                                                    >
                                                        {loading ? "Wird gesendet..." : (
                                                            <>
                                                                {canApply ? <Send size={16} className="mr-2" /> : <Lock size={16} className="mr-2" />}
                                                                {canApply ? "Bewerbung abschicken" : "Bestätigung starten"}
                                                            </>
                                                        )}
                                                    </ButtonPrimary>
                                                </div>
                                            </form>
                                        </>
                                    )}
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            <GuardianConsentModal
                isOpen={showGuardianModal}
                onClose={() => setShowGuardianModal(false)}
            />
        </>
    );
}
