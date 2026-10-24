import { afterEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { sealGoogleSecret, openGoogleSecret } from "./google-calendar-crypto";

afterEach(() => vi.unstubAllEnvs());
describe("Google credential encryption boundary", () => {
  it("round-trips credentials only in their original connection context", () => {
    vi.stubEnv(
      "GOOGLE_CALENDAR_ENCRYPTION_KEY",
      randomBytes(32).toString("base64"),
    );
    const payload = { refresh_token: "fictional-token" };
    const stored = sealGoogleSecret(payload, "connection-a");
    expect(stored).not.toContain("fictional-token");
    expect(openGoogleSecret(stored, "connection-a")).toEqual(payload);
    expect(() => openGoogleSecret(stored, "connection-b")).toThrow();
    const modified = Buffer.from(stored, "base64url");
    modified[modified.length - 1] ^= 1;
    expect(() =>
      openGoogleSecret(modified.toString("base64url"), "connection-a"),
    ).toThrow();
  });
  it("rejects missing or invalid key configuration", () => {
    vi.stubEnv("GOOGLE_CALENDAR_ENCRYPTION_KEY", "");
    expect(() => sealGoogleSecret({}, "state")).toThrow();
    vi.stubEnv("GOOGLE_CALENDAR_ENCRYPTION_KEY", "short");
    expect(() => sealGoogleSecret({}, "state")).toThrow();
  });
});
