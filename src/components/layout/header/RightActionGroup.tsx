import { Bell, User } from "lucide-react";
import { Profile } from "@/lib/types";
import { ProfileChip } from "../ProfileChip"; // Reuse existing or refactor
import { NotificationsPopover } from "@/components/notifications/NotificationsPopover";

export function RightActionGroup({ profile, isDemo }: { profile: Profile | null; isDemo?: boolean }) {
    return (
        <div className="flex items-center gap-3">
            {/* Notifications */}
            <NotificationsPopover />

            {/* Profile */}
            <div className="flex items-center">
                <ProfileChip profile={profile} isDemo={isDemo} />
            </div>
        </div>
    );
}
