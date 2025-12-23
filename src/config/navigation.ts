export type NavTab = {
    label: string;
    href: string;
    icon?: string;
};

export const SEEKER_TABS: NavTab[] = [
    { label: "Jobs", href: "/app-home/jobs" },
    { label: "Aktivität", href: "/app-home/activity" },
    // Profile is now in header menu
    { label: "Einstellungen", href: "/app-home/settings" },
];

export const PROVIDER_TABS: NavTab[] = [
    { label: "Inserate", href: "/app-home/offers" },
    { label: "Nachrichten", href: "/app-home/messages" },
    // Profile is now in header menu
    { label: "Einstellungen", href: "/app-home/settings" },
];
