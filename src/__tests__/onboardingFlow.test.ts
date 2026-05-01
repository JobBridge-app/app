import { describe, expect, it } from "vitest";
import { getInitialOnboardingRole, mustChooseOnboardingRole } from "@/lib/onboardingFlow";
import type { Profile } from "@/lib/types";

const defaultedJobSeekerProfile = {
  id: "user-1",
  account_type: "job_seeker",
  provider_kind: null,
} as Profile;

describe("onboarding role selection", () => {
  it("does not treat the database job_seeker default as an explicit role after email confirmation", () => {
    expect(
      getInitialOnboardingRole({
        profile: defaultedJobSeekerProfile,
        forcedStep: "email-confirm",
        isJustVerified: true,
      }),
    ).toBeNull();
  });

  it("forces the role screen for incomplete authenticated profiles", () => {
    expect(mustChooseOnboardingRole("role", false)).toBe(true);
    expect(
      getInitialOnboardingRole({
        profile: defaultedJobSeekerProfile,
        forcedStep: "role",
        isJustVerified: false,
      }),
    ).toBeNull();
  });

  it("can still infer a role outside the forced onboarding path", () => {
    expect(
      getInitialOnboardingRole({
        profile: defaultedJobSeekerProfile,
        forcedStep: null,
        isJustVerified: false,
      }),
    ).toBe("youth");
  });
});
