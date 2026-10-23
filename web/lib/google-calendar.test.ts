import { describe, expect, it } from "vitest";
import {
  normalizeGoogleEvent,
  groupGoogleCalendars,
  safeGoogleUrl,
} from "./google-calendar";

describe("Google Calendar import boundary", () => {
  it("keeps a shared source that already covers the viewed dates", () => {
    const common = {
      google_calendar_id: "shared@example.test",
      name: "Shared",
      color: "#abcdef",
    };
    const wide = {
      ...common,
      id: "wide",
      last_synced_at: "2026-10-23T10:00:00Z",
      cached_range_start: "2020-01-01",
      cached_range_end: "2030-01-01",
    };
    const fresh = {
      ...common,
      id: "fresh",
      last_synced_at: "2026-10-23T11:00:00Z",
      cached_range_start: "2025-01-01",
      cached_range_end: "2028-01-01",
    };
    expect(
      groupGoogleCalendars([wide, fresh], {
        start: "2021-01-01",
        end: "2021-02-01",
      })[0].id,
    ).toBe("wide");
  });
  it("preserves all-day dates and converts Google's exclusive end date", () => {
    expect(
      normalizeGoogleEvent({
        id: "trip",
        summary: "Trip",
        start: { date: "2026-11-01" },
        end: { date: "2026-11-04" },
      }),
    ).toMatchObject({
      google_id: "trip",
      title: "Trip",
      all_day: true,
      start_date: "2026-11-01",
      end_date: "2026-11-03",
      starts_at: null,
    });
  });
  it("omits cancellations and declined invitations", () => {
    expect(
      normalizeGoogleEvent({ id: "gone", status: "cancelled" }),
    ).toBeNull();
    expect(
      normalizeGoogleEvent({
        id: "no",
        attendees: [{ self: true, responseStatus: "declined" }],
      }),
    ).toBeNull();
  });
  it("uses Busy when Google withholds the summary and rejects unsafe links", () => {
    expect(
      normalizeGoogleEvent({
        id: "private",
        start: { dateTime: "2026-11-01T10:00:00-06:00" },
        end: { dateTime: "2026-11-01T11:00:00-06:00" },
        htmlLink: "javascript:alert(1)",
      }),
    ).toMatchObject({
      title: "Busy",
      limited: true,
      html_link: null,
      starts_at: "2026-11-01T16:00:00.000Z",
    });
    expect(safeGoogleUrl("https://evil.example/")).toBeNull();
  });
  it("shows one source for the same calendar while preserving distinct calendars", () => {
    const source = {
      id: "one",
      google_calendar_id: "shared@example.com",
      name: "Shared",
      color: "#abcdef",
      last_synced_at: "2026-10-23T10:00:00Z",
    };
    expect(
      groupGoogleCalendars([
        source,
        { ...source, id: "two", last_synced_at: "2026-10-23T11:00:00Z" },
        { ...source, id: "three", google_calendar_id: "personal@example.com" },
      ]).map((s) => s.id),
    ).toEqual(["two", "three"]);
  });
});
