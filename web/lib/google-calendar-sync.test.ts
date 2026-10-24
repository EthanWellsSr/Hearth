import { describe, expect, it } from "vitest";
import {
  readGoogleChanges,
  type GoogleChangePage,
} from "./google-calendar-sync";

describe("Google incremental change-feed boundary", () => {
  it("consumes every page before accepting the new token, including deleted IDs", async () => {
    const queries: URLSearchParams[] = [];
    const pages: GoogleChangePage[] = [
      { items: [{ id: "cancelled-instance" }], nextPageToken: "page-two" },
      { nextSyncToken: "next-token" },
    ];
    const result = await readGoogleChanges(
      async (query) => {
        queries.push(query);
        return pages.shift()!;
      },
      "old-token",
      Date.now() + 10000,
    );
    expect(result).toEqual({ changed: true, token: "next-token" });
    expect(queries[1].get("pageToken")).toBe("page-two");
    expect(
      queries.every(
        (q) =>
          q.get("syncToken") === "old-token" &&
          !q.has("timeMin") &&
          !q.has("timeMax"),
      ),
    ).toBe(true);
  });
  it("rebuilds an expired token and requires a new final token", async () => {
    let calls = 0;
    const result = await readGoogleChanges(
      async (query) => {
        calls++;
        if (calls === 1)
          throw Object.assign(new Error("expired"), { status: 410 });
        expect(query.has("syncToken")).toBe(false);
        return { nextSyncToken: "reseeded" };
      },
      "expired",
      Date.now() + 10000,
    );
    expect(result).toEqual({ changed: true, token: "reseeded" });
    expect(calls).toBe(2);
    await expect(
      readGoogleChanges(async () => ({}), null, Date.now() + 10000),
    ).rejects.toThrow("finish");
  });
  it("recognizes an unchanged incremental result", async () => {
    expect(
      await readGoogleChanges(
        async () => ({ nextSyncToken: "new" }),
        "old",
        Date.now() + 10000,
      ),
    ).toEqual({ changed: false, token: "new" });
  });
});
