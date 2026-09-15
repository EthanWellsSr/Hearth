import { describe, expect, it } from "vitest";
import {
  invitePath,
  inviteShareContent,
  inviteUrl,
  loginPath,
  normalizeInviteCode,
} from "./invite";

describe("Invitation Links", () => {
  it("normalizes readable Invite Codes", () => {
    expect(normalizeInviteCode(" hearth42 ")).toBe("HEARTH42");
    expect(normalizeInviteCode("BAD-CODE")).toBeNull();
    expect(normalizeInviteCode("MEADOW1O")).toBeNull();
  });

  it("builds an invitation path and absolute URL", () => {
    expect(invitePath("hearth42")).toBe("/invite/HEARTH42");
    expect(inviteUrl("HEARTH42", "https://hearth.example/")).toBe(
      "https://hearth.example/invite/HEARTH42"
    );
  });

  it("shares the Household name and a clickable invitation URL", () => {
    expect(
      inviteShareContent("Wells", "HEARTH42", "https://hearth.example")
    ).toEqual({
      title: "Join my Household in Hearth",
      text: "You’re invited to join the Wells Household on Hearth.",
      url: "https://hearth.example/invite/HEARTH42",
    });
  });

  it("preserves an invitation through login messages and errors", () => {
    expect(loginPath({ invite: "hearth42", error: "Try again" })).toBe(
      "/login?invite=HEARTH42&error=Try+again"
    );
    expect(loginPath({ invite: "BAD-CODE", message: "Check your email" })).toBe(
      "/login?message=Check+your+email"
    );
  });
});
