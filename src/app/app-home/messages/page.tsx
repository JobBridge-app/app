import { redirect } from "next/navigation";

export default function LegacyMessagesPage() {
    redirect("/app-home/activities");
}
