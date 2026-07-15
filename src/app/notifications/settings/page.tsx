import { redirect } from "next/navigation";

export default function LegacyNotificationSettingsPage() {
    redirect("/app-home/settings/notifications");
}
