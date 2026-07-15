import { format, isToday, isYesterday } from "date-fns";
import { de } from "date-fns/locale";

export type ActivityRole = "seeker" | "provider";
export type ActivityFilter = "all" | "unread" | "active" | "waitlist" | "accepted" | "closed";
export type ActivityStatusTone = "neutral" | "brand" | "success" | "warning" | "danger";

export type ActivityStatusMeta = {
    label: string;
    tone: ActivityStatusTone;
};

export type ActivityMessage = {
    id: string;
    application_id: string;
    sender_id: string | null;
    content: string;
    created_at: string | null;
    read_at?: string | null;
    kind?: "application" | "chat" | "system";
    is_temp?: boolean;
    failed?: boolean;
};

type DatedActivityTimelineItem = {
    id: string;
    created_at: string | null;
};

export type ActivityTimelineEntry<TMessage, TReopenRequest> = (
    | { type: "message"; item: TMessage }
    | { type: "reopen_request"; item: TReopenRequest }
) & {
    key: string;
    createdAt: string | null;
    showDateSeparator: boolean;
};

export type ProviderGroupableActivity = {
    id: string;
    job_id?: string | null;
    status?: string | null;
    conversation_state?: string | null;
    is_primary?: boolean | null;
    queue_position?: number | null;
    created_at: string;
    last_activity_at?: string | null;
    last_message_at?: string | null;
    agreed_at?: string | null;
    unread_count?: number | string | null;
    job?: {
        id?: string | null;
        title?: string | null;
        status?: string | null;
    } | null;
};

export type ProviderActivityGroup<T extends ProviderGroupableActivity = ProviderGroupableActivity> = {
    jobId: string;
    job: T["job"];
    applications: T[];
    primary: T | null;
    waitlist: T[];
    archive: T[];
    unreadCount: number;
    lastActivityAt: number;
};

export const ACTIVITY_STATUS_META: Record<string, ActivityStatusMeta> = {
    submitted: { label: "Bewerbung gesendet", tone: "brand" },
    negotiating: { label: "Im Gespräch", tone: "brand" },
    waitlisted: { label: "Warteliste", tone: "warning" },
    accepted: { label: "Termin vereinbart", tone: "success" },
    completed: { label: "Abgeschlossen", tone: "success" },
    rejected: { label: "Abgelehnt", tone: "danger" },
    auto_rejected: { label: "Anderweitig vergeben", tone: "neutral" },
    withdrawn: { label: "Zurückgezogen", tone: "neutral" },
    cancelled: { label: "Beendet", tone: "neutral" },
};

export const CLOSED_ACTIVITY_STATUSES = new Set([
    "rejected",
    "auto_rejected",
    "withdrawn",
    "cancelled",
    "completed",
]);

export const ACTIVE_ACTIVITY_STATUSES = new Set(["submitted", "negotiating", "waitlisted", "accepted"]);
export const WRITABLE_ACTIVITY_STATUSES = new Set(["submitted", "negotiating", "accepted"]);

export function resolveReopenApplicationPatch(result: unknown): Record<string, unknown> | null {
    if (!result || typeof result !== "object") {
        throw new Error("Der neue Gesprächsstatus konnte nicht bestätigt werden.");
    }

    const response = result as Record<string, unknown>;
    if (response.application && typeof response.application === "object") {
        return response.application as Record<string, unknown>;
    }

    if (response.unchanged === true) return null;
    if (typeof response.status !== "string" || typeof response.is_primary !== "boolean") {
        throw new Error("Der neue Gesprächsstatus konnte nicht bestätigt werden.");
    }

    return {
        conversation_state: "open",
        status: response.status,
        is_primary: response.is_primary,
        closed_by: null,
        closed_at: null,
        closed_reason: null,
        close_action: null,
    };
}

function compareQueueOrder(a: ProviderGroupableActivity, b: ProviderGroupableActivity) {
    const aPosition = a.queue_position != null && Number.isFinite(Number(a.queue_position))
        ? Number(a.queue_position)
        : Number.MAX_SAFE_INTEGER;
    const bPosition = b.queue_position != null && Number.isFinite(Number(b.queue_position))
        ? Number(b.queue_position)
        : Number.MAX_SAFE_INTEGER;

    if (aPosition !== bPosition) return aPosition - bPosition;

    const createdDifference = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (Number.isFinite(createdDifference) && createdDifference !== 0) return createdDifference;
    return a.id.localeCompare(b.id);
}

/**
 * Builds the provider inbox read model without changing the stored FIFO key.
 * `queue_position` remains the immutable fairness order; the visible waitlist
 * rank is the array index after this function has sorted open waitlist entries.
 */
export function groupProviderActivities<T extends ProviderGroupableActivity>(
    applications: T[],
): ProviderActivityGroup<T>[] {
    const grouped = new Map<string, T[]>();

    for (const application of applications) {
        const jobId = application.job?.id || application.job_id || `missing-job:${application.id}`;
        const current = grouped.get(jobId) ?? [];
        current.push(application);
        grouped.set(jobId, current);
    }

    return [...grouped.entries()]
        .map(([jobId, groupApplications]) => {
            const primaryCandidates = groupApplications
                .filter((application) => (
                    application.conversation_state !== "closed"
                    && Boolean(application.is_primary)
                    && WRITABLE_ACTIVITY_STATUSES.has(application.status ?? "")
                ))
                .sort(compareQueueOrder);
            const primary = primaryCandidates[0] ?? null;
            const waitlist = groupApplications
                .filter((application) => (
                    application.conversation_state !== "closed"
                    && application.status === "waitlisted"
                    && application.id !== primary?.id
                ))
                .sort(compareQueueOrder);
            const activeIds = new Set([
                ...(primary ? [primary.id] : []),
                ...waitlist.map((application) => application.id),
            ]);
            const archive = groupApplications
                .filter((application) => !activeIds.has(application.id))
                .sort((a, b) => getConversationActivityTimestamp(b) - getConversationActivityTimestamp(a));

            return {
                jobId,
                job: groupApplications.find((application) => application.job)?.job ?? null,
                applications: groupApplications,
                primary,
                waitlist,
                archive,
                unreadCount: groupApplications.reduce((total, application) => {
                    const unreadCount = Number(application.unread_count || 0);
                    return total + (Number.isFinite(unreadCount) ? unreadCount : 0);
                }, 0),
                lastActivityAt: groupApplications.reduce(
                    (latest, application) => Math.max(latest, getConversationActivityTimestamp(application)),
                    0,
                ),
            } satisfies ProviderActivityGroup<T>;
        })
        .sort((a, b) => {
            if (a.lastActivityAt !== b.lastActivityAt) return b.lastActivityAt - a.lastActivityAt;
            return a.jobId.localeCompare(b.jobId);
        });
}

