import { describe, expect, it } from "vitest";
import {
    isValidMaxDistanceKm,
    MAX_DISTANCE_KM_OPTIONS,
} from "@/lib/jobs/sortFilter";

describe("max distance filter options", () => {
    it("accepts every supported distance and the unbounded state", () => {
        for (const distance of [...MAX_DISTANCE_KM_OPTIONS, null]) {
            expect(isValidMaxDistanceKm(distance)).toBe(true);
        }
    });

    it("rejects stale or malformed persisted values", () => {
        for (const distance of [0, 25, 100, undefined, "20", Number.NaN]) {
            expect(isValidMaxDistanceKm(distance)).toBe(false);
        }
    });
});
