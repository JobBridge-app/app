"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowRight,
    Briefcase,
    Filter,
    MessageSquare,
    Search,
    User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ApplicationChat = dynamic(
    () => import("@/components/activity/ApplicationChat").then((mod) => mod.ApplicationChat),
    { loading: () => <ChatSkeleton /> },
);

type ActivityRole = "seeker" | "provider";
type ActivityFilter = "all" | "attention" | "active" | "waitlist" | "accepted" | "closed";
type StatusTone = "neutral" | "brand" | "success" | "warning" | "danger";

type StatusConfig = {
    label: string;
    tone: StatusTone;
};

type ActivityCommandCenterProps = {
    applications: any[];
    role: ActivityRole;
    selectedJobId?: string | null;
    selectedJobTitle?: string | null;
    onSendMessage: (applicationId: string, message: string) => Promise<any>;
    onWithdraw?: (applicationId: string, reason: string) => Promise<void>;
    onReject?: (applicationId: string, reason: string) => Promise<void>;
};

const CLOSED_STATUSES = new Set(["rejected", "withdrawn", "cancelled"]);
const ACTIVE_STATUSES = new Set(["submitted", "negotiating"]);
const ATTENTION_STATUSES = new Set(["submitted", "negotiating", "waitlisted"]);

const statusConfig: Record<string, StatusConfig> = {
    submitted: { label: "Gesendet", tone: "brand" },
    negotiating: { label: "In Kontakt", tone: "brand" },
    accepted: { label: "Angenommen", tone: "success" },
    rejected: { label: "Abgelehnt", tone: "danger" },
    withdrawn: { label: "Zurückgezogen", tone: "neutral" },
    cancelled: { label: "Beendet", tone: "neutral" },
    waitlisted: { label: "Warteliste", tone: "warning" },
};

function getStatusConfig(status: string | null | undefined): StatusConfig {
    return statusConfig[status ?? ""] ?? { label: "Offen", tone: "neutral" };
}

function getPartner(app: any, role: ActivityRole) {
    if (role === "provider") {
        const applicant = app.applicant ?? {};
        const name = applicant.full_name || "Unbekannter Bewerber";
        return {
            name,
            subtitle: app.job?.title || "Job-Angebot",
            meta: applicant.city || "Kein Ort angegeben",
        };
    }

    const creator = app.job?.creator ?? {};
    const name = creator.company_name || creator.full_name || "Arbeitgeber";
    return {
        name,
        subtitle: app.job?.title || "Job-Angebot",
        meta: app.job?.public_location_label || creator.city || "Ort folgt",
    };
}

