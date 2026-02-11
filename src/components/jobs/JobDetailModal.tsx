"use client";

import { Fragment, useState, memo, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, MapPin, Euro, Calendar, ShieldCheck, Clock, Building2, Briefcase, ArrowRight, CheckCircle2, MessageSquare } from "lucide-react";
import type { Database } from "@/lib/types/supabase";
import { ButtonPrimary } from "@/components/ui/ButtonPrimary";
import { VerificationRequiredModal } from "@/components/auth/VerificationRequiredModal";
import { Lock } from "lucide-react";
import { JobApplicationModal } from "@/components/jobs/JobApplicationModal";
import { WithdrawButton } from "@/components/jobs/WithdrawButton";
import dynamic from "next/dynamic";
import { JobsListItem } from "@/lib/types/jobbridge";

const LeafletMap = dynamic(() => import("@/components/ui/LeafletMap"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-[#121217] animate-pulse flex items-center justify-center text-slate-700">
            <MapPin size={24} />
        </div>
    ),
});

interface JobDetailModalProps {
    job: JobsListItem | null;
    isOpen: boolean;
    onClose: () => void;
    onClosed?: () => void;
    canApply: boolean;
    guardianStatus: string;
    context?: 'feed' | 'activity';
}
export const JobDetailModal = memo(function JobDetailModal({ job, isOpen, onClose, onClosed, canApply, guardianStatus, context = 'feed' }: JobDetailModalProps) {
    // ... component implementation ...
    const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
    const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

    // Failsafe: Ensure overflow is cleaned up if Headless UI gets stuck
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        return () => {
            // Small timeout to allow Headless UI to finish if it's behaving, otherwise force it.
            setTimeout(() => {
                document.documentElement.style.removeProperty('overflow');
                document.body.style.removeProperty('overflow');
                document.body.style.removeProperty('padding-right');
            }, 50);
        };
    }, []);

    // Delayed Unmount for Map to prevent "Close Freeze"
    const [shouldRenderMap, setShouldRenderMap] = useState(false);
    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (isOpen) {
            setShouldRenderMap(true);
        } else {
            // Wait for close animation + user scroll start before destroying map (500ms)
            timeout = setTimeout(() => {
                setShouldRenderMap(false);
            }, 500);
        }
        return () => clearTimeout(timeout);
    }, [isOpen]);

    // If no job is selected and we are not open, don't render.
    // However, if we are open (animating out), we might still have job=null if handled poorly, 
    // so we rely on parent to keep job populated until onClosed.
    if (!job) return null;

    return (
        <>
            <Transition appear show={isOpen} as={Fragment} afterLeave={onClosed}>
                <Dialog as="div" className="relative z-50" onClose={onClose}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95 translate-y-4"
                                enterTo="opacity-100 scale-100 translate-y-0"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100 translate-y-0"
                                leaveTo="opacity-0 scale-95 translate-y-4"
                            >
                                <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-3xl bg-[#09090b] border border-white/10 text-left align-middle shadow-2xl transition-all">
                                    {/* Detailed Header with Background Pattern */}
                                    <div className="relative overflow-hidden bg-[#111116] px-8 py-10 border-b border-white/5">
                                        <div className="absolute top-0 right-0 p-6 z-20">
                                            <button
                                                type="button"
                                                className="rounded-full bg-white/5 p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-colors backdrop-blur-md"
                                                onClick={onClose}
                                            >
                                                <X className="h-6 w-6" />
                                            </button>
                                        </div>

                                        {/* Background Decoration */}
                                        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

                                        <div className="relative z-10 flex flex-col gap-6">
                                            <div className="flex gap-3">
                                                {job.is_applied && (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                                                        <CheckCircle2 size={12} /> Bereits beworben
                                                    </span>
                                                )}
                                                {job.category && (
                                                    <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400 border border-indigo-500/20">
                                                        {job.category}
                                                    </span>
                                                )}
                                                {job.market_name && (
                                                    <span className="inline-flex items-center rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400 border border-purple-500/20">
                                                        {job.market_name}
                                                    </span>
                                                )}
                                            </div>

                                            <Dialog.Title as="h3" className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
                                                {job.title}
                                            </Dialog.Title>

                                            <div className="flex flex-wrap items-center gap-6 text-slate-300 font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-400">
                                                        <Euro size={18} />
                                                    </div>
                                                    <span className="text-lg text-white">{job.wage_hourly} € <span className="text-slate-500 text-sm">/ Std.</span></span>
                                                </div>
                                                <div className="w-px h-8 bg-white/10 hidden sm:block" />
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-full bg-blue-500/10 text-blue-400">
                                                        <MapPin size={18} />
                                                    </div>
                                                    <span>{job.public_location_label || "Rheinbach"}</span>
                                                </div>
                                                {job.creator && (
                                                    <>
                                                        <div className="w-px h-8 bg-white/10 hidden sm:block" />
                                                        <a href={`/app-home/profile/view/${job.posted_by}`} className="flex items-center gap-2 group hover:bg-white/5 p-1 rounded-lg transition-colors">
                                                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400 ring-2 ring-indigo-500/20 group-hover:ring-indigo-500/40 transition-all">
                                                                {(job.creator.company_name || job.creator.full_name || "?")[0].toUpperCase()}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Erstellt von</span>
                                                                <span className="text-sm text-white group-hover:text-indigo-300 transition-colors">{job.creator.company_name || job.creator.full_name || "Unbekannt"}</span>
                                                            </div>
                                                        </a>
                                                    </>
                                                )}
                                                {job.distance_km != null && (
                                                    <div className="flex items-center gap-2 text-slate-500">
                                                        <Clock size={16} />
                                                        <span>{Math.round(job.distance_km * 10) / 10} km</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Main Content Area */}
                                    <div className="px-8 py-10 space-y-10 bg-[#09090b]">

                                        {/* Description */}
                                        <section>
                                            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                                                <Briefcase size={16} /> Aufgabe
                                            </h4>
                                            <div className="prose prose-invert prose-lg max-w-none text-slate-300 leading-relaxed whitespace-pre-line font-light">
                                                {job.description}
                                            </div>
                                        </section>

                                        <div className="h-px bg-white/5" />

                                        {/* Grid Layout for Details & Trust */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">

                                            {/* Trust Section */}
                                            <div className="space-y-4 flex flex-col">
                                                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                                    <ShieldCheck size={16} /> Sicherheit
                                                </h4>
                                                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 flex-1 flex flex-col justify-center">
                                                    <div className="flex items-start gap-4">
                                                        <div className="mt-1 p-2 bg-green-500/10 rounded-full text-green-400 shrink-0">
                                                            <CheckCircle2 size={20} />
                                                        </div>
                                                        <div>
                                                            <h5 className="font-semibold text-white text-lg">Geprüfter Job</h5>
                                                            <p className="text-slate-400 mt-1 leading-relaxed text-sm">
                                                                Dieser Job wurde vom JobBridge-Team geprüft und freigegeben.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Location / Map Placeholder */}
                                            <div className="space-y-4 flex flex-col">
                                                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                                    <MapPin size={16} /> Standort
                                                </h4>
                                                <div className="rounded-2xl border border-white/5 bg-[#121217] p-1 flex-1 min-h-[160px] relative flex items-center justify-center overflow-hidden group">
                                                    {shouldRenderMap && (
                                                        <LeafletMap
                                                            center={[50.6256, 6.9493]}
                                                            zoom={14}
                                                            className={`rounded-xl transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                                                        />
                                                    )}

                                                    {/* Overlay for "Approximate Location" text style if desired, or relying on map visual */}
                                                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10 z-[400]">
                                                        <span className="text-[10px] text-slate-300 uppercase tracking-widest font-medium">Ungefähre Lage</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Footer */}
                                    <div className="bg-[#111116] px-8 py-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                                        {job.is_applied ? (
                                            ['submitted', 'waitlisted', 'negotiating', 'accepted'].includes(job.application_status || '') ? (
                                                <div className="w-full flex flex-col items-end gap-2">
                                                    <div className="w-full">
                                                        <a
                                                            href="/app-home/activities"
                                                            className="group relative w-full overflow-hidden rounded-2xl p-[1px] transition-all hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 block"
                                                        >
                                                            {/* Gradient Border Animation */}
                                                            <span className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#4f46e5_0%,#0f172a_50%,#4f46e5_100%)] opacity-70 group-hover:opacity-100 transition-opacity" />

                                                            {/* Card Content */}
                                                            <span className="relative flex h-full w-full flex-col justify-between rounded-2xl bg-[#0f1115] p-5">


                                                                <div className="flex items-center justify-between gap-4 mt-2">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                                                                            Zum Dashboard
                                                                        </span>
                                                                        <span className="text-xs text-slate-400">
                                                                            Chat, Details & Optionen
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 transition-transform duration-300 group-hover:translate-x-1 group-hover:bg-indigo-500">
                                                                        <ArrowRight size={20} />
                                                                    </div>
                                                                </div>
                                                            </span>
                                                        </a>
                                                    </div>
                                                    {context !== 'feed' && <div className="text-right w-full"><WithdrawButton applicationId={job.application_id!} /></div>}
                                                </div>
                                            ) : (
                                                <div className="w-full px-6 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 font-medium flex items-center justify-center gap-2">
                                                    <Briefcase size={20} />
                                                    {job.application_status === 'withdrawn' ? "Zurückgezogen" : "Abgeschlossen"}
                                                </div>
                                            )
                                        ) : (
                                            <>
                                                <div className="text-center md:text-left">
                                                    <p className="text-sm text-slate-400">
                                                        Interesse geweckt?
                                                    </p>
                                                    <p className="text-xs text-slate-600 mt-0.5">
                                                        Mit der Bewerbung akzeptierst du die Nutzungsbedingungen.
                                                    </p>
                                                </div>
                                                {/* Button Logic for Non-Applied Jobs */}
                                                {!canApply ? (
                                                    <ButtonPrimary
                                                        onClick={() => setIsVerificationModalOpen(true)}
                                                        className="w-full md:w-auto px-10 py-4 text-lg shadow-xl shadow-slate-900/20 hover:shadow-slate-800/30 hover:scale-[1.02] transition-all bg-slate-800 hover:bg-slate-700 text-slate-200 border-white/10"
                                                    >
                                                        <span className="flex items-center gap-3 font-bold">
                                                            <Lock size={20} /> Freischalten
                                                        </span>
                                                    </ButtonPrimary>
                                                ) : (
                                                    <ButtonPrimary
                                                        onClick={() => setIsApplicationModalOpen(true)}
                                                        className="w-full md:w-auto px-10 py-4 text-lg shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02] transition-all"
                                                    >
                                                        <span className="flex items-center gap-3 font-bold">
                                                            Jetzt bewerben <ArrowRight size={20} />
                                                        </span>
                                                    </ButtonPrimary>
                                                )}
                                            </>
                                        )}
                                    </div>


                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition >

            <JobApplicationModal
                isOpen={isApplicationModalOpen}
                onClose={() => setIsApplicationModalOpen(false)}
                jobTitle={job.title}
                jobId={job.id}
                canApply={canApply}
                guardianStatus={guardianStatus}
            />

            <VerificationRequiredModal
                isOpen={isVerificationModalOpen}
                onClose={() => setIsVerificationModalOpen(false)}
            />
        </>
    );
});
