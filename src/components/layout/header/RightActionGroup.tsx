import { ProfileChip } from "../ProfileChip";
import { NotificationsPopover } from "@/components/notifications/NotificationsPopover";
import type { AppHeaderProfile, HeaderNotificationItem } from "@/lib/types/jobbridge";

export function RightActionGroup({
    profile,
    isDemo,
    isStaff,
    accountEmail,
    unreadCount,
    notificationsPreview,
}: {
    profile: AppHeaderProfile | null;
    isDemo?: boolean;
    isStaff: boolean;
    accountEmail: string | null;
    unreadCount: number;
    notificationsPreview: HeaderNotificationItem[];
}) {
    return (
        <div className="flex items-center gap-2 min-[420px]:gap-3">
            <NotificationsPopover
                initialUnreadCount={unreadCount}
                initialNotifications={notificationsPreview}
            />
            <ProfileChip
                profile={profile}
                isDemo={isDemo}
                isStaff={isStaff}
                accountEmail={accountEmail}
            />
        </div>
    );
}
