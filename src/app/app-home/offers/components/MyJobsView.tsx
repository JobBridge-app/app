"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
    ArrowRight,
    BriefcaseBusiness,
    Clock,
    Edit3,
    Euro,
    FileText,
    Globe2,
    MapPin,
    MessageSquare,
    Plus,
    ShieldCheck,
} from "lucide-react";
import type { JobsListItem } from "@/lib/types/jobbridge";
import { cn, timeAgo } from "@/lib/utils";
import { JOB_CATEGORIES } from "@/lib/constants/jobCategories";

export type ProviderJobApplicationSummary = {
    total: number;
    attention: number;
    submitted: number;
    latestAt: string | null;
};

type ProviderTab = "active" | "archive";

const STATUS_META: Record<string, { label: string; dot: string; tone: string; border: string }> = {
    open: { label: "Aktiv", dot: "bg-emerald-400", tone: "text-emerald-300", border: "border-emerald-400/20 bg-emerald-400/10" },
    reviewing: { label: "In Prüfung", dot: "bg-violet-400", tone: "text-violet-300", border: "border-violet-400/20 bg-violet-400/10" },
    reserved: { label: "Reserviert", dot: "bg-amber-400", tone: "text-amber-300", border: "border-amber-400/20 bg-amber-400/10" },
    filled: { label: "Vergeben", dot: "bg-blue-400", tone: "text-blue-300", border: "border-blue-400/20 bg-blue-400/10" },
    draft: { label: "Entwurf", dot: "bg-slate-400", tone: "text-slate-300", border: "border-slate-400/20 bg-slate-400/10" },
    closed: { label: "Archiviert", dot: "bg-zinc-400", tone: "text-zinc-300", border: "border-zinc-400/20 bg-zinc-400/10" },
};

