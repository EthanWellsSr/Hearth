import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";
import {
  type CalendarEvent,
  type EventOccurrenceException,
  baseOccurrence,
  effectiveOccurrence,
  remainingRecurrenceCount,
  calendarItemFromChore,
  calendarItemFromEvent,
  calendarItemsForDate,
  calendarQueryWindow,
  calendarRangeInstants,
  eventDateRange,
  expandRecurringEvent,
  eventsForDate,
  monthGrid,
  normalizeMonth,
  resolveLocalDateTime,
  shiftMonth,
  shiftWeek,
  todayInTimeZone,
  upcomingEvents,
  validateEventTimes,
  weekRange,
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
    recurrenceFrequency: null,
    recurrenceInterval: null,
    recurrenceWeekdays: null,
    recurrenceEndDate: null,
    recurrenceCount: null,
    recurrenceTimeZone: null,
    ...overrides,
  };
}

function exception(
  overrides: Partial<EventOccurrenceException>
): EventOccurrenceException {
  return {
    id: "exception-1",
    series_id: "series-1",
    original_occurrence_key: "2026-09-14T09:00",
    cancelled: false,
    title: null,
    details: null,
    all_day: null,
    start_date: null,
    end_date: null,
    starts_at: null,
    ends_at: null,
    version: 1,
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

  it("normalizes a selected date to a Sunday-first week", () => {
    expect(weekRange("2026-09-17", "2026-09-01")).toEqual({
      start: "2026-09-13",
      end: "2026-09-19",
      dates: [
        "2026-09-13",
        "2026-09-14",
        "2026-09-15",
        "2026-09-16",
        "2026-09-17",
        "2026-09-18",
        "2026-09-19",
      ],
    });
    expect(shiftWeek("2026-12-27", 1)).toBe("2027-01-03");
  });

  it("builds one bounded window for the month grid and Upcoming", () => {
    expect(calendarQueryWindow("2026-09", "2026-09-17")).toEqual({
      start: "2026-08-30",
      end: "2026-10-10",
    });
  });

  it("turns Household-local date boundaries into DST-safe instants", () => {
    expect(
      calendarRangeInstants("2026-03-08", "2026-03-08", "America/Chicago")
    ).toEqual({
      start: "2026-03-08T06:00:00Z",
      endExclusive: "2026-03-09T05:00:00Z",
    });
  });
});

describe("Calendar Item projection", () => {
  it("keeps Chores separate while ordering Events before due Chores", () => {
    const items = [
      calendarItemFromChore({
        id: "chore-1",
        title: "Bins",
        next_due: "2026-10-08",
      }),
      calendarItemFromEvent(
        event({
          allDay: true,
          startDate: "2026-10-08",
          startsAt: null,
          title: "School closed",
        })
      ),
    ];
    expect(
      calendarItemsForDate(items, "2026-10-08", "America/Chicago").map(
        (item) => item.source
      )
    ).toEqual(["event", "chore"]);
  });
});

