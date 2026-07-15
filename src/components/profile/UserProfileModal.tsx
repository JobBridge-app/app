"use client";

import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import {
    BriefcaseBusiness,
    Building2,
    CalendarDays,
    MapPin,
    ShieldCheck,
    UserRound,
    X,
} from "lucide-react";
import { Fragment, type MouseEvent } from "react";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

export type VisibleProfile = Omit<Partial<Profile>, "country"> & {
    id: string;
    full_name?: string | null;
    country?: string | null;
    age_years?: number | null;
    is_staff?: boolean | null;
};

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: VisibleProfile | null;
    isStaff?: boolean;
    stats?: {
        jobsCompleted: number;
        rating: number;
    };
}

function getInitials(value: string | null | undefined) {
    return (value ?? "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "JB";
}

function getAge(profile: VisibleProfile) {
    if (typeof profile.age_years === "number" && profile.age_years >= 0) return profile.age_years;
    if (!profile.birthdate) return null;

    const birthdate = new Date(profile.birthdate);
    if (Number.isNaN(birthdate.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - birthdate.getFullYear();
    const monthDifference = now.getMonth() - birthdate.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && now.getDate() < birthdate.getDate())) age -= 1;
    return age >= 0 ? age : null;
}

function splitTags(value: string | null | undefined) {
    return (value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function formatMemberSince(value: string | null | undefined) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(date);
}

export function UserProfileModal({ isOpen, onClose, profile, isStaff = false }: UserProfileModalProps) {
    if (!profile) return null;

    const isProvider = profile.account_type === "job_provider" || profile.user_type === "job_provider";
    const displayName = isProvider
        ? profile.company_name || profile.full_name || "Auftraggeber"
        : profile.full_name || "Jobsuchend";
    const personName = isProvider && profile.company_name && profile.full_name
        ? profile.full_name
        : null;
    const age = !isProvider ? getAge(profile) : null;
    const memberSince = formatMemberSince(profile.created_at);
    const skills = splitTags(profile.skills);
    const interests = splitTags(profile.interests);
    const showStaffBadge = isStaff || profile.is_staff === true;

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[70]" onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-150 motion-reduce:duration-0"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-120 motion-reduce:duration-0"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-950/60" aria-hidden="true" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto p-3 sm:p-5">
                    <div className="flex min-h-full items-center justify-center">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-180 motion-reduce:duration-0"
                            enterFrom="translate-y-2 opacity-0 scale-[0.985]"
                            enterTo="translate-y-0 opacity-100 scale-100"
                            leave="ease-in duration-120 motion-reduce:duration-0"
                            leaveFrom="translate-y-0 opacity-100 scale-100"
                            leaveTo="translate-y-1 opacity-0 scale-[0.99]"
                        >
                            <DialogPanel className="w-full max-w-[39rem] overflow-hidden rounded-3xl bg-[var(--surface-solid)] text-left shadow-[0_24px_80px_rgba(2,6,23,0.3)] ring-1 ring-[var(--border-subtle)]">
                                <div className="flex items-start gap-4 border-b border-[var(--border-subtle)] px-5 py-5 sm:px-6">
                                    <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--surface-muted)] text-lg font-semibold text-[var(--text-strong)] ring-1 ring-[var(--border-subtle)] sm:size-[4.5rem]">
                                        {profile.avatar_url ? (
                                            <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                                        ) : getInitials(displayName)}
                                    </span>

                                    <div className="min-w-0 flex-1 pt-0.5">
                                        <DialogTitle className="text-balance text-xl font-semibold tracking-[-0.02em] text-[var(--text-strong)] sm:text-2xl">
                                            {displayName}
                                        </DialogTitle>
                                        {personName ? (
                                            <p className="mt-0.5 truncate text-sm text-[var(--text-muted)]">{personName}</p>
                                        ) : null}
                                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                            <span className="inline-flex min-h-7 items-center gap-1.5 rounded-lg bg-[var(--surface-muted)] px-2.5 text-xs font-semibold text-[var(--text-default)] ring-1 ring-[var(--border-subtle)]">
                                                {isProvider ? <Building2 aria-hidden="true" size={13} /> : <UserRound aria-hidden="true" size={13} />}
                                                {isProvider ? "Jobanbieter" : "Jobsuchend"}
                                            </span>
                                            {showStaffBadge ? (
                                                <span className="inline-flex min-h-7 items-center gap-1.5 rounded-lg bg-[color-mix(in_srgb,var(--brand)_9%,var(--surface-muted))] px-2.5 text-xs font-semibold text-[var(--brand)] ring-1 ring-[color-mix(in_srgb,var(--brand)_28%,var(--border-subtle))]">
                                                    <ShieldCheck aria-hidden="true" size={13} /> Offizielles Team
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="-mr-1 -mt-1 inline-grid size-11 shrink-0 place-items-center rounded-xl text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--surface-muted)] hover:text-[var(--text-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                                        aria-label="Profil schließen"
                                    >
                                        <X aria-hidden="true" size={20} />
                                    </button>
                                </div>

                                <div className="max-h-[min(70vh,42rem)] overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
                                    {(profile.city || profile.country || age !== null || memberSince) ? (
                                        <dl className="mb-6 grid gap-2 sm:grid-cols-2">
                                            {(profile.city || profile.country) ? (
                                                <ProfileFact icon={<MapPin aria-hidden="true" size={16} />} label="Ort">
                                                    {[profile.city, profile.country].filter(Boolean).join(", ")}
                                                </ProfileFact>
                                            ) : null}
                                            {age !== null ? (
                                                <ProfileFact icon={<CalendarDays aria-hidden="true" size={16} />} label="Alter">
                                                    {age} Jahre
                                                </ProfileFact>
                                            ) : null}
                                            {memberSince ? (
                                                <ProfileFact icon={<BriefcaseBusiness aria-hidden="true" size={16} />} label="Dabei seit">
                                                    {memberSince}
                                                </ProfileFact>
                                            ) : null}
                                        </dl>
                                    ) : null}

                                    <section aria-labelledby="profile-about-title">
                                        <h3 id="profile-about-title" className="text-sm font-semibold text-[var(--text-strong)]">
                                            {isProvider ? "Über den Anbieter" : "Über die Person"}
                                        </h3>
                                        <div className="mt-2.5 rounded-2xl bg-[var(--surface-muted)] px-4 py-3.5 text-pretty text-sm leading-6 text-[var(--text-default)] ring-1 ring-[var(--border-subtle)]">
                                            {profile.bio?.trim() || "Noch keine Beschreibung hinterlegt."}
                                        </div>
                                    </section>

                                    {!isProvider && (skills.length > 0 || interests.length > 0) ? (
                                        <div className="mt-6 grid gap-5 sm:grid-cols-2">
                                            {skills.length > 0 ? <ProfileTags title="Fähigkeiten" values={skills} /> : null}
                                            {interests.length > 0 ? <ProfileTags title="Interessen" values={interests} /> : null}
                                        </div>
                                    ) : null}
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}

function ProfileFact({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
    return (
        <div className="grid min-h-14 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl bg-[var(--surface-muted)] px-3.5 py-2.5 ring-1 ring-[var(--border-subtle)]">
            <span className="text-[var(--text-muted)]">{icon}</span>
            <div className="min-w-0">
                <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">{label}</dt>
                <dd className="mt-0.5 truncate text-sm font-medium text-[var(--text-strong)]">{children}</dd>
            </div>
        </div>
    );
}

function ProfileTags({ title, values }: { title: string; values: string[] }) {
    return (
        <section>
            <h3 className="text-sm font-semibold text-[var(--text-strong)]">{title}</h3>
            <div className="mt-2.5 flex flex-wrap gap-2">
                {values.map((value) => (
                    <span key={value} className="rounded-lg bg-[var(--surface-muted)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-default)] ring-1 ring-[var(--border-subtle)]">
                        {value}
                    </span>
                ))}
            </div>
        </section>
    );
}

interface UserProfileCardProps {
    profile: VisibleProfile | null | undefined;
    onClick?: (event?: MouseEvent) => void;
    compact?: boolean;
}

export function UserProfileCard({ profile, onClick, compact = false }: UserProfileCardProps) {
    if (!profile) {
        return <div className="h-12 w-full animate-pulse rounded-xl bg-[var(--surface-muted)]" />;
    }

    const displayName = profile.company_name || profile.full_name || "Unbekannt";
    const age = getAge(profile);
    const body = (
        <>
            <span className={cn(
                "flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--surface-muted)] font-semibold text-[var(--text-strong)] ring-1 ring-[var(--border-subtle)]",
                compact ? "size-9 text-xs" : "size-11 text-sm",
            )}>
                {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                    : getInitials(displayName)}
            </span>
            <span className="min-w-0 flex-1 text-left">
                <strong className={cn("block truncate font-semibold text-[var(--text-strong)]", compact ? "text-xs" : "text-sm")}>{displayName}</strong>
                {!compact ? (
                    <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">
                        {[profile.city, age !== null ? `${age} Jahre` : null].filter(Boolean).join(" · ") || "Profil ansehen"}
                    </span>
                ) : null}
            </span>
        </>
    );

    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl text-left outline-none transition-colors duration-150 hover:bg-[var(--surface-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
            >
                {body}
            </button>
        );
    }

    return <div className="flex min-h-11 items-center gap-3">{body}</div>;
}
