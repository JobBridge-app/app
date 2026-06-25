import { SettingsSurface } from "@/components/settings/SettingsSurface";
import { requireCompleteProfile } from "@/lib/auth";
import { normalizeMobileNavPreference } from "@/lib/mobile-nav-preference";
import { normalizeThemePreference } from "@/lib/theme-preference";

export default async function SettingsPage() {
    const { profile } = await requireCompleteProfile();
    const mobileNavPreference = normalizeMobileNavPreference(profile.mobile_nav_preference);
    const themePreference = normalizeThemePreference(profile.theme_preference);

    return (
        <SettingsSurface
            mobileNavPreference={mobileNavPreference}
            themePreference={themePreference}
        />
    );
}
