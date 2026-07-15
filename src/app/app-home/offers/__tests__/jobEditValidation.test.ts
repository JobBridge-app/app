import { describe, expect, it } from "vitest";
import {
    parseJobEditFormData,
    resolveJobStatusTransition,
    validateJobId,
} from "../edit/[jobId]/components/jobEditValidation";

function validFormData() {
    const formData = new FormData();
    formData.set("title", "  Gartenhilfe gesucht  ");
    formData.set("description", "Unterstützung beim Rückschnitt im Garten.");
    formData.set("wage_hourly", "18.50");
    formData.set("category", "garden");
    formData.set("payment_type", "hourly");
    formData.set("reach", "internal_rheinbach");
    formData.set("status", "open");
    formData.set("job_kind", "one_time");
    formData.set("recurrence_rule", "");
    formData.set("continuity_preferred", "false");
    return formData;
}

describe("provider job edit validation", () => {
    it("normalizes a complete valid form", () => {
        const result = parseJobEditFormData(validFormData());

        expect(result).toEqual({
            success: true,
            data: {
                title: "Gartenhilfe gesucht",
                description: "Unterstützung beim Rückschnitt im Garten.",
                wage_hourly: 18.5,
                category: "garden",
                payment_type: "hourly",
                reach: "internal_rheinbach",
                status: "open",
                job_kind: "one_time",
                recurrence_rule: null,
                continuity_preferred: false,
            },
        });
    });

    it("validates recurring work and its continuity preference", () => {
        const recurring = validFormData();
        recurring.set("job_kind", "recurring");
        recurring.set("recurrence_rule", "biweekly");
        recurring.set("continuity_preferred", "true");

        const result = parseJobEditFormData(recurring);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toMatchObject({
                job_kind: "recurring",
                recurrence_rule: "biweekly",
                continuity_preferred: true,
            });
        }

        recurring.set("recurrence_rule", "");
        expect(parseJobEditFormData(recurring).success).toBe(false);
    });

    it("rejects unexpected fields and protected submitted statuses", () => {
        const unknownField = validFormData();
        unknownField.set("posted_by", "another-user");
        expect(parseJobEditFormData(unknownField).success).toBe(false);

        const protectedStatus = validFormData();
        protectedStatus.set("status", "reserved");
        expect(parseJobEditFormData(protectedStatus).success).toBe(false);
    });

    it("preserves workflow-owned statuses when no status field is submitted", () => {
        expect(resolveJobStatusTransition("reserved", undefined)).toEqual({
            success: true,
            status: "reserved",
        });
        expect(resolveJobStatusTransition("reviewing", undefined)).toEqual({
            success: true,
            status: "reviewing",
        });
        expect(resolveJobStatusTransition("filled", undefined)).toEqual({
            success: true,
            status: "filled",
        });
    });

    it("rejects unsafe lifecycle transitions", () => {
        expect(resolveJobStatusTransition("reserved", "open").success).toBe(false);
        expect(resolveJobStatusTransition("open", "draft").success).toBe(false);
        expect(resolveJobStatusTransition("draft", "open")).toEqual({ success: true, status: "open" });
    });

    it("requires a valid UUID", () => {
        expect(validateJobId("not-a-uuid").success).toBe(false);
        expect(validateJobId("2f582c2a-7d32-4c1a-88e8-f15ec7f5893c").success).toBe(true);
    });
});
