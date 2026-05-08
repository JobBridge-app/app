export type MobileNavPreference = "top" | "bottom";

export const DEFAULT_MOBILE_NAV_PREFERENCE: MobileNavPreference = "top";

export function isMobileNavPreference(value: unknown): value is MobileNavPreference {
    return value === "top" || value === "bottom";
}

export function normalizeMobileNavPreference(value: unknown): MobileNavPreference {
    return isMobileNavPreference(value) ? value : DEFAULT_MOBILE_NAV_PREFERENCE;
}
