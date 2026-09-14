import { describe, expect, it } from "vitest";
import { defaultDisplayName, displayNameError, normalizeDisplayName } from "./profile";

describe("User Profile names", () => {
  it("trims a display name", () => {
    expect(normalizeDisplayName("  Rowan  ")).toBe("Rowan");
  });

  it("rejects a blank display name", () => {
    expect(displayNameError(normalizeDisplayName("   "))).toBe("Enter your name.");
  });

  it("accepts 1 through 50 characters", () => {
    expect(displayNameError("R")).toBeNull();
    expect(displayNameError("R".repeat(50))).toBeNull();
    expect(displayNameError("R".repeat(51))).toMatch(/50/);
  });

  it("prefills from the email local part", () => {
    expect(defaultDisplayName("rowan@example.com")).toBe("rowan");
  });
});
