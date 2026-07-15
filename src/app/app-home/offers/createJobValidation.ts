import { z } from "zod";

const createJobCompensationSchema = z
    .number({ error: "Bitte gib eine gültige Vergütung ein." })
    .finite("Bitte gib eine gültige Vergütung ein.")
    .positive("Die Vergütung muss größer als 0 sein.")
    .max(100000, "Die Vergütung ist zu hoch.");

export function parseCreateJobCompensation(value: FormDataEntryValue | null):
    | { success: true; data: number }
    | { success: false; error: string } {
    const normalized = typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;
    const result = createJobCompensationSchema.safeParse(normalized);

    if (!result.success) {
        return {
            success: false,
            error: result.error.issues[0]?.message ?? "Bitte gib eine gültige Vergütung ein.",
        };
    }

    return { success: true, data: result.data };
}
