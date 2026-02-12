"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, MapPin, Calendar, Award, Briefcase, Star, ShieldCheck, Mail, Phone, ExternalLink } from "lucide-react";
import { Profile } from "@/lib/types";

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: Profile | null;
    stats?: {
        jobsCompleted: number;
        rating: number;
    };
    isStaff?: boolean;
}

export function UserProfileModal({ isOpen, onClose, profile, stats = { jobsCompleted: 0, rating: 5.0 }, isStaff = false }: UserProfileModalProps) {
    if (!profile) return null;

    // Helper to generate initials
    const getInitials = (name: string | null) => {
        return name
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase() || "??";
    };

    // Helper for age
    const getAge = (birthdate: string | null) => {
        if (!birthdate) return null;
        const today = new Date();
        const birthDate = new Date(birthdate);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    // Logic for Staff/Provider
    const isJobProvider = profile.account_type === "job_provider" || profile.user_type === "job_provider";
    // isStaff passed via props now

    const age = getAge(profile.birthdate);

    return (
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
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md" />
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
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-3xl bg-[#09090b] border border-white/10 text-left align-middle shadow-2xl transition-all relative">
                                {/* Header / Cover */}
                                <div className="h-40 relative overflow-hidden bg-[#0f0f12]">
                                    {/* Branding Background */}
                                    <div className="absolute inset-0 opacity-40">
                                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/40 to-[#09090b]" />
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none">
                                        <span className="text-7xl font-black text-white tracking-tighter select-none">JobBridge</span>
                                    </div>
                                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

                                    <button
                                        onClick={onClose}
                                        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white/80 hover:text-white transition-colors backdrop-blur-md"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="px-5 pb-6 md:px-8 md:pb-8">
                                    {/* Avatar & Main Info */}
                                    <div className="relative -mt-12 md:-mt-16 mb-6 flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-6">
                                        <div className="relative group">
                                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#09090b] shadow-2xl bg-[#1a1a20] flex items-center justify-center relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 group-hover:opacity-100 transition-opacity" />
                                                {profile.avatar_url ? (
                                                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-4xl font-bold text-white relative z-10">
                                                        {getInitials(profile.full_name)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Staff Badge */}
                                            {isStaff && (
                                                <div className="absolute -bottom-2 -right-2 z-20 group/badge" title="Offizieller JobBridge Mitarbeiter">
                                                    <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-[#15151A] border border-indigo-500/50 shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                                                        <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-pulse" />
                                                        <ShieldCheck size={16} className="text-indigo-400 relative z-10" />

                                                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 rounded-lg bg-[#0F0F12] border border-white/10 text-[10px] font-bold text-indigo-200 whitespace-nowrap opacity-0 group-hover/badge:opacity-100 transition-opacity pointer-events-none shadow-xl">
                                                            JobBridge Team
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Verified Provider Badge */}
                                            {!isStaff && profile.provider_verification_status === 'verified' && (
                                                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-2 rounded-full border-4 border-[#09090b] shadow-lg z-20" title="Verifiziert">
                                                    <ShieldCheck size={16} className="fill-white text-emerald-500" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 pt-2 md:pt-0">
                                            <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
                                                {profile.full_name || "Unbekannt"}
                                            </h2>

                                            {/* Role Badge */}
                                            <div className="mb-2">
                                                {isJobProvider ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase">
                                                        {profile.company_name ? "JOBANBIETER (ORG)" : "JOBANBIETER (PRIVAT)"}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700/50 text-slate-300 border border-white/10">
                                                        JOBSUCHEND
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
                                                {profile.city && (
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin size={14} className="text-indigo-400" />
                                                        {profile.city}
                                                    </div>
                                                )}
                                                {/* Hide Age for Providers if desired, but keeping generally for now unless asked to remove. Removing "Jobs absolviert" for providers. */}
                                                {!isJobProvider && age !== null && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar size={14} className="text-purple-400" />
                                                        {age} Jahre
                                                    </div>
                                                )}
                                                {!isJobProvider && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Briefcase size={14} className="text-emerald-400" />
                                                        {stats.jobsCompleted} Jobs absolviert
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bio */}
                                    <div className="mb-8">
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <span className="w-1 h-4 bg-indigo-500 rounded-full" />
                                            {isJobProvider ? "Über uns / Beschreibung" : "Über mich"}
                                        </h3>
                                        <div className="bg-white/5 rounded-2xl p-6 border border-white/5 leading-relaxed text-slate-300 text-sm">
                                            {profile.bio ? (
                                                <p>{profile.bio}</p>
                                            ) : (
                                                <p className="italic text-slate-500">Keine Beschreibung vorhanden.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Skills & Interests Grid - SEEKER ONLY */}
                                    {!isJobProvider && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                            {/* Skills */}
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                    <Briefcase size={16} /> Fähigkeiten
                                                </h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {profile.skills ? (
                                                        profile.skills.split(',').map((skill, i) => (
                                                            <span key={i} className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 text-xs font-medium border border-indigo-500/20">
                                                                {skill.trim()}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-sm text-slate-500 italic">Keine angegeben</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Interests */}
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                    <Award size={16} /> Interessen
                                                </h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {profile.interests ? (
                                                        profile.interests.split(',').map((interest, i) => (
                                                            <span key={i} className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-300 text-xs font-medium border border-purple-500/20">
                                                                {interest.trim()}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-sm text-slate-500 italic">Keine angegeben</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Footer / Meta */}
                                    <div className="pt-6 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
                                        <div>
                                            Mitglied seit {new Date(profile.created_at || new Date()).toLocaleDateString()}
                                        </div>
                                        {profile.id === "current_user_id_placeholder" && ( // Logic to be handled by parent if needed
                                            <button className="flex items-center gap-1.5 hover:text-white transition-colors">
                                                <ExternalLink size={12} /> Profil bearbeiten
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}

// ----------------------------------------------------------------------

interface UserProfileCardProps {
    profile: Profile | null | undefined;
    onClick?: (e?: React.MouseEvent) => void;
    compact?: boolean;
}

export function UserProfileCard({ profile, onClick, compact = false }: UserProfileCardProps) {
    if (!profile) return (
        <div className="h-12 w-full bg-white/5 rounded-xl animate-pulse" />
    );

    const getInitials = (name: string | null) => {
        return name
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase() || "??";
    };

    return (
        <div
            onClick={onClick}
            className={`group flex items-center gap-3 ${onClick ? 'cursor-pointer' : ''}`}
        >
            <div className={`
                ${compact ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'}
                rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg ring-2 ring-transparent group-hover:ring-indigo-500/50 transition-all overflow-hidden
            `}>
                {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                    getInitials(profile.full_name)
                )}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className={`font-semibold text-white truncate ${compact ? 'text-xs' : 'text-sm'} group-hover:text-indigo-400 transition-colors`}>
                    {profile.full_name || "Unbekannt"}
                </h4>
                {!compact && (
                    <p className="text-xs text-slate-500 truncate">
                        {profile.city || "Kein Ort"}
                        {profile.birthdate && (() => {
                            const today = new Date();
                            const birthDate = new Date(profile.birthdate);
                            let age = today.getFullYear() - birthDate.getFullYear();
                            const m = today.getMonth() - birthDate.getMonth();
                            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                                age--;
                            }
                            return ` • ${age} Jahre`;
                        })()}
                    </p>
                )}
            </div>
        </div>
    );
}