function getSearchText(app: any, role: ActivityRole) {
    const partner = getPartner(app, role);
    return [
        partner.name,
        partner.subtitle,
        partner.meta,
        app.status,
        app.message,
        app.job?.title,
        app.job?.creator?.company_name,
        app.applicant?.full_name,
        app.applicant?.city,
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
}

function matchesFilter(app: any, filter: ActivityFilter) {
    const status = app.status ?? "";
    if (filter === "all") return true;
    if (filter === "attention") return ATTENTION_STATUSES.has(status);
    if (filter === "active") return ACTIVE_STATUSES.has(status);
    if (filter === "waitlist") return status === "waitlisted";
    if (filter === "accepted") return status === "accepted";
    return CLOSED_STATUSES.has(status);
}

export function ActivityCommandCenter({
    applications,
    role,
    selectedJobId,
    selectedJobTitle,
    onSendMessage,
    onWithdraw,
    onReject,
}: ActivityCommandCenterProps) {
    const [items, setItems] = useState(applications);
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<ActivityFilter>("all");
    const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

    useEffect(() => {
        setItems(applications);
    }, [applications]);

    const selectedApp = useMemo(
        () => items.find((app) => app.id === selectedAppId) ?? null,
        [items, selectedAppId],
    );

    const filterOptions = useMemo(() => {
        const count = (nextFilter: ActivityFilter) => items.filter((app) => matchesFilter(app, nextFilter)).length;
        const options = [
            { key: "all" as ActivityFilter, label: "Alle", count: count("all") },
            { key: "active" as ActivityFilter, label: "Aktiv", count: count("active") },
            { key: "waitlist" as ActivityFilter, label: "Warteliste", count: count("waitlist") },
            { key: "accepted" as ActivityFilter, label: "Zusage", count: count("accepted") },
            { key: "closed" as ActivityFilter, label: "Archiv", count: count("closed") },
        ];

        if (role === "provider") {
            options.splice(1, 0, { key: "attention" as ActivityFilter, label: "Neu", count: count("attention") });
        }

        return options;
    }, [items, role]);

    const visibleItems = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return items
            .filter((app) => matchesFilter(app, filter))
            .filter((app) => !normalizedQuery || getSearchText(app, role).includes(normalizedQuery))
            .sort((a, b) => {
                const aAttention = ATTENTION_STATUSES.has(a.status) ? 1 : 0;
                const bAttention = ATTENTION_STATUSES.has(b.status) ? 1 : 0;
                if (aAttention !== bAttention) return bAttention - aAttention;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
    }, [filter, items, query, role]);

    const updateSelectedStatus = async (reason: string, status: "withdrawn" | "rejected") => {
        if (!selectedAppId) return;

        const previousItems = items;
        setItems((current) =>
            current.map((app) =>
                app.id === selectedAppId
                    ? { ...app, status, rejection_reason: reason }
                    : app,
            ),
        );

        try {
            if (status === "withdrawn" && onWithdraw) await onWithdraw(selectedAppId, reason);
            if (status === "rejected" && onReject) await onReject(selectedAppId, reason);
        } catch (error) {
            setItems(previousItems);
            throw error;
        }
    };

    if (items.length === 0) {
        return (
            <ActivityEmptyState
                role={role}
                selectedJobId={selectedJobId}
                selectedJobTitle={selectedJobTitle}
            />
        );
    }

    return (
        <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, ease: "easeOut" }}
            className="activities-command-center jobs-home-surface"
            data-role={role}
        >
            <div className="jobs-home-heading activity-home-heading">
                <div>
                    <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">
                        {role === "provider" ? "Bewerbungen" : "Aktivitäten"}
                    </h1>
                    <p className="text-slate-400">
                        {role === "provider"
                            ? "Prüfe Bewerbungen und kommuniziere direkt mit Talenten."
                            : "Behalte deine Bewerbungen, Antworten und nächsten Schritte im Blick."}
                    </p>
                </div>

                {selectedJobId && (
                    <div className="activity-job-filter">
                        <Filter size={15} />
                        <span>{selectedJobTitle || "Ausgewählter Job"}</span>
                        <Link href="/app-home/activities">Alle anzeigen</Link>
                    </div>
                )}
            </div>

            <div className="activity-home-controls">
                <div className="activity-filter-strip" role="tablist" aria-label="Aktivitäten filtern">
                    {filterOptions.map((option) => (
                        <button
                            key={option.key}
                            type="button"
                            onClick={() => setFilter(option.key)}
                            className={cn(filter === option.key && "is-active")}
                            aria-selected={filter === option.key}
                        >
                            {option.label}
                            <span>{option.count}</span>
                        </button>
                    ))}
                </div>

                <label className="activity-search">
                    <Search size={17} />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Suchen nach Job, Person, Ort..."
                    />
                </label>
            </div>

            <div className="activity-workspace">
                <aside className={cn("activity-inbox-panel", selectedApp ? "hidden lg:flex" : "flex")}>
                    <div className="activity-panel-heading">
                        <div>
                            <span>Verlauf</span>
                        </div>
                    </div>

                    <div className="activity-inbox-list">
                        <AnimatePresence initial={false}>
                            {visibleItems.map((app) => (
                                <ActivityInboxItem
                                    key={app.id}
                                    app={app}
                                    role={role}
                                    selected={selectedAppId === app.id}
                                    onSelect={() => setSelectedAppId(app.id)}
                                />
                            ))}
                        </AnimatePresence>

                        {visibleItems.length === 0 && (
                            <div className="activity-no-results">
                                <Search size={20} />
                                <strong>Nichts gefunden</strong>
                                <span>Ändere Suche oder Filter.</span>
                            </div>
                        )}
                    </div>
                </aside>

                <section className={cn("activity-chat-stage", selectedApp ? "flex" : "hidden lg:flex")}>
                    {selectedApp ? (
                        <>
                            <ApplicationChat
                                application={selectedApp}
                                currentUserRole={role}
                                onWithdraw={
                                    role === "seeker" && onWithdraw
                                        ? (reason: string) => updateSelectedStatus(reason, "withdrawn")
                                        : undefined
                                }
                                onReject={
                                    role === "provider" && onReject
                                        ? (reason: string) => updateSelectedStatus(reason, "rejected")
                                        : undefined
                                }
                                onSendMessage={onSendMessage}
                                onClose={() => setSelectedAppId(null)}
                                embedded
                                premiumComposer
                            />
                        </>
                    ) : (
                        <ActivityDetailPlaceholder role={role} />
                    )}
                </section>
            </div>
        </motion.div>
    );
}

