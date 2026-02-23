"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, MapPin, Euro, Calendar, Building2, ExternalLink, ShieldCheck } from "lucide-react";
import type { Database } from "@/lib/types/supabase";
import { ButtonPrimary } from "@/components/ui/ButtonPrimary";
import { JobApplicationModal } from "@/components/jobs/JobApplicationModal";

type JobRow = Database['public']['Tables']['jobs']['Row'] & {
    market_name?: string | null;
    public_location_label?: string | null;
    distance_km?: number | null;
    payment_type?: string | null;
};

import { JOB_CATEGORIES } from "@/lib/constants/jobCategories";
import { cn } from "@/lib/utils";

interface JobDetailSheetProps {
    job: JobRow | null;
    isOpen: boolean;
    onClose: () => void;
    canApply: boolean;
    guardianStatus: string; // 'none' | 'pending' | 'linked'
}

export function JobDetailSheet({ job, isOpen, onClose, canApply, guardianStatus }: JobDetailSheetProps) {
    const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);

    if (!job) return null;

    return (
        <>
            <Transition.Root show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={onClose}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-in-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in-out duration-300"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-hidden">
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-0 md:pl-10">
                                <Transition.Child
                                    as={Fragment}
                                    enter="transform transition ease-in-out duration-300 sm:duration-500"
                                    enterFrom="translate-x-full"
                                    enterTo="translate-x-0"
                                    leave="transform transition ease-in-out duration-300 sm:duration-500"
                                    leaveFrom="translate-x-0"
                                    leaveTo="translate-x-full"
                                >
                                    <Dialog.Panel className="pointer-events-auto w-screen max-w-2xl">
                                        <div className="flex h-full flex-col overflow-y-scroll bg-[#0A0A0F] shadow-2xl border-l border-white/10 no-scrollbar">
                                            {/* Header */}
                                            <div className="relative px-6 py-6 sm:px-10 bg-[#121217] border-b border-white/5">
                                                <div className="absolute top-0 right-0 pt-6 pr-6 block">
                                                    <button
                                                        type="button"
                                                        className="rounded-full bg-white/5 p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                                        onClick={onClose}
                                                    >
                                                        <span className="sr-only">Close panel</span>
                                                        <X className="h-5 w-5" aria-hidden="true" />
                                                    </button>
                                                </div>
                                                <div className="pr-12">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        {(() => {
                                                            const categoryData = job.category ? JOB_CATEGORIES.find(c => c.id === job.category) : undefined;
                                                            const CategoryIcon = categoryData?.icon;
                                                            const categoryLabel = categoryData?.label || job.category || "Allgemein";
                                                            return (
                                                                <span className={cn(
                                                                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all duration-300",
                                                                    job.status === 'reserved'
                                                                        ? "bg-amber-500/10 text-amber-300 border border-amber-500/20 shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]"
                                                                        : "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-[0_0_15px_-3px_rgba(99,102,241,0.2)]"
                                                                )}>
                                                                    {CategoryIcon && <CategoryIcon size={14} className={cn(job.status === 'reserved' ? "text-amber-400" : "text-indigo-400")} />}
                                                                    {categoryLabel}
                                                                </span>
                                                            );
                                                        })()}
                                                        {job.market_name && (
                                                            <span className="inline-flex items-center rounded-md bg-purple-400/10 px-2 py-1 text-xs font-medium text-purple-400 ring-1 ring-inset ring-purple-400/20">
                                                                {job.market_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <Dialog.Title className="text-2xl font-bold text-white leading-tight">
                                                        {job.title}
                                                    </Dialog.Title>
                                                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">
                                                        <div className="flex items-center gap-1.5">
                                                            <MapPin size={16} className="text-blue-400" />
                                                            {job.public_location_label || "Rheinbach"}
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Euro size={16} className="text-emerald-400" />
                                                            {job.wage_hourly} € {job.payment_type === 'fixed' ? 'pauschal' : '/ Std.'}
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar size={16} className="text-amber-400" />
                                                            Ab sofort
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="px-6 py-8 sm:px-10 space-y-8 flex-1">
                                                <section>
                                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Beschreibung</h3>
                                                    <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed whitespace-pre-line">
                                                        {job.description}
                                                    </div>
                                                </section>

                                                <section>
                                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Standort</h3>
                                                    <div className="rounded-xl border border-white/10 bg-[#121217] p-1 overflow-hidden h-48 relative flex items-center justify-center text-slate-500 bg-[url('/grid.svg')]">
                                                        <div className="text-center p-4">
                                                            <MapPin size={32} className="mx-auto mb-2 text-indigo-500 opacity-50" />
                                                            <p className="text-sm">Genaue Adresse wird nach Bewerbung freigegeben.</p>
                                                        </div>
                                                    </div>
                                                </section>

                                                <section className="rounded-xl border border-white/10 bg-indigo-500/5 p-5">
                                                    <div className="flex items-start gap-4">
                                                        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 shrink-0">
                                                            <ShieldCheck size={24} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-white mb-1">Sicherer Job</h4>
                                                            <p className="text-sm text-slate-400">
                                                                Dieser Job wurde geprüft. Vergiss nicht, deine Eltern zu informieren, wenn du den Job annimmst.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </section>
                                            </div>

                                            {/* Footer Actions */}
                                            <div className="sticky bottom-0 border-t border-white/10 bg-[#121217]/90 p-6 backdrop-blur-xl sm:px-10">
                                                <ButtonPrimary
                                                    onClick={() => setIsApplicationModalOpen(true)}
                                                    className="w-full text-base py-6"
                                                >
                                                    Jetzt bewerben
                                                </ButtonPrimary>
                                                <p className="text-center text-xs text-slate-500 mt-3">
                                                    Mit deiner Bewerbung akzeptierst du unsere Nutzungsbedingungen.
                                                </p>
                                            </div>
                                        </div>
                                    </Dialog.Panel>
                                </Transition.Child>
                            </div>
                        </div>
                    </div>
                </Dialog>
            </Transition.Root>

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
