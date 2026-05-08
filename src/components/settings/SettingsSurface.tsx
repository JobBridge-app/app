import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeModeToggle } from "@/components/settings/ThemeModeToggle";
import { MobileNavPreferenceControl } from "@/components/settings/MobileNavPreferenceControl";
import type { MobileNavPreference } from "@/lib/mobile-nav-preference";

type SettingsSurfaceProps = {
    mobileNavPreference: MobileNavPreference;
    themePreference?: "light" | "dark" | "system";
};

export function SettingsSurface({ mobileNavPreference, themePreference = "system" }: SettingsSurfaceProps) {
    const navigationStatus = mobileNavPreference === "bottom" ? "Dock unten" : "Tabs oben";
    const themeStatus = {
        dark: "Dunkel",
        light: "Hell",
        system: "System",
    }[themePreference];

    return (
        <div className="mx-auto w-full max-w-5xl px-4 pb-14 pt-8 md:px-6">
            <header className="border-b border-white/[0.06] pb-6">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                        Einstellungen
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
                        Lege fest, wie JobBridge auf deinen Geräten aussieht und navigiert.
                    </p>
                </div>
            </header>

            <div className="mt-7 space-y-4 md:space-y-0 md:overflow-hidden md:rounded-[1.65rem] md:border md:border-white/[0.07] md:bg-[#090A0F]/86 md:shadow-[0_24px_80px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.035)]">
                <SettingsGroup
                    id="darstellung"
                    title="Darstellung"
                    description="Alles, was das visuelle Verhalten der App betrifft."
                >
                    <SettingsRow
                        title="Design-Modus"
                        description={themeStatus}
                    >
                        <ThemeModeToggle />
                    </SettingsRow>
                </SettingsGroup>

                <SettingsGroup
                    id="navigation"
                    title="Navigation"
                    description="Nur für Handys. Desktop und Tablet bleiben unverändert."
                >
                    <SettingsRow
                        title="Handy-Navigation"
                        description={navigationStatus}
                    >
                        <MobileNavPreferenceControl initialPreference={mobileNavPreference} />
                    </SettingsRow>
                </SettingsGroup>

                <SettingsGroup
                    id="konto"
                    title="Konto"
                    description="Weiterführende Einstellungen, die eigene Seiten brauchen."
                >
                    <SettingsLinkRow
                        href="/app-home/profile"
                        title="Profil"
                        description="Persönliche Daten, Sichtbarkeit und Verifizierung."
                    />
                    <SettingsLinkRow
                        href="/app-home/settings/notifications"
                        title="Benachrichtigungen"
                        description="E-Mail, Push und wichtige Updates."
                    />
                    <SettingsLinkRow
                        href="/app-home/settings/security"
                        title="Sicherheit"
                        description="Passwort, Login und Kontoschutz."
                    />
                </SettingsGroup>
            </div>
        </div>
    );
}

function SettingsGroup({
    id,
    title,
    description,
    children,
}: {
    id: string;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <section
            id={id}
            className="scroll-mt-28 overflow-hidden rounded-[1.35rem] border border-white/[0.07] bg-[#090A0F]/86 shadow-[0_18px_60px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.035)] md:rounded-none md:border-0 md:border-b md:border-white/[0.055] md:bg-transparent md:shadow-none md:last:border-b-0"
        >
            <div className="grid md:grid-cols-[14rem_minmax(0,1fr)]">
                <div className="border-b border-white/[0.055] bg-white/[0.012] px-5 py-5 md:border-b-0 md:border-r md:bg-transparent md:px-6 md:py-6">
                    <h2 className="text-sm font-semibold text-white">{title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
                </div>
                <div className="divide-y divide-white/[0.055]">
                    {children}
                </div>
            </div>
        </section>
    );
}

function SettingsRow({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,1fr)_minmax(17rem,0.95fr)] md:items-center md:px-6">
            <div>
                <h3 className="text-[15px] font-semibold text-slate-100">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
            </div>
            <div className="min-w-0">{children}</div>
        </div>
    );
}

function SettingsLinkRow({
    href,
    title,
    description,
}: {
    href: string;
    title: string;
    description: string;
}) {
    return (
        <Link
            href={href}
            className="group grid gap-4 px-5 py-5 transition-colors hover:bg-white/[0.025] md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-6"
        >
            <div>
                <h3 className="text-[15px] font-semibold text-slate-100 transition-colors group-hover:text-white">
                    {title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
            </div>
            <span className="inline-flex h-9 w-fit items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 text-sm font-semibold text-slate-400 transition-colors group-hover:border-white/14 group-hover:bg-white/[0.05] group-hover:text-white">
                Öffnen
                <ChevronRight size={15} />
            </span>
        </Link>
    );
}
