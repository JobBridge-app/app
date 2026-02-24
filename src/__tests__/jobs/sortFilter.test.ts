import { describe, it, expect } from "vitest";
import {
    sortJobs,
    applyFilters,
    deriveVisibleJobs,
    DEFAULT_FILTER_STATE,
} from "@/lib/jobs/sortFilter";
import type { JobsListItem } from "@/lib/types/jobbridge";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeJob(overrides: Partial<JobsListItem> = {}): JobsListItem {
    return {
        id: "job-1",
        title: "Test Job",
        description: null,
        posted_by: "user-1",
        status: "open",
        created_at: "2024-01-01T12:00:00Z",
        market_id: "market-1",
        public_location_label: null,
        wage_hourly: 15,
        ...overrides,
    };
}

// ─── sortJobs ─────────────────────────────────────────────────────────────────

describe("sortJobs – distance", () => {
    it("sorts by distance ascending", () => {
        const jobs = [
            makeJob({ id: "a", distance_km: 10 }),
            makeJob({ id: "b", distance_km: 2 }),
            makeJob({ id: "c", distance_km: 5 }),
        ];
        const result = sortJobs(jobs, "distance");
        expect(result.map((j) => j.id)).toEqual(["b", "c", "a"]);
    });

    it("places jobs with null distance_km last", () => {
        const jobs = [
            makeJob({ id: "a", distance_km: null }),
            makeJob({ id: "b", distance_km: 3 }),
        ];
        const result = sortJobs(jobs, "distance");
        expect(result[0].id).toBe("b");
        expect(result[1].id).toBe("a");
    });

    it("places jobs with undefined distance_km last", () => {
        const jobs = [
            makeJob({ id: "a", distance_km: undefined }),
            makeJob({ id: "b", distance_km: 1 }),
        ];
        const result = sortJobs(jobs, "distance");
        expect(result[0].id).toBe("b");
        expect(result[1].id).toBe("a");
    });

    it("is stable: ties broken by created_at desc then id asc", () => {
        const jobs = [
            makeJob({ id: "b", distance_km: 5, created_at: "2024-01-02T00:00:00Z" }),
            makeJob({ id: "a", distance_km: 5, created_at: "2024-01-03T00:00:00Z" }),
            makeJob({ id: "c", distance_km: 5, created_at: "2024-01-01T00:00:00Z" }),
        ];
        const result = sortJobs(jobs, "distance");
        // Same distance → newest first → a (Jan 3) > b (Jan 2) > c (Jan 1)
        expect(result.map((j) => j.id)).toEqual(["a", "b", "c"]);
    });

    it("is stable when date also ties: falls back to id asc", () => {
        const same = "2024-01-01T12:00:00Z";
        const jobs = [
            makeJob({ id: "z", distance_km: 5, created_at: same }),
            makeJob({ id: "a", distance_km: 5, created_at: same }),
            makeJob({ id: "m", distance_km: 5, created_at: same }),
        ];
        const result = sortJobs(jobs, "distance");
        expect(result.map((j) => j.id)).toEqual(["a", "m", "z"]);
    });
});

describe("sortJobs – newest", () => {
    it("sorts by created_at descending", () => {
        const jobs = [
            makeJob({ id: "a", created_at: "2024-01-01T00:00:00Z" }),
            makeJob({ id: "b", created_at: "2024-03-01T00:00:00Z" }),
            makeJob({ id: "c", created_at: "2024-02-01T00:00:00Z" }),
        ];
        const result = sortJobs(jobs, "newest");
        expect(result.map((j) => j.id)).toEqual(["b", "c", "a"]);
    });

    it("is stable: ties broken by id asc", () => {
        const same = "2024-01-01T00:00:00Z";
        const jobs = [
            makeJob({ id: "z", created_at: same }),
            makeJob({ id: "a", created_at: same }),
        ];
        const result = sortJobs(jobs, "newest");
        expect(result.map((j) => j.id)).toEqual(["a", "z"]);
    });
});

