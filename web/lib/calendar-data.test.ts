import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { loadCalendarItems } from "./calendar-data";

const allDayEvent = {
  id: "event-1",
  title: "Dinner",
  details: null,
  all_day: true,
  start_date: "2026-09-19",
  end_date: null,
  starts_at: null,
  ends_at: null,
  created_by_membership_id: "membership-1",
  version: 1,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
  recurrence_frequency: null,
  recurrence_interval: null,
  recurrence_weekdays: null,
  recurrence_end_date: null,
  recurrence_count: null,
  recurrence_timezone: null,
};

describe("Calendar window loading", () => {
  it("loads Events, Chores, and exceptions through one database call", async () => {
    const rpc = vi.fn(async () => ({
      data: {
        events: [allDayEvent],
        chores: [{ id: "chore-1", title: "Water plants", next_due: "2026-09-20" }],
        exceptions: [],
      },
      error: null,
    }));
    const from = vi.fn();
    const client = { rpc, from } as unknown as SupabaseClient;

    const items = await loadCalendarItems(
      client,
      "household-1",
      { start: "2026-09-13", end: "2026-09-26" },
      "America/Chicago",
      "2026-09-19"
    );

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("get_calendar_window", {
      target_household_id: "household-1",
      window_start: "2026-09-13",
      window_end: "2026-09-26",
      window_start_instant: "2026-09-13T05:00:00Z",
      window_end_exclusive: "2026-09-27T05:00:00Z",
      local_today: "2026-09-19",
    });
    expect(from).not.toHaveBeenCalled();
    expect(items.map((item) => item.source)).toEqual(["event", "chore"]);
  });

  it("surfaces database errors instead of silently falling back", async () => {
    const failure = { code: "42501", message: "permission denied" };
    const client = {
      rpc: vi.fn(async () => ({ data: null, error: failure })),
    } as unknown as SupabaseClient;

    await expect(
      loadCalendarItems(
        client,
        "household-1",
        { start: "2026-09-13", end: "2026-09-26" },
        "America/Chicago",
        "2026-09-19"
      )
    ).rejects.toEqual(failure);
  });
});
