"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { Database } from "@/lib/types/supabase";
import { updateJobAction } from "./actions";
import { AlertTriangle, CalendarDays, Loader2, Lock, MapPin, Repeat2 } from "lucide-react";
import { JOB_CATEGORIES } from "@/lib/constants/jobCategories";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { getProviderJobStatusMeta, isProtectedJobStatus } from "../../../presentation";
import type { EditableJobStatus } from "./jobEditValidation";

type Job = Database["public"]["Tables"]["jobs"]["Row"];

const STATUS_LABELS: Record<EditableJobStatus, string> = {
    draft: "Entwurf",
    open: "Aktiv und sichtbar",
    closed: "Archiviert",
};

export function EditJobForm({ job, marketName }: { job: Job; marketName: string }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [categoryId, setCategoryId] = useState(job.category || "");
    const [paymentType, setPaymentType] = useState<"hourly" | "fixed">(
        job.payment_type === "fixed" ? "fixed" : "hourly",
    );
    const initialWage = job.wage_hourly == null ? "" : String(job.wage_hourly);
    const [wage, setWage] = useState(initialWage);
    const [jobKind, setJobKind] = useState<"one_time" | "recurring">(
        job.job_kind === "recurring" ? "recurring" : "one_time",
    );
    const [recurrenceRule, setRecurrenceRule] = useState<"weekly" | "biweekly" | "monthly" | "flexible">(
        ["weekly", "biweekly", "monthly", "flexible"].includes(job.recurrence_rule || "")
            ? job.recurrence_rule as "weekly" | "biweekly" | "monthly" | "flexible"
            : "weekly",
    );
    const [continuityPreferred, setContinuityPreferred] = useState(Boolean(job.continuity_preferred));
    const titleRef = useRef<HTMLDivElement>(null);
    const statusInfo = getProviderJobStatusMeta(job.status);
    const statusIsProtected = isProtectedJobStatus(job.status);
    const editableStatuses = getEditableStatuses(job.status);

    if (statusIsProtected) {
        return (
            <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 shadow-[var(--shadow-card)] md:p-8">
                <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--brand-border)] bg-[var(--brand-soft)] text-[var(--brand)]">
                        <Lock size={20} />
                    </span>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{statusInfo.label}</p>
                        <h2 className="mt-1 text-xl font-semibold text-[var(--text-strong)]">Auftragsangaben sind geschützt</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                            Sobald ein Bewerbungsablauf läuft, bleiben Beschreibung, Vergütung und Jobart unverändert. So können sich beide Seiten auf dieselben vereinbarten Angaben verlassen.
                        </p>
                    </div>
                </div>
                <div className="mt-6 flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-5 sm:flex-row sm:justify-end">
                    <Button type="button" variant="secondary" onClick={() => router.push("/app-home/offers")}>Zu meinen Jobs</Button>
                    <Button type="button" onClick={() => router.push(`/app-home/offers/${job.id}`)}>Auftrag ansehen</Button>
                </div>
            </section>
        );
    }

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);
        formData.set("category", categoryId);
        formData.set("payment_type", paymentType);
        formData.set("job_kind", jobKind);
        formData.set("recurrence_rule", jobKind === "recurring" ? recurrenceRule : "");
        formData.set("continuity_preferred", jobKind === "recurring" && continuityPreferred ? "true" : "false");

        try {
            const result = await updateJobAction(job.id, formData);
            if (result.success) {
                router.push("/app-home/offers");
                router.refresh();
            } else {
                setError(result.error || "Fehler beim Speichern");
            }
        } catch {
            setError("Ein unerwarteter Fehler ist aufgetreten.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form action={handleSubmit} className="space-y-7">
            {error ? (
                <div className="flex items-start gap-3 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]" role="alert">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            ) : null}

            <fieldset>
                <legend className="mb-3 text-sm font-medium text-[var(--text-default)]">Kategorie *</legend>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {JOB_CATEGORIES.map((category) => {
                        const Icon = category.icon;
                        const isSelected = categoryId === category.id;

                        return (
                            <button
                                key={category.id}
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() => {
                                    setCategoryId(category.id);
                                    if (job.category !== category.id && wage === initialWage) {
                                        setPaymentType(category.defaultPaymentType);
                                    }
                                }}
                                className={cn(
                                    "flex min-h-[6.5rem] flex-col items-center justify-center rounded-2xl border p-4 outline-none transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-raised)] motion-reduce:transition-none motion-reduce:active:scale-100",
                                    isSelected
                                        ? "border-[var(--brand-border)] bg-[var(--brand-soft)] text-[var(--brand)]"
                                        : "border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-muted)] hover:border-[var(--brand-border)] hover:text-[var(--text-strong)]",
                                )}
                            >
                                <Icon size={25} strokeWidth={1.7} className="mb-2" />
                                <span className="text-center text-xs font-semibold">{category.label}</span>
                            </button>
                        );
                    })}
                </div>
            </fieldset>

            <div ref={titleRef} className="space-y-2 scroll-mt-8">
                <label htmlFor="title" className="block text-sm font-medium text-[var(--text-default)]">Titel *</label>
                <input
                    type="text"
                    id="title"
                    name="title"
                    defaultValue={job.title || ""}
                    required
                    minLength={5}
                    maxLength={120}
                    className="min-h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-solid)] px-4 py-3 text-[var(--text-strong)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-[var(--text-faint)] focus:border-[var(--brand-border)] focus:ring-2 focus:ring-[var(--focus-halo)]"
                />
            </div>

            <div className="space-y-2">
                <label htmlFor="description" className="block text-sm font-medium text-[var(--text-default)]">Beschreibung *</label>
                <textarea
                    id="description"
                    name="description"
                    defaultValue={job.description || ""}
                    required
                    minLength={10}
                    maxLength={5000}
                    rows={6}
                    className="w-full resize-y rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-solid)] px-4 py-3 text-[var(--text-strong)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-[var(--text-faint)] focus:border-[var(--brand-border)] focus:ring-2 focus:ring-[var(--focus-halo)]"
                />
            </div>

            <fieldset>
                <legend className="mb-2 text-sm font-medium text-[var(--text-default)]">Jobart</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                    <JobKindOption
                        icon={<CalendarDays size={19} />}
                        title="Einmaliger Auftrag"
                        description="Ein Termin, danach ist der Auftrag abgeschlossen."
                        selected={jobKind === "one_time"}
                        disabled={statusIsProtected}
                        onSelect={() => setJobKind("one_time")}
                    />
                    <JobKindOption
                        icon={<Repeat2 size={19} />}
                        title="Regelmäßige Hilfe"
                        description="Mehrere Termine mit möglichst derselben Person."
                        selected={jobKind === "recurring"}
                        disabled={statusIsProtected}
                        onSelect={() => setJobKind("recurring")}
                    />
                </div>
                {statusIsProtected ? (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                        <Lock size={12} /> Die Jobart bleibt während eines laufenden Bewerbungsablaufs unverändert.
                    </p>
                ) : null}
            </fieldset>

            <AnimatePresence initial={false}>
                {jobKind === "recurring" ? (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="overflow-hidden"
                    >
                        <div className="grid gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label htmlFor="recurrence_rule" className="block text-sm font-medium text-[var(--text-default)]">
                                    Wie häufig?
                                </label>
                                <select
                                    id="recurrence_rule"
                                    value={recurrenceRule}
                                    onChange={(event) => setRecurrenceRule(event.target.value as typeof recurrenceRule)}
                                    className="min-h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-solid)] px-3.5 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--brand-border)] focus:ring-2 focus:ring-[var(--focus-halo)]"
                                >
                                    <option value="weekly">Wöchentlich</option>
                                    <option value="biweekly">Alle zwei Wochen</option>
                                    <option value="monthly">Monatlich</option>
                                    <option value="flexible">Nach Absprache</option>
                                </select>
                            </div>
                            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl bg-[var(--surface-solid)] p-3.5 ring-1 ring-[var(--border-subtle)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--brand)]">
                                <input
                                    type="checkbox"
                                    checked={continuityPreferred}
                                    onChange={(event) => setContinuityPreferred(event.target.checked)}
                                    className="mt-0.5 size-4 accent-[var(--brand)]"
                                />
                                <span>
                                    <strong className="block text-sm font-semibold text-[var(--text-strong)]">Dieselbe Person bevorzugt</strong>
                                    <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">Der Chat bleibt für weitere Termine bestehen.</span>
                                </span>
                            </label>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>

            <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--text-default)]">Einsatzort</p>
                <div className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-solid)] text-[var(--text-muted)]">
                        <MapPin size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--text-default)]">
                            {job.public_location_label || "Standard-Adresse"}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                            <Lock size={11} />
                            Adresse kann nachträglich nicht geändert werden
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <fieldset>
                    <legend className="mb-2 text-sm font-medium text-[var(--text-default)]">Bezahlung</legend>
                    <div className="flex rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-1">
                        <PaymentTypeButton active={paymentType === "hourly"} onClick={() => setPaymentType("hourly")}>
                            Stundenlohn
                        </PaymentTypeButton>
                        <PaymentTypeButton active={paymentType === "fixed"} onClick={() => setPaymentType("fixed")}>
                            Pauschale
                        </PaymentTypeButton>
                    </div>
                </fieldset>

                <div className="space-y-2">
                    <label htmlFor="wage_hourly" className="block text-sm font-medium text-[var(--text-default)]">
                        {paymentType === "hourly" ? "Stundenlohn (€)" : "Pauschale (€)"} *
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            inputMode="decimal"
                            id="wage_hourly"
                            name="wage_hourly"
                            value={wage}
                            onChange={(event) => setWage(event.target.value)}
                            required
                            min="0.5"
                            max="100000"
                            step="0.50"
                            className="min-h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-solid)] py-2.5 pl-4 pr-16 tabular-nums text-[var(--text-strong)] outline-none transition-[border-color,box-shadow,background-color] duration-150 focus:border-[var(--brand-border)] focus:ring-2 focus:ring-[var(--focus-halo)]"
                        />
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--text-muted)]">
                            €{paymentType === "hourly" ? "/Std." : ""}
                        </span>
                    </div>
                </div>
            </div>

            <AnimatePresence initial={false}>
                {categoryId ? (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="overflow-hidden"
                    >
                        <CompensationRecommendation
                            categoryId={categoryId}
                            onApply={(value, type) => {
                                setWage(value);
                                setPaymentType(type);
                            }}
                        />
                    </motion.div>
                ) : null}
            </AnimatePresence>

            <div className="grid grid-cols-1 gap-6 pt-1 md:grid-cols-2">
                <fieldset>
                    <legend className="mb-2 text-sm font-medium text-[var(--text-default)]">Reichweite</legend>
                    <div className="grid grid-cols-1 gap-3">
                        <ReachOption
                            value="internal_rheinbach"
                            defaultChecked={job.reach === "internal_rheinbach" || !job.reach}
                            title={`Lokal in ${marketName}`}
                            description={`Nur für Nutzer aus ${marketName} sichtbar.`}
                        />
                        <ReachOption
                            value="extended"
                            defaultChecked={job.reach === "extended"}
                            title="Überregional"
                            description="Auch für Nutzer aus umliegenden Städten sichtbar."
                        />
                    </div>
                </fieldset>

                <div className="space-y-2">
                    <label htmlFor={statusIsProtected ? undefined : "status"} className="block text-sm font-medium text-[var(--text-default)]">
                        Status
                    </label>
                    {statusIsProtected ? (
                        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
                            <p className="text-sm font-semibold text-[var(--text-strong)]">{statusInfo.label}</p>
                            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                                Dieser Status wird sicher über den Bewerbungsablauf verwaltet und bleibt beim Speichern unverändert.
                            </p>
                        </div>
                    ) : (
                        <select
                            id="status"
                            name="status"
                            defaultValue={job.status}
                            required
                            className="min-h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-solid)] px-4 py-3 text-[var(--text-strong)] outline-none transition-[border-color,box-shadow,background-color] duration-150 focus:border-[var(--brand-border)] focus:ring-2 focus:ring-[var(--focus-halo)]"
                        >
                            {editableStatuses.map((status) => (
                                <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[var(--border-subtle)] pt-6 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={() => router.back()} disabled={isLoading}>
                    Abbrechen
                </Button>
                <Button type="submit" disabled={isLoading || !categoryId} className="min-w-[150px]">
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Speichern
                        </>
                    ) : (
                        "Änderungen speichern"
                    )}
                </Button>
            </div>
        </form>
    );
}

function JobKindOption({
    icon,
    title,
    description,
    selected,
    disabled,
    onSelect,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    selected: boolean;
    disabled: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            disabled={disabled}
            aria-pressed={selected}
            className={cn(
                "grid min-h-[5.5rem] grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-2xl border p-4 text-left outline-none transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-raised)] disabled:cursor-default disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100",
                selected
                    ? "border-[var(--brand-border)] bg-[var(--brand-soft)]"
                    : "border-[var(--border-subtle)] bg-[var(--surface-muted)] hover:border-[var(--brand-border)]",
            )}
        >
            <span className={cn(
                "inline-grid size-9 place-items-center rounded-xl",
                selected ? "bg-[var(--surface-solid)] text-[var(--brand)]" : "bg-[var(--surface-solid)] text-[var(--text-muted)]",
            )}>
                {icon}
            </span>
            <span>
                <strong className="block text-sm font-semibold text-[var(--text-strong)]">{title}</strong>
                <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">{description}</span>
            </span>
        </button>
    );
}

function PaymentTypeButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                "min-h-11 flex-1 rounded-lg px-3 text-sm font-medium outline-none transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-[var(--brand)] motion-reduce:transition-none motion-reduce:active:scale-100",
                active
                    ? "bg-[var(--surface-solid)] text-[var(--text-strong)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-strong)]",
            )}
        >
            {children}
        </button>
    );
}

