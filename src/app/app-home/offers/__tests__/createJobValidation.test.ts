import { describe, expect, it } from "vitest";
import { parseCreateJobCompensation } from "../createJobValidation";

describe("provider job creation validation", () => {
    it("accepts a finite positive compensation", () => {
        expect(parseCreateJobCompensation("18.50")).toEqual({ success: true, data: 18.5 });
    });

    it.each([null, "", "not-a-number", "Infinity"])("rejects an invalid compensation (%s)", (value) => {
        expect(parseCreateJobCompensation(value).success).toBe(false);
    });

    it.each(["0", "-1", "100000.01"])("rejects an out-of-range compensation (%s)", (value) => {
        expect(parseCreateJobCompensation(value).success).toBe(false);
    });
});