describe("sortJobs – wage_desc", () => {
    it("sorts by wage descending", () => {
        const jobs = [
            makeJob({ id: "a", wage_hourly: 8 }),
            makeJob({ id: "b", wage_hourly: 25 }),
            makeJob({ id: "c", wage_hourly: 12 }),
        ];
        const result = sortJobs(jobs, "wage_desc");
        expect(result.map((j) => j.id)).toEqual(["b", "c", "a"]);
    });

    it("places null wage last", () => {
        const jobs = [
            makeJob({ id: "a", wage_hourly: null }),
            makeJob({ id: "b", wage_hourly: 10 }),
        ];
        const result = sortJobs(jobs, "wage_desc");
        expect(result[0].id).toBe("b");
        expect(result[1].id).toBe("a");
    });

    it("is stable on wage tie", () => {
        const jobs = [
            makeJob({ id: "b", wage_hourly: 15, created_at: "2024-01-01T00:00:00Z" }),
            makeJob({ id: "a", wage_hourly: 15, created_at: "2024-01-02T00:00:00Z" }),
        ];
        const result = sortJobs(jobs, "wage_desc");
        // Tie in wage → newest first → a (Jan 2) before b (Jan 1)
        expect(result.map((j) => j.id)).toEqual(["a", "b"]);
    });
});

describe("sortJobs – does not mutate input", () => {
    it("returns a new array without modifying the original", () => {
        const jobs = [
            makeJob({ id: "b", distance_km: 10 }),
            makeJob({ id: "a", distance_km: 1 }),
        ];
        const original = [...jobs];
        sortJobs(jobs, "distance");
        expect(jobs[0].id).toBe(original[0].id);
    });
});

// ─── applyFilters ─────────────────────────────────────────────────────────────

describe("applyFilters – categories", () => {
    it("returns all jobs when no categories selected", () => {
        const jobs = [
            makeJob({ id: "a", category: "gardening" }),
            makeJob({ id: "b", category: "cleaning" }),
        ];
        const result = applyFilters(jobs, DEFAULT_FILTER_STATE);
        expect(result).toHaveLength(2);
    });

    it("filters to matching category only", () => {
        const jobs = [
            makeJob({ id: "a", category: "gardening" }),
            makeJob({ id: "b", category: "cleaning" }),
            makeJob({ id: "c", category: "gardening" }),
        ];
        const result = applyFilters(jobs, { categories: ["gardening"], maxDistanceKm: null });
        expect(result.map((j) => j.id)).toEqual(["a", "c"]);
    });

    it("supports multi-select categories", () => {
        const jobs = [
            makeJob({ id: "a", category: "gardening" }),
            makeJob({ id: "b", category: "cleaning" }),
            makeJob({ id: "c", category: "tutoring" }),
        ];
        const result = applyFilters(jobs, {
            categories: ["gardening", "cleaning"],
            maxDistanceKm: null,
        });
        expect(result.map((j) => j.id)).toEqual(["a", "b"]);
    });

    it("treats null category as 'other'", () => {
        const jobs = [
            makeJob({ id: "a", category: null }),
            makeJob({ id: "b", category: "other" }),
            makeJob({ id: "c", category: "gardening" }),
        ];
        const result = applyFilters(jobs, { categories: ["other"], maxDistanceKm: null });
        expect(result.map((j) => j.id)).toEqual(["a", "b"]);
    });
});