export function MyJobsView({
    jobs,
    marketName,
    isVerified,
    applicationSummaries,
}: {
    jobs: JobsListItem[];
    marketName: string;
    isVerified: boolean;
    applicationSummaries: Record<string, ProviderJobApplicationSummary> | null;
}) {
    const [activeTab, setActiveTab] = useState<ProviderTab>("active");
    const activeJobs = useMemo(() => jobs.filter((job) => job.status !== "closed"), [jobs]);
    const archivedJobs = useMemo(() => jobs.filter((job) => job.status === "closed"), [jobs]);
    const visibleJobs = activeTab === "active" ? activeJobs : archivedJobs;

    if (!isVerified) {
        return <VerificationGate />;
    }

    if (jobs.length === 0) {
        return <FirstJobState marketName={marketName} />;
    }

    return (
        <section className="space-y-5">
            <div className="flex items-center justify-between gap-3">
                <div className="flex rounded-full border border-white/10 bg-slate-950/45 p-1 text-sm font-semibold shadow-xl backdrop-blur-md">
                    <TabButton active={activeTab === "active"} onClick={() => setActiveTab("active")}>
                        Aktiv <span>{activeJobs.length}</span>
                    </TabButton>
                    <TabButton active={activeTab === "archive"} onClick={() => setActiveTab("archive")}>
                        Archiv <span>{archivedJobs.length}</span>
                    </TabButton>
                </div>
                <Link
                    href="/app-home/offers/new"
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-4 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_-24px_rgba(255,255,255,0.65)] transition-colors hover:bg-slate-100 sm:px-5"
                >
                    <Plus size={16} />
                    Neuer Job
                </Link>
            </div>

            {!applicationSummaries && (
                <div className="rounded-2xl border border-amber-400/15 bg-amber-400/10 px-5 py-4 text-sm font-medium text-amber-100">
                    Bewerbungen konnten gerade nicht geladen werden. Deine Jobdaten bleiben sichtbar.
                </div>
            )}

            {visibleJobs.length === 0 ? (
                <EmptyListState tab={activeTab} />
            ) : (
                <div className={cn("grid gap-5", visibleJobs.length > 1 && "xl:grid-cols-2")}>
                    {visibleJobs.map((job) => (
                        <ProviderJobCard
                            key={job.id}
                            job={job}
                            marketName={marketName}
                            summary={applicationSummaries?.[job.id]}
                            hasApplicationData={Boolean(applicationSummaries)}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function VerificationGate() {
    return (
        <section className="relative min-h-[520px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#080a11]/85 shadow-[0_32px_100px_rgba(0,0,0,0.58)] backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_0%,rgba(99,102,241,0.12),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.055),transparent_38%)]" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
            <div className="relative grid min-h-[520px] lg:grid-cols-[minmax(0,0.95fr)_minmax(380px,1.05fr)]">
                <div className="flex flex-col justify-center px-7 py-10 md:px-12">
                    <h2 className="max-w-xl text-4xl font-semibold leading-[1.04] tracking-tight text-white md:text-6xl">
                        Verifizierung erforderlich
                    </h2>
                    <p className="mt-6 max-w-md text-base leading-7 text-slate-400">
                        Bestätige einmalig deine Anbieterangaben. Danach kannst du Jobs veröffentlichen und Bewerbungen erhalten.
                    </p>
                    <div className="mt-9">
                        <Link
                            href="/app-home/profile?focus=provider-verification&from=provider-home"
                            className="group inline-flex h-12 w-fit items-center justify-center gap-3 whitespace-nowrap rounded-full bg-white px-6 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-100"
                        >
                            Zur Verifizierung
                            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                        </Link>
                    </div>
                </div>

                <VerificationIllustration />
            </div>
        </section>
    );
}

function VerificationIllustration() {
    return (
        <div
            aria-hidden="true"
            className="relative flex min-h-[330px] items-center justify-center overflow-hidden border-t border-white/10 px-4 pb-8 pt-4 sm:min-h-[390px] lg:min-h-0 lg:border-l lg:border-t-0 lg:p-10"
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_54%_35%,rgba(129,140,248,0.13),transparent_32%),radial-gradient(circle_at_72%_72%,rgba(14,165,233,0.055),transparent_36%)]" />
            <div className="jobbridge-verification-aura absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-300/[0.075] blur-[88px] sm:h-[430px] sm:w-[430px]" />

            <div className="relative h-[430px] w-[430px] scale-[0.69] sm:scale-[0.88] lg:scale-[1.06] [perspective:1300px]">
                <div className="absolute bottom-10 left-1/2 h-24 w-80 -translate-x-1/2 rounded-[999px] bg-black/55 blur-2xl" />
                <div className="absolute bottom-20 left-[66px] h-20 w-[314px] rotate-[-8deg] rounded-[999px] bg-indigo-950/70 blur-3xl" />
                <div className="absolute left-[58px] top-[82px] h-[322px] w-[338px] rounded-[2.05rem] border border-indigo-200/[0.07] bg-[#050817]/72 shadow-[0_34px_90px_rgba(0,0,0,0.58)] [transform:rotateY(-18deg)_rotateX(9deg)_rotateZ(-7deg)_translate3d(18px,18px,-34px)]" />

                <div className="jobbridge-verification-card absolute left-10 top-12 h-[330px] w-[350px] rounded-[2.15rem] border border-white/14 bg-[#101421]/90 shadow-[0_46px_110px_rgba(0,0,0,0.62),0_18px_60px_rgba(79,70,229,0.14),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl [transform:rotateY(-18deg)_rotateX(9deg)_rotateZ(-7deg)] [transform-style:preserve-3d]">
                    <div className="absolute -inset-px rounded-[2.15rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.2),transparent_28%,rgba(99,102,241,0.08)_62%,rgba(255,255,255,0.08))] opacity-80" />
                    <div className="absolute inset-[1px] rounded-[2.08rem] bg-[radial-gradient(circle_at_24%_14%,rgba(255,255,255,0.13),transparent_26%),linear-gradient(135deg,rgba(18,24,39,0.92),rgba(6,10,22,0.96)_62%,rgba(10,14,28,0.98))]" />
                    <div className="jobbridge-verification-sheen absolute inset-0 rounded-[2.15rem] bg-[radial-gradient(circle_at_26%_20%,rgba(255,255,255,0.12),transparent_28%)]" />
                    <div className="absolute -right-10 top-16 h-40 w-40 rounded-full bg-indigo-400/[0.075] blur-3xl" />

                    <div className="relative flex h-full flex-col p-7 [transform:translateZ(42px)]">
                        <div className="flex items-start justify-between gap-5">
                            <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-white/12 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                                <BriefcaseBusiness size={28} className="text-indigo-100" />
                            </div>
                            <span className="mt-2 h-7 w-20 rounded-full border border-emerald-300/14 bg-emerald-300/[0.065]" />
                        </div>

                        <div className="mt-10 space-y-3">
                            <div className="h-5 w-[78%] rounded-full bg-white/22 shadow-[0_0_24px_rgba(255,255,255,0.05)]" />
                            <div className="h-3 w-[50%] rounded-full bg-white/10" />
                        </div>

                        <div className="mt-auto flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.055] text-indigo-200">
                                <MapPin size={14} />
                            </span>
                            <span className="h-3 w-[46%] rounded-full bg-white/11" />
                        </div>
                    </div>
                </div>

                <div className="jobbridge-verification-seal absolute bottom-[50px] right-[36px] flex h-[116px] w-[116px] items-center justify-center rounded-[1.8rem] border border-indigo-100/14 bg-[#070b19]/92 shadow-[0_30px_80px_rgba(0,0,0,0.62),0_16px_58px_rgba(129,140,248,0.15),inset_0_1px_0_rgba(255,255,255,0.11)] backdrop-blur-xl [transform:rotateY(-16deg)_rotateX(8deg)_rotateZ(-7deg)_translateZ(90px)]">
                    <div className="absolute inset-0 rounded-[1.8rem] bg-[radial-gradient(circle_at_35%_22%,rgba(255,255,255,0.16),transparent_34%),linear-gradient(135deg,rgba(129,140,248,0.14),transparent_60%)]" />
                    <ShieldCheck size={50} className="relative text-indigo-100 drop-shadow-[0_0_20px_rgba(199,210,254,0.4)]" />
                </div>
            </div>
        </div>
    );
}

function FirstJobState({ marketName }: { marketName: string }) {
    return (
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-[0_32px_100px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(99,102,241,0.13),transparent_35%)]" />
            <div className="relative grid gap-8 p-7 md:p-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)] lg:items-center">
                <div>
                    <h2 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
                        Erstelle dein erstes Angebot.
                    </h2>
                    <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
                        Eine klare Jobkarte reicht. Die Sichtbarkeit wählst du direkt im Job: lokal in {marketName} oder überregional.
                    </p>
                    <Link
                        href="/app-home/offers/new"
                        className="group mt-8 inline-flex h-12 items-center justify-center gap-3 whitespace-nowrap rounded-full bg-white px-6 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-100"
                    >
                        <Plus size={17} />
                        Job erstellen
                        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>

                <div className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 p-6 shadow-2xl">
                    <div className="mb-7 flex items-start justify-between gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-300/20 bg-indigo-400/10 text-indigo-200">
                            <BriefcaseBusiness size={26} />
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-400">
                            Vorschau
                        </span>
                    </div>
                    <div className="h-6 w-2/3 rounded-full bg-white/14" />
                    <div className="mt-4 space-y-2">
                        <div className="h-3 w-full rounded-full bg-white/8" />
                        <div className="h-3 w-4/5 rounded-full bg-white/8" />
                    </div>
                    <div className="mt-8 grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
                        <SkeletonMetric label="Status" />
                        <SkeletonMetric label="Reichweite" />
                        <SkeletonMetric label="Bewerbungen" />
                    </div>
                </div>
            </div>
        </section>
    );
}

function ProviderJobCard({
    job,
    marketName,
    summary,
    hasApplicationData,
}: {
    job: JobsListItem;
    marketName: string;
    summary?: ProviderJobApplicationSummary;
    hasApplicationData: boolean;
}) {
    const status = STATUS_META[job.status] ?? STATUS_META.draft;
    const category = JOB_CATEGORIES.find((item) => item.id === job.category);
    const CategoryIcon = category?.icon;
    const hasApplications = Boolean(summary?.total);
    const hasAttention = Boolean(summary?.attention);
    const primaryAction = job.status === "draft" || job.status === "reviewing"
        ? { href: `/app-home/offers/edit/${job.id}`, label: "Bearbeiten", icon: Edit3 }
        : { href: `/app-home/offers/${job.id}`, label: "Angebot öffnen", icon: ArrowRight };
    const PrimaryIcon = primaryAction.icon;
    const reachLabel = job.reach === "extended" ? "Überregional" : `Lokal in ${marketName}`;
    const ReachIcon = job.reach === "extended" ? Globe2 : MapPin;
    const applicationLabel = getApplicationLabel(summary, hasApplicationData);

    return (
        <article className="group relative overflow-hidden rounded-[1.6rem] border border-white/[0.08] bg-gradient-to-br from-slate-900/95 via-slate-900/78 to-slate-950/95 p-5 shadow-[0_22px_62px_rgba(0,0,0,0.34)] transition-[border-color,box-shadow,background-color] duration-300 hover:border-indigo-300/25 hover:shadow-[0_26px_80px_rgba(15,23,42,0.58)] sm:p-6">
            <div className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/65 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative flex min-h-[224px] flex-col gap-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <StatusPill status={status} />
                            {category && (
                                <span className="inline-flex items-center gap-1.5 rounded-md border border-indigo-400/20 bg-indigo-400/10 px-2.5 py-1 text-[11px] font-bold tracking-wide text-indigo-200">
                                    {CategoryIcon && <CategoryIcon size={12} className="text-indigo-300" />}
                                    {category.label}
                                </span>
                            )}
                        </div>
                        <h3 className="text-2xl font-semibold leading-tight tracking-tight text-white transition-colors group-hover:text-indigo-50">
                            {job.title}
                        </h3>
                        {job.description && (
                            <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-6 text-slate-400">
                                {job.description}
                            </p>
                        )}
                    </div>
                    <div className={cn(
                        "flex w-fit shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
                        hasAttention
                            ? "border-indigo-300/30 bg-indigo-400/12 text-indigo-100"
                            : "border-white/10 bg-white/[0.035] text-slate-400",
                    )}>
                        <MessageSquare size={13} />
                        {applicationLabel}
                    </div>
                </div>

                <div className="mt-auto flex flex-col gap-4 border-t border-white/[0.07] pt-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
                        <InlineFact icon={<Euro size={15} className="text-emerald-300" />} value={formatPay(job)} strong />
                        <InlineFact icon={<ReachIcon size={15} className="text-indigo-300" />} value={reachLabel} />
                        <InlineFact icon={<Clock size={15} className="text-slate-500" />} value={timeAgo(job.created_at)} />
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Link
                            href={primaryAction.href}
                            className="group/action inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-100"
                        >
                            {primaryAction.label}
                            <PrimaryIcon size={15} className="transition-transform group-hover/action:translate-x-0.5" />
                        </Link>

                        {hasApplications && (
                            <Link
                                href={`/app-home/activities?jobId=${job.id}`}
                                className={cn(
                                    "inline-flex h-11 items-center justify-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors",
                                    hasAttention
                                        ? "border-indigo-300/30 bg-indigo-400/12 text-indigo-100 hover:bg-indigo-400/18"
                                        : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]",
                                )}
                            >
                                Bewerbungen
                                {summary?.submitted ? (
                                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-950">
                                        {summary.submitted}
                                    </span>
                                ) : (
                                    <ArrowRight size={15} />
                                )}
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
}

function InlineFact({ icon, value, strong = false }: { icon: ReactNode; value: string; strong?: boolean }) {
    return (
        <div className="flex min-w-0 items-center gap-2 text-slate-400">
            {icon}
            <span
                className={cn(
                    "truncate",
                    strong ? "font-semibold text-white" : "font-medium text-slate-400",
                )}
            >
                {value}
            </span>
        </div>
    );
}

function getApplicationLabel(summary: ProviderJobApplicationSummary | undefined, hasData: boolean) {
    if (!hasData) return "Nicht geladen";
    if (!summary || summary.total === 0) return "Keine Bewerbungen";
    if (summary.submitted > 0) return `${summary.submitted} neu`;
    return summary.total === 1 ? "1 Bewerbung" : `${summary.total} Bewerbungen`;
}

function formatPay(job: JobsListItem) {
    if (!job.wage_hourly) return "Offen";
    return job.payment_type === "fixed" ? `${job.wage_hourly} €` : `${job.wage_hourly} €/Std.`;
}

function StatusPill({ status }: { status: { label: string; dot: string; tone: string; border: string } }) {
    return (
        <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold", status.tone, status.border)}>
            <span className={cn("h-2 w-2 rounded-full", status.dot)} />
            {status.label}
        </span>
    );
}

function SkeletonMetric({ label }: { label: string }) {
    return (
        <div>
            <p className="text-[10px] font-semibold uppercase text-slate-600">{label}</p>
            <div className="mt-2 h-3 w-16 rounded-full bg-white/10" />
        </div>
    );
}

function TabButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex min-w-[4.5rem] items-center justify-center gap-1.5 rounded-full px-3 py-2 transition-colors sm:min-w-24 sm:gap-2 sm:px-4",
                active ? "bg-white text-slate-950" : "text-slate-500 hover:text-slate-200",
            )}
        >
            {children}
        </button>
    );
}

function EmptyListState({ tab }: { tab: ProviderTab }) {
    return (
        <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/50 px-6 py-14 text-center">
            <FileText size={28} className="mx-auto mb-4 text-slate-500" />
            <h3 className="text-lg font-semibold text-white">
                {tab === "active" ? "Keine aktiven Jobs" : "Noch kein Archiv"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
                {tab === "active" ? "Neue Jobs erstellst du oben rechts." : "Abgeschlossene Jobs erscheinen hier automatisch."}
            </p>
        </div>
    );
}
