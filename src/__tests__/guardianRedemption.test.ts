import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, rpc } = vi.hoisted(() => ({
    getUser: vi.fn(),
    rpc: vi.fn(),
}));

vi.mock("@/lib/supabaseServer", () => ({
    supabaseServer: vi.fn(async () => ({
        auth: { getUser },
        rpc,
    })),
}));

import { redeemGuardianInvitation } from "@/app/guardian/access/actions";

describe("guardian invitation redemption", () => {
    beforeEach(() => {
        getUser.mockReset();
        rpc.mockReset();
        vi.spyOn(console, "error").mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("rejects malformed tokens before accessing Supabase", async () => {
        const result = await redeemGuardianInvitation("  ");

        expect(result.success).toBe(false);
        expect(getUser).not.toHaveBeenCalled();
        expect(rpc).not.toHaveBeenCalled();
    });

    it("completes a valid redemption", async () => {
        getUser.mockResolvedValue({ data: { user: { id: "guardian-1" } }, error: null });
        rpc.mockResolvedValue({ data: { success: true }, error: null });

        await expect(redeemGuardianInvitation("valid-token")).resolves.toEqual({ success: true });
        expect(rpc).toHaveBeenCalledWith("redeem_guardian_invitation", {
            token_input: "valid-token",
        });
    });

    it("keeps RPC diagnostics out of the browser-facing result", async () => {
        const technicalMessage = "permission denied for relation guardian_relationships";
        getUser.mockResolvedValue({ data: { user: { id: "guardian-1" } }, error: null });
        rpc.mockResolvedValue({
            data: null,
            error: {
                code: "42501",
                message: technicalMessage,
                details: "internal policy details",
                hint: "internal hint",
            },
        });

        const result = await redeemGuardianInvitation("valid-token");

        expect(result.success).toBe(false);
        expect(result.success ? "" : result.message).not.toContain(technicalMessage);
        expect(console.error).toHaveBeenCalled();
    });

    it("does not expose a rejection reason returned by the RPC", async () => {
        const internalReason = "invitation row failed internal policy check";
        getUser.mockResolvedValue({ data: { user: { id: "guardian-1" } }, error: null });
        rpc.mockResolvedValue({ data: { success: false, error: internalReason }, error: null });

        const result = await redeemGuardianInvitation("valid-token");

        expect(result.success).toBe(false);
        expect(result.success ? "" : result.message).not.toContain(internalReason);
        expect(console.error).toHaveBeenCalled();
    });
});
