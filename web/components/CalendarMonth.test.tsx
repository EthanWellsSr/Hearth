// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { CalendarEvent } from "@/lib/calendar";
import { CalendarMonth } from "./CalendarMonth";

function event(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: "event-1",
    title: "Family trip",
    details: null,
    allDay: true,
    startDate: "2026-09-17",
    endDate: "2026-09-19",
    startsAt: null,
    endsAt: null,
    createdByMembershipId: "member-1",
    version: 1,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

describe("Calendar month", () => {
  afterEach(cleanup);

  it("renders a multi-day Event on every affected date with continuation styling", () => {
    render(
      <CalendarMonth
        events={[event({})]}
        month="2026-09"
        today="2026-09-17"
        timeZone="America/Chicago"
        view="month"
      />
    );

    const links = screen.getAllByRole("link", { name: "Family trip" });
    expect(links).toHaveLength(3);
    expect(links[0].className).toContain("calendar-event-continues-after");
    expect(links[1].className).toContain("calendar-event-continues-before");
    expect(links[1].className).toContain("calendar-event-continues-after");
    expect(links[2].className).toContain("calendar-event-continues-before");
  });

  it("shows timed Events with their Household-local start time", () => {
    render(
      <CalendarMonth
        events={[
          event({
            id: "timed",
            title: "Dinner",
            allDay: false,
            startDate: null,
            endDate: null,
            startsAt: "2026-09-18T00:00:00Z",
            endsAt: null,
          }),
        ]}
        month="2026-09"
        today="2026-09-17"
        timeZone="America/Chicago"
        view="month"
      />
    );

    const link = screen.getByRole("link", { name: /Dinner/ });
    expect(link.textContent).toContain("7:00 PM");
  });
});