export function getActivityStatusMeta(status: string | null | undefined): ActivityStatusMeta {
    return ACTIVITY_STATUS_META[status ?? ""] ?? { label: "Status offen", tone: "neutral" };
}

export function matchesActivityFilter(
    status: string | null | undefined,
    unreadCount: number,
    filter: ActivityFilter,
) {
    if (filter === "all") return true;
    if (filter === "unread") return unreadCount > 0;
    if (filter === "active") return ACTIVE_ACTIVITY_STATUSES.has(status ?? "");
    if (filter === "waitlist") return status === "waitlisted";
    if (filter === "accepted") return status === "accepted";
    return CLOSED_ACTIVITY_STATUSES.has(status ?? "");
}

export function getConversationActivityTimestamp(application: {
    created_at: string;
    last_activity_at?: string | null;
    last_message_at?: string | null;
    agreed_at?: string | null;
}) {
    return [
        application.created_at,
        application.agreed_at,
        application.last_message_at,
        application.last_activity_at,
    ].reduce((latest, value) => {
        if (!value) return latest;
        const timestamp = new Date(value).getTime();
        return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest;
    }, 0);
}

export function getConversationPreviewTimestamp(application: {
    created_at: string;
    last_message_preview?: string | null;
    last_message_at?: string | null;
}) {
    return application.last_message_preview && application.last_message_at
        ? application.last_message_at
        : application.created_at;
}

export function formatConversationTime(value: string | null | undefined) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    if (isToday(date)) return format(date, "HH:mm", { locale: de });
    if (isYesterday(date)) return "Gestern";
    return format(date, "dd.MM.", { locale: de });
}

export function getChatDateKey(value: string | null | undefined) {
    const date = value ? new Date(value) : new Date(0);
    if (Number.isNaN(date.getTime())) return "unknown";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function buildActivityTimeline<
    TMessage extends DatedActivityTimelineItem,
    TReopenRequest extends DatedActivityTimelineItem,
>(
    messages: readonly TMessage[],
    reopenRequests: readonly TReopenRequest[],
): Array<ActivityTimelineEntry<TMessage, TReopenRequest>> {
    const unsortedEntries = [
        ...messages.map((item, sourceIndex) => ({
            type: "message" as const,
            item,
            key: `message:${item.id}`,
            createdAt: item.created_at,
            sourceIndex,
        })),
        ...reopenRequests.map((item, requestIndex) => ({
            type: "reopen_request" as const,
            item,
            key: `reopen-request:${item.id}`,
            createdAt: item.created_at,
            sourceIndex: messages.length + requestIndex,
        })),
    ];

    unsortedEntries.sort((left, right) => {
        const leftTimestamp = left.createdAt ? new Date(left.createdAt).getTime() : Number.NEGATIVE_INFINITY;
        const rightTimestamp = right.createdAt ? new Date(right.createdAt).getTime() : Number.NEGATIVE_INFINITY;
        const normalizedLeftTimestamp = Number.isFinite(leftTimestamp) ? leftTimestamp : Number.NEGATIVE_INFINITY;
        const normalizedRightTimestamp = Number.isFinite(rightTimestamp) ? rightTimestamp : Number.NEGATIVE_INFINITY;
        return normalizedLeftTimestamp - normalizedRightTimestamp || left.sourceIndex - right.sourceIndex;
    });

    let previousDateKey: string | null = null;
    return unsortedEntries.map(({ sourceIndex: _sourceIndex, ...entry }) => {
        const dateKey = getChatDateKey(entry.createdAt);
        const showDateSeparator = dateKey !== previousDateKey;
        previousDateKey = dateKey;

        return {
            ...entry,
            showDateSeparator,
        };
    });
}

export function formatChatDateLabel(value: string | null | undefined) {
    const date = value ? new Date(value) : new Date(0);
    if (Number.isNaN(date.getTime())) return "Datum unbekannt";
    if (isToday(date)) return "Heute";
    if (isYesterday(date)) return "Gestern";
    return format(date, "d. MMMM yyyy", { locale: de });
}

export function getProfileInitials(name: string | null | undefined) {
    const parts = (name ?? "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase()).join("") || "JB";
}

export function normalizeMessagePreview(content: string | null | undefined, fallback: string) {
    const normalized = content?.replace(/\s+/g, " ").trim();
    return normalized || fallback;
}

export function formatClosureReason(value: string | null | undefined) {
    const normalized = value?.replace(/\s+/g, " ").trim();
    if (!normalized || /^\d+$/.test(normalized) || normalized.length < 3) {
        return "Für diese ältere Schließung wurde kein nachvollziehbarer Grund hinterlegt.";
    }
    return `Grund: ${normalized}`;
}
