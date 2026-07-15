import { describe, expect, it } from "vitest";
import {
    buildActivityTimeline,
    formatConversationTime,
    formatClosureReason,
    getActivityStatusMeta,
    getChatDateKey,
    getConversationActivityTimestamp,
    getConversationPreviewTimestamp,
    getProfileInitials,
    groupProviderActivities,
    matchesActivityFilter,
    normalizeMessagePreview,
    resolveReopenApplicationPatch,
} from "@/lib/activity/chat";

describe("activity conversation helpers", () => {
    it("maps every operational status to understandable copy", () => {
        expect(getActivityStatusMeta("negotiating")).toEqual({ label: "Im Gespräch", tone: "brand" });
        expect(getActivityStatusMeta("accepted")).toEqual({ label: "Termin vereinbart", tone: "success" });
        expect(getActivityStatusMeta("auto_rejected")).toEqual({ label: "Anderweitig vergeben", tone: "neutral" });
        expect(getActivityStatusMeta("unknown")).toEqual({ label: "Status offen", tone: "neutral" });
    });

    it("separates unread, active, waitlist, accepted and archived conversations", () => {
        expect(matchesActivityFilter("submitted", 2, "unread")).toBe(true);
        expect(matchesActivityFilter("negotiating", 0, "active")).toBe(true);
        expect(matchesActivityFilter("waitlisted", 0, "waitlist")).toBe(true);
        expect(matchesActivityFilter("accepted", 0, "accepted")).toBe(true);
        expect(matchesActivityFilter("withdrawn", 0, "closed")).toBe(true);
        expect(matchesActivityFilter("submitted", 0, "closed")).toBe(false);
    });

    it("sorts by the newest meaningful conversation event", () => {
        expect(getConversationActivityTimestamp({
            created_at: "2026-07-10T10:00:00.000Z",
            agreed_at: "2026-07-11T10:00:00.000Z",
            last_message_at: "2026-07-12T10:00:00.000Z",
            last_activity_at: "2026-07-11T12:00:00.000Z",
        })).toBe(new Date("2026-07-12T10:00:00.000Z").getTime());
    });

    it("keeps the inbox preview text and timestamp on the same message", () => {
        expect(getConversationPreviewTimestamp({
            created_at: "2026-07-10T10:00:00.000Z",
            last_message_preview: "Hallo",
            last_message_at: "2026-07-12T10:00:00.000Z",
        })).toBe("2026-07-12T10:00:00.000Z");

        expect(getConversationPreviewTimestamp({
            created_at: "2026-07-10T10:00:00.000Z",
            last_message_preview: null,
            last_message_at: null,
        })).toBe("2026-07-10T10:00:00.000Z");
    });

    it("normalizes names, dates and message previews safely", () => {
        expect(getProfileInitials("Rezan Yalçın")).toBe("RY");
        expect(getProfileInitials(" ")).toBe("JB");
        expect(getChatDateKey("invalid")).toBe("unknown");
        expect(formatConversationTime("invalid")).toBe("");
        expect(normalizeMessagePreview("  Hallo\n  zusammen ", "Fallback")).toBe("Hallo zusammen");
        expect(normalizeMessagePreview("", "Fallback")).toBe("Fallback");
        expect(formatClosureReason("1161")).toBe("Für diese ältere Schließung wurde kein nachvollziehbarer Grund hinterlegt.");
        expect(formatClosureReason("Passt zeitlich nicht")).toBe("Grund: Passt zeitlich nicht");
    });

    it("merges messages and reopen requests chronologically with one separator per date", () => {
        const timeline = buildActivityTimeline(
            [
                { id: "message-later", created_at: "2026-07-15T09:00:00.000Z", content: "Morgen" },
                { id: "message-first", created_at: "2026-07-14T08:00:00.000Z", content: "Start" },
            ],
            [
                { id: "request-between", created_at: "2026-07-14T10:00:00.000Z", message: "Bitte wieder öffnen" },
            ],
        );

        expect(timeline.map((entry) => ({
            type: entry.type,
            id: entry.item.id,
            showDateSeparator: entry.showDateSeparator,
        }))).toEqual([
            { type: "message", id: "message-first", showDateSeparator: true },
            { type: "reopen_request", id: "request-between", showDateSeparator: false },
            { type: "message", id: "message-later", showDateSeparator: true },
        ]);
    });

    it("groups the provider inbox by job with one primary and an ordered compact waitlist", () => {
        const groups = groupProviderActivities([
            {
                id: "waiting-later",
                job_id: "job-a",
                job: { id: "job-a", title: "Gartenhilfe" },
                status: "waitlisted",
                conversation_state: "open",
                is_primary: false,
                queue_position: 4,
                created_at: "2026-07-10T12:00:00.000Z",
                last_activity_at: "2026-07-10T12:00:00.000Z",
                unread_count: 2,
            },
            {
                id: "primary",
                job_id: "job-a",
                job: { id: "job-a", title: "Gartenhilfe" },
                status: "negotiating",
                conversation_state: "open",
                is_primary: true,
                queue_position: 1,
                created_at: "2026-07-10T10:00:00.000Z",
                last_activity_at: "2026-07-10T13:00:00.000Z",
                unread_count: 1,
            },
            {
                id: "waiting-earlier",
                job_id: "job-a",
                job: { id: "job-a", title: "Gartenhilfe" },
                status: "waitlisted",
                conversation_state: "open",
                is_primary: false,
                queue_position: 2,
                created_at: "2026-07-10T11:00:00.000Z",
                last_activity_at: "2026-07-10T11:00:00.000Z",
                unread_count: 0,
            },
            {
                id: "archived",
                job_id: "job-a",
                job: { id: "job-a", title: "Gartenhilfe" },
                status: "withdrawn",
                conversation_state: "closed",
                is_primary: false,
                queue_position: 3,
                created_at: "2026-07-09T10:00:00.000Z",
                last_activity_at: "2026-07-09T12:00:00.000Z",
                unread_count: 0,
            },
        ]);

        expect(groups).toHaveLength(1);
        expect(groups[0].primary?.id).toBe("primary");
        expect(groups[0].waitlist.map((application, index) => ({
            id: application.id,
            visibleRank: index + 1,
        }))).toEqual([
            { id: "waiting-earlier", visibleRank: 1 },
            { id: "waiting-later", visibleRank: 2 },
        ]);
        expect(groups[0].archive.map((application) => application.id)).toEqual(["archived"]);
        expect(groups[0].unreadCount).toBe(3);
    });

    it("rebuilds a provider group deterministically after automatic promotion", () => {
        const groups = groupProviderActivities([
            {
                id: "previous-primary",
                job_id: "job-a",
                job: { id: "job-a", title: "Gartenhilfe" },
                status: "withdrawn",
                conversation_state: "closed",
                is_primary: false,
                queue_position: 1,
                created_at: "2026-07-10T10:00:00.000Z",
                last_activity_at: "2026-07-11T10:00:00.000Z",
            },
            {
                id: "promoted",
                job_id: "job-a",
                job: { id: "job-a", title: "Gartenhilfe" },
                status: "negotiating",
                conversation_state: "open",
                is_primary: true,
                queue_position: 2,
                created_at: "2026-07-10T11:00:00.000Z",
                last_activity_at: "2026-07-11T10:00:00.000Z",
            },
            {
                id: "next-waiting",
                job_id: "job-a",
                job: { id: "job-a", title: "Gartenhilfe" },
                status: "waitlisted",
                conversation_state: "open",
                is_primary: false,
                queue_position: 3,
                created_at: "2026-07-10T12:00:00.000Z",
                last_activity_at: "2026-07-10T12:00:00.000Z",
            },
        ]);

        expect(groups[0].primary?.id).toBe("promoted");
        expect(groups[0].waitlist[0].id).toBe("next-waiting");
        expect(groups[0].waitlist[0].queue_position).toBe(3);
        expect(groups[0].archive[0].id).toBe("previous-primary");
    });

    it("uses the canonical application state when a reopen already happened elsewhere", () => {
        expect(resolveReopenApplicationPatch({
            unchanged: true,
            application: {
                conversation_state: "open",
                status: "waitlisted",
                is_primary: false,
            },
        })).toMatchObject({
            conversation_state: "open",
            status: "waitlisted",
            is_primary: false,
        });

        expect(resolveReopenApplicationPatch({ unchanged: true })).toBeNull();
        expect(() => resolveReopenApplicationPatch({ ok: true })).toThrow(
            "Der neue Gesprächsstatus konnte nicht bestätigt werden.",
        );
    });
});
