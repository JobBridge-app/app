import { describe, expect, it } from "vitest";
import {
    DEFAULT_NOTIFICATION_PREFERENCES,
    normalizeNotificationPreferences,
} from "@/components/notifications/notificationPreferences";
import { getNotificationRoute } from "@/components/notifications/notificationRouting";

describe("notification routing", () => {
    it("allows and preserves known consumer-app destinations", () => {
        expect(getNotificationRoute({
            route: "/app-home/activities?conversation=0f33c4a1-3e79-4a9f-8867-00d23dd2ae34",
        })).toBe("/app-home/activities?conversation=0f33c4a1-3e79-4a9f-8867-00d23dd2ae34");
        expect(getNotificationRoute({ route: "/app-home/offers/offer-id" })).toBe("/app-home/offers/offer-id");
    });

    it("canonicalizes legacy notification destinations", () => {
        expect(getNotificationRoute({ route: "/notifications" })).toBe("/app-home/notifications");
        expect(getNotificationRoute({ route: "/notifications/settings?from=center" }))
            .toBe("/app-home/settings/notifications?from=center");
        expect(getNotificationRoute({ route: "/app-home/notifications/settings" }))
            .toBe("/app-home/settings/notifications");
    });

    it("rejects external, malformed and non-consumer destinations", () => {
        for (const route of [
            "https://example.com/app-home/jobs",
            "//example.com/app-home/jobs",
            "javascript:alert(1)",
            "/admin/users",
            "/app-home/jobs-archive",
            "/app-home/jobs/../admin",
            "/app-home\\jobs",
        ]) {
            expect(getNotificationRoute({ route })).toBeNull();
        }
        expect(getNotificationRoute(null)).toBeNull();
        expect(getNotificationRoute({ route: 42 })).toBeNull();
    });
});

describe("notification preference normalization", () => {
    it("uses safe defaults for profiles without a preference row", () => {
        expect(normalizeNotificationPreferences(null)).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    });

    it("preserves explicit opt-outs and normalizes an invalid digest", () => {
        expect(normalizeNotificationPreferences({
            in_app_enabled: false,
            in_app_messages: false,
            email_enabled: false,
            email_appointments: false,
            digest_frequency: "monthly",
        })).toMatchObject({
            in_app_enabled: false,
            in_app_messages: false,
            email_enabled: false,
            email_appointments: false,
            digest_frequency: "instant",
        });
    });

    it("accepts supported daily and weekly digests", () => {
        expect(normalizeNotificationPreferences({ digest_frequency: "daily" }).digest_frequency).toBe("daily");
        expect(normalizeNotificationPreferences({ digest_frequency: "weekly" }).digest_frequency).toBe("weekly");
    });
});