function CompensationRecommendation({
    categoryId,
    onApply,
}: {
    categoryId: string;
    onApply: (value: string, type: "hourly" | "fixed") => void;
}) {
    const selectedCategory = JOB_CATEGORIES.find((category) => category.id === categoryId);
    if (!selectedCategory) return null;

    const average = ((selectedCategory.recommendedWage.min + selectedCategory.recommendedWage.max) / 2).toFixed(2);

    return (
        <div className="flex flex-col gap-4 rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h3 className="text-sm font-semibold text-[var(--text-strong)]">Orientierung für eine faire Vergütung</h3>
                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                    {selectedCategory.hint} Üblich sind etwa{" "}
                    <strong className="font-semibold tabular-nums text-[var(--text-strong)]">
                        {selectedCategory.recommendedWage.min}–{selectedCategory.recommendedWage.max} €
                    </strong>.
                </p>
            </div>
            <button
                type="button"
                onClick={() => onApply(average, selectedCategory.defaultPaymentType)}
                className="min-h-11 shrink-0 rounded-full border border-[var(--brand-border)] bg-[var(--surface-solid)] px-4 text-xs font-semibold tabular-nums text-[var(--brand)] outline-none transition-[background-color,transform] duration-150 ease-out hover:bg-[var(--surface-raised)] active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-[var(--brand)] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
                {average} € übernehmen
            </button>
        </div>
    );
}

function ReachOption({
    value,
    defaultChecked,
    title,
    description,
}: {
    value: "internal_rheinbach" | "extended";
    defaultChecked: boolean;
    title: string;
    description: string;
}) {
    return (
        <label className="cursor-pointer rounded-xl outline-none">
            <input
                type="radio"
                name="reach"
                value={value}
                defaultChecked={defaultChecked}
                required
                className="peer sr-only"
            />
            <span className="block min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out peer-checked:border-[var(--brand-border)] peer-checked:bg-[var(--brand-soft)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--brand)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--surface-raised)] peer-active:scale-[0.98] motion-reduce:transition-none">
                <span className="block text-sm font-semibold text-[var(--text-strong)]">{title}</span>
                <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">{description}</span>
            </span>
        </label>
    );
}

function getEditableStatuses(status: Job["status"]): EditableJobStatus[] {
    if (status === "draft") return ["draft", "open", "closed"];
    if (status === "closed") return ["closed", "open"];
    if (status === "open") return ["open", "closed"];
    return [];
}
