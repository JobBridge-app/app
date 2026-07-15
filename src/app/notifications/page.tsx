import { redirect } from "next/navigation";

export default function LegacyNotificationsPage() {
    redirect("/app-home/notifications");
}
