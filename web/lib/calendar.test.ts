import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";
import {
  type CalendarEvent,
  eventDateRange,
  eventsForDate,
  monthGrid,
  normalizeMonth,
  resolveLocalDateTime,
  shiftMonth,
  todayInTimeZone,
  upcomingEvents,
  validateEventTimes,
} from "./calendar";

function event(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: "event-1",
    title: "Dinner",
    details: null,
    allDay: false,
    startDate: null,
    endDate: null,
    startsAt: "2026-10-08T23:00:00Z",
    endsAt: null,
    createdByMembershipId: "member-1",
    version: 1,
    createdAt: "2026-09-17T00:00:00Z",
    updatedAt: "2026-09-17T00:00:00Z",
    ...overrides,
  };
}

describe("Household timezone conversion", () => {
  it("resolves an ordinary Household-local time to an instant", () => {
    expect(
      resolveLocalDateTime("2026-07-10", "19:00", "America/Chicago")
    ).toEqual({ status: "valid", instant: "2026-07-11T00:00:00Z" });
  });

  it("rejects a nonexistent daylight-saving time", () => {
    expect(
      resolveLocalDateTime("2026-03-08", "02:30", "America/Chicago")
    ).toEqual({ status: "nonexistent" });
  });

  it("returns both choices for a repeated daylight-saving time", () => {
    const result = resolveLocalDateTime(
      "2026-11-01",
      "01:30",
      "America/Chicago"
    );
    expect(result.status).toBe("ambiguous");
    if (result.status !== "ambiguous") return;
    expect(result.choices).toHaveLength(2);
    expect(result.choices[0].instant).toBe("2026-11-01T06:30:00Z");
    expect(result.choices[1].instant).toBe("2026-11-01T07:30:00Z");
  });

  it("gets today in the Household rather than device timezone", () => {
    expect(
      todayInTimeZone(
        "America/Chicago",
        Temporal.Instant.from("2026-09-17T03:00:00Z")
      )
    ).toBe("2026-09-16");
  });
});

describe("month navigation", () => {
  it("builds a Sunday-first six-week grid across year boundaries", () => {
    const grid = monthGrid("2026-01");
    expect(grid.start).toBe("2025-12-28");
    expect(grid.end).toBe("2026-02-07");
    expect(grid.weeks).toHaveLength(6);
    expect(grid.weeks.every((week) => week.length === 7)).toBe(true);
  });

  it("normalizes and shifts selected months", () => {
    expect(normalizeMonth("not-a-month", "2026-09-17")).toBe("2026-09");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
});

describe("Event ranges and ordering", () => {
  it("keeps all-day dates fixed and includes every spanned date", () => {
    const trip = event({
      allDay: true,
      startDate: "2026-10-08",
      endDate: "2026-10-10",
      startsAt: null,
      title: "Trip",
    });
    expect(eventDateRange(trip, "Pacific/Auckland")).toEqual({
      start: "2026-10-08",
      end: "2026-10-10",
    });
    expect(eventsForDate([trip], "2026-10-09", "America/Chicago")).toEqual([
      trip,
    ]);
  });

  it("orders all-day Events before chronological timed Events", () => {
    const allDay = event({
      id: "all-day",
      allDay: true,
      startDate: "2026-10-08",
      startsAt: null,
      title: "School closed",
    });
    const morning = event({
      id: "morning",
      startsAt: "2026-10-08T13:00:00Z",
      title: "Breakfast",
    });
    expect(
      eventsForDate([morning, allDay], "2026-10-08", "America/Chicago").map(
        ({ id }) => id
      )
    ).toEqual(["all-day", "morning"]);
  });

  it("orders a timed multi-day Event as a bar before single-day timed Events", () => {
    const overnight = event({
      id: "overnight",
      startsAt: "2026-10-08T23:00:00Z",
      endsAt: "2026-10-09T14:00:00Z",
      title: "Overnight",
    });
    const evening = event({
      id: "evening",
      startsAt: "2026-10-08T22:00:00Z",
      endsAt: "2026-10-08T23:00:00Z",
      title: "Evening",
    });
    expect(
      eventsForDate([evening, overnight], "2026-10-08", "America/Chicago").map(
        ({ id }) => id
      )
    ).toEqual(["overnight", "evening"]);
  });

  it("does not display a timed Event on a new day when it ends at midnight", () => {
    const evening = event({
      startsAt: "2026-10-09T01:00:00Z",
      endsAt: "2026-10-09T05:00:00Z",
    });
    expect(eventDateRange(evening, "America/Chicago")).toEqual({
      start: "2026-10-08",
      end: "2026-10-08",
    });
  });

  it("shows the next future Event when the coming week is empty", () => {
    const later = event({ startsAt: "2026-11-01T14:00:00Z" });
    expect(upcomingEvents([later], "2026-10-01", "America/Chicago")).toEqual([
      later,
    ]);
  });
});

describe("Event time validation", () => {
  it("keeps all-day Events as inclusive calendar dates", () => {
    expect(
      validateEventTimes(
        {
          allDay: true,
          startDate: "2026-10-08",
          endDate: "2026-10-10",
          startTime: "19:00",
        },
        "America/Chicago"
      )
    ).toEqual({
      status: "valid",
      fields: {
        all_day: true,
        start_date: "2026-10-08",
        end_date: "2026-10-10",
        starts_at: null,
        ends_at: null,
      },
    });
  });

  it("rejects an end before the start", () => {
    expect(
      validateEventTimes(
        {
          allDay: false,
          startDate: "2026-10-08",
          endDate: "2026-10-08",
          startTime: "19:00",
          endTime: "18:00",
        },
        "America/Chicago"
      )
    ).toEqual({ status: "invalid", message: "The end must be after the start." });
  });

  it("requires explicit disambiguation for a repeated time", () => {
    const result = validateEventTimes(
      {
        allDay: false,
        startDate: "2026-11-01",
        startTime: "01:30",
      },
      "America/Chicago"
    );
    expect(result.status).toBe("ambiguous");
  });
});
