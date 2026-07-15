import { PersonalNotificationCenter, type PersonalNotificationItem } from "@/components/notifications/PersonalNotificationCenter";
import { requireCompleteProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";

type NotificationsSearchParams = Record<string, string | string[] | undefined>;

const NOTIFICATIONS_PAGE_PARAM = "notificationsPage";
const NOTIFICATIONS_PAGE_SIZE = 25;
const MAX_NOTIFICATIONS_PAGE = 40;

function parseNotificationsPage(value: string | string[] | undefined) {
    if (typeof value !== "string" || !/^\d{1,3}$/.test(value)) return 1;
    const page = Number(value);
    if (!Number.isSafeInteger(page) || page < 1) return 1;
    return Math.min(page, MAX_NOTIFICATIONS_PAGE);
}

export default async function NotificationsPage({
    searchParams,
}: {
    searchParams?: Promise<NotificationsSearchParams>;
}) {
    const paramsPromise: Promise<NotificationsSearchParams> = searchParams ?? Promise.resolve({});
    const [{ profile }, params] = await Promise.all([
        requireCompleteProfile(),
        paramsPromise,
    ]);
    const notificationsPage = parseNotificationsPage(params[NOTIFICATIONS_PAGE_PARAM]);
    const visibleLimit = notificationsPage * NOTIFICATIONS_PAGE_SIZE;
    const supabase = await supabaseServer();
    const [notificationsResult, unreadResult] = await Promise.all([
        supabase
            .from("notifications")
            .select("id, type, title, body, data, created_at, read_at", { count: "exact" })
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .range(0, visibleLimit - 1),
        supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", profile.id)
            .is("read_at", null),
    ]);
    const initialLoadError = Boolean(notificationsResult.error || unreadResult.error);
    const notifications = notificationsResult.error
        ? []
        : (notificationsResult.data ?? []) as PersonalNotificationItem[];

    return (
        <main className="notification-center-page min-h-full">
            <PersonalNotificationCenter
                key={`notifications-page-${notificationsPage}`}
                currentUserId={profile.id}
                initialNotifications={notifications}
                initialUnreadCount={unreadResult.error ? 0 : unreadResult.count ?? 0}
                initialTotalCount={notificationsResult.error
                    ? 0
                    : notificationsResult.count ?? notifications.length}
                initialLoadError={initialLoadError}
                visibleLimit={visibleLimit}
                pagination={{
                    pathname: "/app-home/notifications",
                    searchParams: params,
                    pageParam: NOTIFICATIONS_PAGE_PARAM,
                    nextPage: notificationsPage + 1,
                    canAdvance: notificationsPage < MAX_NOTIFICATIONS_PAGE,
                }}
            />
        </main>
    );
}
