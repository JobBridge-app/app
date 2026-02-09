"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, MapPin, Euro, Calendar, ShieldCheck, Clock, Building2, Briefcase, ArrowRight, CheckCircle2 } from "lucide-react";
import type { Database } from "@/lib/types/supabase";
import { ButtonPrimary } from "@/components/ui/ButtonPrimary";
import { JobApplicationModal } from "@/components/jobs/JobApplicationModal";

type JobRow = Database['public']['Tables']['jobs']['Row'] & {
    market_name?: string | null;
    public_location_label?: string | null;
    distance_km?: number | null;
};

interface JobDetailModalProps {
    job: JobRow | null;
    isOpen: boolean;
    onClose: () => void;
    canApply: boolean;
    guardianStatus: string;
}

export function JobDetailModal({ job, isOpen, onClose, canApply, guardianStatus }: JobDetailModalProps) {
    const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);

    if (!job) return null;

    return (
        <>
            <Transition appear show={isOpen} as={Fragment}>
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
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                                            {/* Trust Section */}
                                            <div className="space-y-4">
                                                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                                    <ShieldCheck size={16} /> Sicherheit
                                                </h4>
                                                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
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
                                            <div className="space-y-4">
                                                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                                    <MapPin size={16} /> Standort
                                                </h4>
                                                <div className="rounded-2xl border border-white/5 bg-[#121217] p-1 h-32 relative flex items-center justify-center overflow-hidden group">
                                                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-30 group-hover:opacity-50 transition-opacity" />
                                                    <div className="text-center relative z-10">
                                                        <MapPin size={24} className="mx-auto mb-2 text-indigo-500" />
                                                        <span className="text-xs text-slate-500 uppercase tracking-widest font-medium">Ungefähre Lage</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Footer */}
                                    <div className="bg-[#111116] px-8 py-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="text-center md:text-left">
                                            <p className="text-sm text-slate-400">
                                                Interesse geweckt?
                                            </p>
                                            <p className="text-xs text-slate-600 mt-0.5">
                                                Mit der Bewerbung akzeptierst du die Nutzungsbedingungen.
                                            </p>
                                        </div>
                                        <ButtonPrimary
                                            onClick={() => setIsApplicationModalOpen(true)}
                                            className="w-full md:w-auto px-10 py-4 text-lg shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02] transition-all"
                                        >
                                            <span className="flex items-center gap-3 font-bold">
                                                Jetzt bewerben <ArrowRight size={20} />
                                            </span>
                                        </ButtonPrimary>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            <JobApplicationModal
                isOpen={isApplicationModalOpen}
                onClose={() => setIsApplicationModalOpen(false)}
                jobTitle={job.title}
                jobId={job.id}
                canApply={canApply}
                guardianStatus={guardianStatus}
            />
        </>
    );
}
