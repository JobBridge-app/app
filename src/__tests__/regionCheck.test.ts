import { describe, expect, it } from "vitest";
import { getRegionAvailabilityStatus } from "@/lib/regionCheck";

describe("region availability", () => {
  it("blocks regions that are explicitly marked not live", () => {
    expect(getRegionAvailabilityStatus({ is_live: false })).toBe("not_live");
  });

  it("keeps explicitly live regions available", () => {
    expect(getRegionAvailabilityStatus({ is_live: true })).toBe("live");
  });

  it("keeps legacy empty live flags available", () => {
    expect(getRegionAvailabilityStatus({ is_live: null })).toBe("live");
    expect(getRegionAvailabilityStatus({})).toBe("live");
  });

  it("treats missing database rows as unknown", () => {
    expect(getRegionAvailabilityStatus(null)).toBe("unknown");
    expect(getRegionAvailabilityStatus(undefined)).toBe("unknown");
  });
});
