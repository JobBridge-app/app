import { SettingsSurface } from "@/components/settings/SettingsSurface";
import { requireCompleteProfile } from "@/lib/auth";
import { normalizeMobileNavPreference } from "@/lib/mobile-nav-preference";

export default async function SettingsPage() {
    const { profile } = await requireCompleteProfile();
    const mobileNavPreference = normalizeMobileNavPreference(profile.mobile_nav_preference);

    return (
        <SettingsSurface
            mobileNavPreference={mobileNavPreference}
            themePreference={profile.theme_preference || "dark"}
        />
    );
}
