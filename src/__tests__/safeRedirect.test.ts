import { describe, expect, it } from "vitest";
import { getSafeInternalRedirect, safeInternalRedirectOr } from "@/lib/safe-redirect";

describe("safe internal redirects", () => {
  it("preserves normal same-origin app destinations", () => {
    expect(getSafeInternalRedirect("/app-home/activities?conversation=123#chat"))
      .toBe("/app-home/activities?conversation=123#chat");
    expect(getSafeInternalRedirect("/guardian/access?token=abc"))
      .toBe("/guardian/access?token=abc");
  });

  it("rejects absolute, protocol-relative and malformed destinations", () => {
    for (const destination of [
      "https://evil.example/phish",
      "//evil.example/phish",
      "\\\\evil.example\\phish",
      "javascript:alert(1)",
      "/app-home\\@evil.example",
      "\u0000/app-home",
    ]) {
      expect(getSafeInternalRedirect(destination)).toBeNull();
    }
  });

  it("uses a fixed internal fallback for rejected input", () => {
    expect(safeInternalRedirectOr("https://evil.example", "/app-home"))
      .toBe("/app-home");
  });
});
