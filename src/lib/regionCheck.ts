export type RegionAvailabilityStatus = "live" | "not_live" | "unknown";

type RegionAvailabilityInput = {
  is_live?: boolean | null;
} | null | undefined;

export function getRegionAvailabilityStatus(region: RegionAvailabilityInput): RegionAvailabilityStatus {
  if (!region) {
    return "unknown";
  }

  // Keep empty legacy values available; only an explicit false disables a region.
  return region.is_live === false ? "not_live" : "live";
}
