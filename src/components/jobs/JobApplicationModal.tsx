"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Send, Lock, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { ButtonPrimary } from "@/components/ui/ButtonPrimary";
import { applyToJob } from "@/app/app-home/jobs/actions";
import { GuardianConsentModal } from "@/components/GuardianConsentModal";
import { endPerfMark, startPerfMark } from "@/lib/perf";
import type { GuardianStatus } from "@/lib/types";

interface JobApplicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobTitle: string;
    jobId: string;
    canApply: boolean;
    guardianStatus: string;
    isWaitlistMode?: boolean;
}

export function JobApplicationModal({ isOpen, onClose, jobTitle, jobId, canApply, guardianStatus, isWaitlistMode }: JobApplicationModalProps) {
    const router = useRouter();
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [showGuardianModal, setShowGuardianModal] = useState(false);
    const [submissionOutcome, setSubmissionOutcome] = useState<{ isPrimary: boolean } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleClose = () => {
        if (loading) return;
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
        onClose();
        setSubmissionOutcome(null);
        setMessage("");
        setError(null);
    };

    useEffect(() => {
        if (!isOpen) return;
        const frameId = requestAnimationFrame(() => {
            endPerfMark("job-apply-open");
        });
        return () => cancelAnimationFrame(frameId);
    }, [isOpen]);

    useEffect(() => () => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!canApply) {
            setShowGuardianModal(true);
            return;
        }

        setLoading(true);
        setError(null);
        startPerfMark("job-apply-submit");

        const formData = new FormData();
        formData.append("message", message);
        formData.append("jobId", jobId);

        try {
            const result = await applyToJob(formData);
            endPerfMark("job-apply-submit");
            if (result.success) {
                setSubmissionOutcome({ isPrimary: result.isPrimary });
                router.refresh();
                closeTimerRef.current = setTimeout(handleClose, 2600);
            } else {
                setError(result.error || "Ein unbekannter Fehler ist aufgetreten.");
            }
        } catch {
            endPerfMark("job-apply-submit");
            setError("Die Bewerbung konnte nicht gespeichert werden. Bitte versuche es erneut.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Transition appear show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[60]" onClose={handleClose}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="job-application-backdrop fixed inset-0 bg-black/70 backdrop-blur-sm" />
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
                                <Dialog.Panel className="job-application-modal w-full max-w-md transform overflow-hidden rounded-3xl border p-6 text-left align-middle shadow-xl transition-all">
                                    <div className="absolute top-4 right-4">
                                        <button
                                            type="button"
                                            onClick={handleClose}
                                            disabled={loading}
                                            aria-label="Bewerbungsfenster schließen"
                                            className="job-application-close p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    {submissionOutcome ? (
                                        <div className="py-12 flex flex-col items-center text-center" role="status" aria-live="polite">
                                            <div className="job-application-success-mark mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                                                <CheckCircle2 size={32} aria-hidden="true" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2">
                                                {submissionOutcome.isPrimary ? "Bewerbung gesendet" : "Auf Warteliste eingetragen"}
                                            </h3>
                                            <p className="text-slate-400">
                                                {submissionOutcome.isPrimary
                                                    ? "Dein Gespräch ist jetzt geöffnet. Der Anbieter kann dir direkt antworten."
                                                    : "Deine Bewerbung ist sofort gespeichert und für den Anbieter sichtbar. Der Chat öffnet sich, sobald du nachrückst."}
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <Dialog.Title
                                                as="h3"
                                                className="text-xl font-bold leading-6 text-white mb-1"
                                            >
                                                {isWaitlistMode ? "Warteliste beitreten" : "Bewerbung schreiben"}
                                            </Dialog.Title>
                                            <p className="text-sm text-slate-400 mb-6">
                                                Für: <span className="text-indigo-400 font-medium">{jobTitle}</span>
                                            </p>

                                            {isWaitlistMode && (
                                                <div className="job-application-waitlist-note mb-6 flex items-start gap-3 rounded-xl border p-4">
                                                    <Clock className="job-application-waitlist-note-icon mt-0.5 shrink-0" size={18} aria-hidden="true" />
                                                    <div className="text-sm">
                                                        <h4 className="job-application-waitlist-note-title mb-1 font-semibold">So funktioniert die Warteliste</h4>
                                                        <p className="job-application-waitlist-note-copy">
                                                            Deine Bewerbung wird sofort gespeichert und ist für den Anbieter sichtbar. Der Chat öffnet sich, sobald du automatisch nachrückst.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

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
                                                {canApply && (
                                                    <div>
                                                        <label htmlFor="message" className="block text-sm font-medium text-slate-300 mb-2">
                                                            Deine Nachricht (Optional)
                                                        </label>
                                                        <textarea
                                                            id="message"
                                                            rows={5}
                                                            className="job-application-textarea w-full rounded-xl border p-3 placeholder-slate-500 focus:ring-1 transition-all text-sm resize-none"
                                                            placeholder="Hallo, ich habe Interesse an dem Job weil..."
                                                            value={message}
                                                            onChange={(e) => setMessage(e.target.value)}
                                                        />
                                                        <p className="mt-2 text-xs text-slate-500">
                                                            Stelle dich kurz vor und schreibe, warum du der/die Richtige für den Job bist.
                                                        </p>
                                                    </div>
                                                )}

                                                {error && (
                                                    <p className="text-sm text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                                                        {error}
                                                    </p>
                                                )}

                                                <div className="pt-2">
                                                    <ButtonPrimary
                                                        type="submit"
                                                        disabled={loading}
                                                        className="w-full flex items-center justify-center"
                                                        onClick={(e: any) => {
                                                            if (!canApply) {
                                                                e.preventDefault();
                                                                setShowGuardianModal(true);
                                                            }
                                                        }}
                                                    >
                                                        {loading ? "Wird gespeichert..." : (
                                                            <>
                                                                {canApply ? <Send size={16} className="mr-2" /> : <Lock size={16} className="mr-2" />}
                                                                {canApply ? (isWaitlistMode ? "Auf Warteliste setzen" : "Bewerbung abschicken") : "Bestätigung starten"}
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
                guardianStatus={guardianStatus as GuardianStatus}
            />
        </>
    );
}