describe("recurring Event expansion", () => {
  it("expands selected weekdays without materializing unrelated dates", () => {
    const series = event({
      id: "series-1",
      startsAt: "2026-09-14T14:00:00Z",
      endsAt: "2026-09-14T15:00:00Z",
      recurrenceFrequency: "weekly",
      recurrenceInterval: 1,
      recurrenceWeekdays: [1, 3],
      recurrenceTimeZone: "America/Chicago",
    });
    expect(
      expandRecurringEvent(series, { start: "2026-09-13", end: "2026-09-20" }).map(
        (item) => item.key
      )
    ).toEqual([
      "event:series-1:2026-09-14T09:00",
      "event:series-1:2026-09-16T09:00",
    ]);
  });

  it("skips a nonexistent spring-forward wall-clock occurrence", () => {
    const series = event({
      id: "dst-series",
      startsAt: "2026-03-01T08:30:00Z",
      recurrenceFrequency: "weekly",
      recurrenceInterval: 1,
      recurrenceWeekdays: [0],
      recurrenceTimeZone: "America/Chicago",
    });
    expect(
      expandRecurringEvent(series, { start: "2026-03-01", end: "2026-03-15" }).map(
        (item) => item.key
      )
    ).toEqual([
      "event:dst-series:2026-03-01T02:30",
      "event:dst-series:2026-03-15T02:30",
    ]);
  });

  it("drops a cancelled occurrence but keeps the rest of the series", () => {
    const series = event({
      id: "series-1",
      startsAt: "2026-09-14T14:00:00Z",
      recurrenceFrequency: "weekly",
      recurrenceInterval: 1,
      recurrenceWeekdays: [1, 3],
      recurrenceTimeZone: "America/Chicago",
    });
    const cancelled = exception({
      series_id: "series-1",
      original_occurrence_key: "2026-09-16T09:00",
      cancelled: true,
    });
    expect(
      expandRecurringEvent(series, { start: "2026-09-13", end: "2026-09-20" }, [
        cancelled,
      ]).map((item) => item.key)
    ).toEqual(["event:series-1:2026-09-14T09:00"]);
  });

  it("overrides an occurrence in place while preserving its identity", () => {
    const series = event({
      id: "series-1",
      startsAt: "2026-09-14T14:00:00Z",
      endsAt: "2026-09-14T15:00:00Z",
      recurrenceFrequency: "weekly",
      recurrenceInterval: 1,
      recurrenceWeekdays: [1, 3],
      recurrenceTimeZone: "America/Chicago",
    });
    const moved = exception({
      series_id: "series-1",
      original_occurrence_key: "2026-09-16T09:00",
      title: "Moved standup",
      all_day: false,
      starts_at: "2026-09-16T16:00:00Z",
      ends_at: "2026-09-16T17:00:00Z",
    });
    const items = expandRecurringEvent(
      series,
      { start: "2026-09-13", end: "2026-09-20" },
      [moved]
    );
    const overridden = items.find(
      (item) => item.key === "event:series-1:2026-09-16T09:00"
    );
    expect(overridden?.title).toBe("Moved standup");
    expect(overridden?.startsAt).toBe("2026-09-16T16:00:00Z");
  });

  it("includes an occurrence moved into the window from outside it", () => {
    const series = event({
      id: "series-1",
      startsAt: "2026-09-14T14:00:00Z",
      recurrenceFrequency: "weekly",
      recurrenceInterval: 1,
      recurrenceWeekdays: [1],
      recurrenceTimeZone: "America/Chicago",
    });
    const movedIn = exception({
      series_id: "series-1",
      original_occurrence_key: "2026-09-28T09:00",
      title: "Pulled forward",
      all_day: false,
      starts_at: "2026-09-18T14:00:00Z",
    });
    expect(
      expandRecurringEvent(series, { start: "2026-09-13", end: "2026-09-19" }, [
        movedIn,
      ]).map((item) => item.key)
    ).toEqual([
      "event:series-1:2026-09-14T09:00",
      "event:series-1:2026-09-28T09:00",
    ]);
  });
});

describe("occurrence identity and splitting", () => {
  const weekly = () =>
    event({
      id: "series-1",
      startsAt: "2026-09-14T14:00:00Z",
      endsAt: "2026-09-14T15:00:00Z",
      recurrenceFrequency: "weekly",
      recurrenceInterval: 1,
      recurrenceWeekdays: [1],
      recurrenceTimeZone: "America/Chicago",
    });

  it("rebuilds the originally scheduled occurrence from its key", () => {
    const occurrence = baseOccurrence(weekly(), "2026-09-21T09:00");
    expect(occurrence?.startsAt).toBe("2026-09-21T14:00:00Z");
    expect(occurrence?.endsAt).toBe("2026-09-21T15:00:00Z");
    expect(occurrence?.recurrenceFrequency).toBeNull();
  });

  it("prefers the override when an exception exists", () => {
    const override = exception({
      series_id: "series-1",
      original_occurrence_key: "2026-09-21T09:00",
      title: "Special",
      all_day: false,
      starts_at: "2026-09-21T16:00:00Z",
    });
    const occurrence = effectiveOccurrence(weekly(), "2026-09-21T09:00", override);
    expect(occurrence?.title).toBe("Special");
    expect(occurrence?.startsAt).toBe("2026-09-21T16:00:00Z");
  });

  it("carries the remaining count into the forward segment of a split", () => {
    const series = event({
      ...weekly(),
      recurrenceCount: 10,
    });
    // Occurrences before 2026-10-05: 09-14, 09-21, 09-28 → 3 elapsed, 7 remain.
    expect(remainingRecurrenceCount(series, "2026-10-05")).toBe(7);
  });

  it("has no remaining count for a series that is not count-bounded", () => {
    expect(remainingRecurrenceCount(weekly(), "2026-10-05")).toBeNull();
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
