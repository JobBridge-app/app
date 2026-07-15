import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseClient", () => ({
    supabaseBrowser: {},
}));

import {
    getActivityAttentionLabel,
    getActivityAttentionSummary,
    getGroupedActivityAttentionSummary,
    matchesActivityCommandCenterFilter,
} from "@/components/activity/ActivityCommandCenter";

describe("ActivityCommandCenter reopen attention", () => {
    it("keeps a closed conversation with a pending reopen request in active and attention filters", () => {
        const application = {
            status: "withdrawn",
            unread_count: 0,
            pending_reopen_count: 1,
        };

        expect(matchesActivityCommandCenterFilter(application, "active")).toBe(true);
        expect(matchesActivityCommandCenterFilter(application, "unread")).toBe(true);
        expect(matchesActivityCommandCenterFilter(application, "all")).toBe(true);
        expect(matchesActivityCommandCenterFilter(application, "closed")).toBe(true);
    });

    it("does not treat an ordinary closed conversation as active attention", () => {
        const application = {
            status: "withdrawn",
            unread_count: 0,
            pending_reopen_count: 0,
        };

        expect(matchesActivityCommandCenterFilter(application, "active")).toBe(false);
        expect(matchesActivityCommandCenterFilter(application, "unread")).toBe(false);
        expect(matchesActivityCommandCenterFilter(application, "closed")).toBe(true);
    });

    it("bundles unread messages from a closed conversation into active", () => {
        const application = {
            status: "withdrawn",
            unread_count: 1,
            pending_reopen_count: 0,
        };

        expect(matchesActivityCommandCenterFilter(application, "active")).toBe(true);
        expect(matchesActivityCommandCenterFilter(application, "unread")).toBe(true);
        expect(matchesActivityCommandCenterFilter(application, "all")).toBe(true);
    });

    it("combines message and reopen attention without mislabelling the accessible count", () => {
        const summary = getActivityAttentionSummary({
            unread_count: 2,
            pending_reopen_count: 1,
        });

        expect(summary).toEqual({
            unreadCount: 2,
            pendingReopenCount: 1,
            totalCount: 3,
            kind: "mixed",
        });
        expect(getActivityAttentionLabel(summary)).toBe(
            "2 ungelesene Nachrichten und 1 offene Öffnungsanfrage",
        );
    });

    it("aggregates provider job attention across conversations", () => {
        expect(getGroupedActivityAttentionSummary([
            { unread_count: 2, pending_reopen_count: 0 },
            { unread_count: 0, pending_reopen_count: 1 },
            { unread_count: -1, pending_reopen_count: "invalid" },
        ])).toEqual({
            unreadCount: 2,
            pendingReopenCount: 1,
            totalCount: 3,
            kind: "mixed",
        });
    });
});