function ActivityInboxItem({
    app,
    role,
    selected,
    onSelect,
}: {
    app: any;
    role: ActivityRole;
    selected: boolean;
    onSelect: () => void;
}) {
    const status = getStatusConfig(app.status);
    const partner = getPartner(app, role);
    const createdAtLabel = formatDistanceToNow(new Date(app.created_at), { addSuffix: true, locale: de });

    return (
        <motion.button
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            type="button"
            onClick={onSelect}
            className="activity-inbox-item"
            data-selected={selected ? "true" : "false"}
            aria-pressed={selected}
        >
            <span className="activity-selection-line" />
            <span className="activity-inbox-body">
                <span className="activity-inbox-title-row">
                    <strong>{partner.subtitle}</strong>
                    <span className="activity-status-pill" data-tone={status.tone}>
                        {status.label}
                    </span>
                </span>
                <span className="activity-inbox-subline">
                    <span className="activity-inbox-name">{partner.name}</span>
                </span>
                <span className="activity-inbox-meta">
                    <span>{partner.meta}</span>
                    <span>{createdAtLabel}</span>
                </span>
            </span>
        </motion.button>
    );
}

function ActivityDetailPlaceholder({ role }: { role: ActivityRole }) {
    return (
        <div className="activity-detail-placeholder">
            <div className="activity-placeholder-icon">
                <MessageSquare size={24} />
            </div>
            <h2>{role === "provider" ? "Wähle eine Bewerbung" : "Wähle eine Aktivität"}</h2>
            <p>
                Links auswählen, dann siehst du Gespräch, Details und die passende Aktion.
            </p>
        </div>
    );
}

function ActivityEmptyState({
    role,
    selectedJobId,
    selectedJobTitle,
}: {
    role: ActivityRole;
    selectedJobId?: string | null;
    selectedJobTitle?: string | null;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="activity-empty-command"
        >
            <div className="activity-placeholder-icon">
                {role === "provider" ? <User size={26} /> : <Briefcase size={26} />}
            </div>
            <h1>
                {selectedJobId
                    ? `Noch keine Bewerbungen für ${selectedJobTitle || "diesen Job"}`
                    : role === "provider"
                        ? "Noch keine Bewerbungen"
                        : "Noch keine Aktivitäten"}
            </h1>
            <p>
                {role === "provider"
                    ? "Sobald sich jemand bewirbt, erscheinen Gespräch und Entscheidung hier."
                    : "Sobald du dich bewirbst, erscheinen Status und Chat hier."}
            </p>
            <Link href={role === "provider" ? "/app-home/offers" : "/app-home/jobs"}>
                {role === "provider" ? "Zu deinen Jobs" : "Jobs entdecken"}
                <ArrowRight size={16} />
            </Link>
        </motion.div>
    );
}

function ChatSkeleton() {
    return (
        <div className="activity-chat-skeleton">
            <div />
            <div />
            <div />
        </div>
    );
}