describe("applyFilters – maxDistanceKm", () => {
    it("returns all when maxDistanceKm is null", () => {
        const jobs = [
            makeJob({ id: "a", distance_km: 100 }),
            makeJob({ id: "b", distance_km: 5 }),
        ];
        const result = applyFilters(jobs, { categories: [], maxDistanceKm: null });
        expect(result).toHaveLength(2);
    });

    it("hides jobs beyond the threshold", () => {
        const jobs = [
            makeJob({ id: "a", distance_km: 3 }),
            makeJob({ id: "b", distance_km: 15 }),
            makeJob({ id: "c", distance_km: 10 }),
        ];
        const result = applyFilters(jobs, { categories: [], maxDistanceKm: 10 });
        expect(result.map((j) => j.id)).toEqual(["a", "c"]);
    });

    it("hides jobs with null distance_km when filter is active", () => {
        const jobs = [
            makeJob({ id: "a", distance_km: null }),
            makeJob({ id: "b", distance_km: 5 }),
        ];
        const result = applyFilters(jobs, { categories: [], maxDistanceKm: 10 });
        expect(result.map((j) => j.id)).toEqual(["b"]);
    });

    it("hides jobs with undefined distance_km when filter is active", () => {
        const jobs = [
            makeJob({ id: "a", distance_km: undefined }),
            makeJob({ id: "b", distance_km: 5 }),
        ];
        const result = applyFilters(jobs, { categories: [], maxDistanceKm: 10 });
        expect(result.map((j) => j.id)).toEqual(["b"]);
    });
});

describe("applyFilters – combined", () => {
    it("applies both category and distance filters together", () => {
        const jobs = [
            makeJob({ id: "a", category: "gardening", distance_km: 3 }),
            makeJob({ id: "b", category: "gardening", distance_km: 20 }),
            makeJob({ id: "c", category: "cleaning", distance_km: 3 }),
        ];
        const result = applyFilters(jobs, {
            categories: ["gardening"],
            maxDistanceKm: 5,
        });
        expect(result.map((j) => j.id)).toEqual(["a"]);
    });
});

describe("applyFilters – does not mutate input", () => {
    it("returns a new array without modifying the original", () => {
        const jobs = [makeJob({ id: "a" }), makeJob({ id: "b" })];
        const original = [...jobs];
        applyFilters(jobs, DEFAULT_FILTER_STATE);
        expect(jobs).toHaveLength(original.length);
    });
});

// ─── deriveVisibleJobs ────────────────────────────────────────────────────────

describe("deriveVisibleJobs – composes filter then sort", () => {
    it("applies filter before sort: only matching jobs appear in sorted order", () => {
        const jobs = [
            makeJob({ id: "a", category: "gardening", distance_km: 5 }),
            makeJob({ id: "b", category: "cleaning", distance_km: 2 }),
            makeJob({ id: "c", category: "gardening", distance_km: 1 }),
        ];
        const result = deriveVisibleJobs(
            jobs,
            { categories: ["gardening"], maxDistanceKm: null },
            "distance"
        );
        // b excluded by category; remaining sorted by distance asc
        expect(result.map((j) => j.id)).toEqual(["c", "a"]);
    });

    it("returns all jobs sorted when no filters active (fast path)", () => {
        const jobs = [
            makeJob({ id: "a", created_at: "2024-01-01T00:00:00Z" }),
            makeJob({ id: "b", created_at: "2024-03-01T00:00:00Z" }),
        ];
        const result = deriveVisibleJobs(jobs, DEFAULT_FILTER_STATE, "newest");
        expect(result.map((j) => j.id)).toEqual(["b", "a"]);
    });

    it("changing FilterState produces a deterministic, different result", () => {
        const jobs = [
            makeJob({ id: "a", category: "gardening", distance_km: 3 }),
            makeJob({ id: "b", category: "cleaning", distance_km: 1 }),
        ];
        const all = deriveVisibleJobs(jobs, DEFAULT_FILTER_STATE, "distance");
        const filtered = deriveVisibleJobs(
            jobs,
            { categories: ["cleaning"], maxDistanceKm: null },
            "distance"
        );
        expect(all).toHaveLength(2);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].id).toBe("b");
    });

    it("returns empty array when max-distance filter removes all jobs", () => {
        const jobs = [
            makeJob({ id: "a", distance_km: 50 }),
            makeJob({ id: "b", distance_km: null }),
        ];
        const result = deriveVisibleJobs(
            jobs,
            { categories: [], maxDistanceKm: 5 },
            "distance"
        );
        expect(result).toHaveLength(0);
    });
});
