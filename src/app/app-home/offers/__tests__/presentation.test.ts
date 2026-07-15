import { describe, expect, it } from "vitest";
import {
    formatProviderApplicationSummary,
    formatProviderCompensation,
    getProviderJobPrimaryAction,
    getProviderJobStatusMeta,
} from "../presentation";

describe("provider offer presentation", () => {
    it.each([
        ["draft", "Entwurf"],
        ["open", "Aktiv"],
        ["reviewing", "In Prüfung"],
        ["reserved", "Reserviert"],
        ["filled", "Vergeben"],
        ["closed", "Archiviert"],
    ] as const)("maps %s to a German label", (status, expectedLabel) => {
        expect(getProviderJobStatusMeta(status).label).toBe(expectedLabel);
    });

    it("only derives 'In Abstimmung' from an active negotiation", () => {
        expect(getProviderJobStatusMeta("open", ["rejected"]).label).toBe("Aktiv");
        expect(getProviderJobStatusMeta("open", ["negotiating"]).label).toBe("In Abstimmung");
        expect(getProviderJobStatusMeta("reserved", ["negotiating"]).label).toBe("Reserviert");
    });

    it("formats hourly and fixed compensation distinctly", () => {
        expect(formatProviderCompensation(18.5, "hourly")).toEqual({
            label: "Stundenlohn",
            value: "18,5 €/Std.",
        });
        expect(formatProviderCompensation(75, "fixed")).toEqual({
            label: "Pauschale",
            value: "75 € pauschal",
        });
    });

    it("distinguishes an application load failure from an empty inbox", () => {
        expect(formatProviderApplicationSummary(0, true)).toBe("Noch keine Bewerbungen eingegangen.");
        expect(formatProviderApplicationSummary(0, false)).toBe("Bewerbungen konnten gerade nicht geladen werden.");
        expect(formatProviderApplicationSummary(1, true)).toBe("Eine Bewerbung ist eingegangen.");
        expect(formatProviderApplicationSummary(3, true)).toBe("3 Bewerbungen sind eingegangen.");
    });

    it("only sends drafts directly into editing", () => {
        expect(getProviderJobPrimaryAction("draft", "job-1")).toEqual({
            href: "/app-home/offers/edit/job-1",
            label: "Bearbeiten",
            kind: "edit",
        });
        expect(getProviderJobPrimaryAction("reviewing", "job-1")).toEqual({
            href: "/app-home/offers/job-1",
            label: "Angebot öffnen",
            kind: "open",
        });
        expect(getProviderJobPrimaryAction("reserved", "job-1").kind).toBe("open");
    });
});
