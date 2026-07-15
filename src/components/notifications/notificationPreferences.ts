export type DigestFrequency = "instant" | "daily" | "weekly";

export type NotificationPreferences = {
    in_app_enabled: boolean;
    in_app_application_updates: boolean;
    in_app_messages: boolean;
    in_app_waitlist_updates: boolean;
    in_app_appointments: boolean;
    email_enabled: boolean;
    email_application_updates: boolean;
    email_messages: boolean;
    email_job_updates: boolean;
    email_waitlist_updates: boolean;
    email_appointments: boolean;
    digest_frequency: DigestFrequency;
};

export type BooleanNotificationPreference = Exclude<keyof NotificationPreferences, "digest_frequency">;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
    in_app_enabled: true,
    in_app_application_updates: true,
    in_app_messages: true,
    in_app_waitlist_updates: true,
    in_app_appointments: true,
    email_enabled: true,
    email_application_updates: true,
    email_messages: true,
    email_job_updates: true,
    email_waitlist_updates: true,
    email_appointments: true,
    digest_frequency: "instant",
};

function readBoolean(source: Record<string, unknown>, key: BooleanNotificationPreference) {
    return typeof source[key] === "boolean"
        ? source[key] as boolean
        : DEFAULT_NOTIFICATION_PREFERENCES[key];
}

export function normalizeNotificationPreferences(value: unknown): NotificationPreferences {
    const source = typeof value === "object" && value !== null && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
    const frequency = source.digest_frequency;

    return {
        in_app_enabled: readBoolean(source, "in_app_enabled"),
        in_app_application_updates: readBoolean(source, "in_app_application_updates"),
        in_app_messages: readBoolean(source, "in_app_messages"),
        in_app_waitlist_updates: readBoolean(source, "in_app_waitlist_updates"),
        in_app_appointments: readBoolean(source, "in_app_appointments"),
        email_enabled: readBoolean(source, "email_enabled"),
        email_application_updates: readBoolean(source, "email_application_updates"),
        email_messages: readBoolean(source, "email_messages"),
        email_job_updates: readBoolean(source, "email_job_updates"),
        email_waitlist_updates: readBoolean(source, "email_waitlist_updates"),
        email_appointments: readBoolean(source, "email_appointments"),
        digest_frequency: frequency === "daily" || frequency === "weekly" ? frequency : "instant",
    };
}
