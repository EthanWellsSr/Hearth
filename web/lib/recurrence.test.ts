import { describe, it, expect } from "vitest";
import { computeNextDue, firstDue, addDays, dayOfWeek } from "./recurrence";

// Calendar facts used below (verified by hand):
//   2026-01-01 is a Thursday (dow 4)
//   2026-01-06 is a Tuesday  (dow 2)
//   2026 is not a leap year (Feb has 28 days)

describe("addDays / dayOfWeek", () => {
  it("crosses a month boundary", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });
  it("reports the weekday", () => {
    expect(dayOfWeek("2026-01-01")).toBe(4); // Thursday
    expect(dayOfWeek("2026-01-06")).toBe(2); // Tuesday
  });
});

describe("computeNextDue — every N days", () => {
  const every3 = { freq: "every_n_days", intervalDays: 3 } as const;

  it("advances one interval when completed on time", () => {
    expect(computeNextDue(every3, "2026-01-10", "2026-01-10")).toBe("2026-01-13");
  });

  it("advances from the due date when completed early", () => {
    // due in the future; completing early keeps the schedule from the due date
    expect(computeNextDue(every3, "2026-01-20", "2026-01-10")).toBe("2026-01-23");
  });

  it("skips past-due occurrences to the next future one", () => {
    // 01-01 -> 04 -> 07 -> 10 (== today) -> 13 (first strictly after today)
    expect(computeNextDue(every3, "2026-01-01", "2026-01-10")).toBe("2026-01-13");
  });

  it("handles a daily chore", () => {
    const daily = { freq: "every_n_days", intervalDays: 1 } as const;
    expect(computeNextDue(daily, "2026-01-10", "2026-01-10")).toBe("2026-01-11");
  });
});

describe("computeNextDue — weekly", () => {
  const tuesday = { freq: "weekly", weekday: 2 } as const;

  it("stays on the same weekday", () => {
    const next = computeNextDue(tuesday, "2026-01-06", "2026-01-06");
    expect(next).toBe("2026-01-13");
    expect(dayOfWeek(next)).toBe(2); // still a Tuesday
  });

  it("skips weeks when overdue, landing on the next future Tuesday", () => {
    const next = computeNextDue(tuesday, "2026-01-06", "2026-01-20");
    expect(next).toBe("2026-01-27");
    expect(dayOfWeek(next)).toBe(2);
  });
});

describe("firstDue", () => {
  it("interval chores start today", () => {
    expect(firstDue({ freq: "every_n_days", intervalDays: 3 }, "2026-01-10")).toBe(
      "2026-01-10"
    );
  });

  it("weekly chores start on the next occurrence of the weekday", () => {
    // today is Thursday 01-01; next Tuesday is 01-06
    expect(firstDue({ freq: "weekly", weekday: 2 }, "2026-01-01")).toBe("2026-01-06");
  });

  it("weekly chores can start today if today is the weekday", () => {
    expect(firstDue({ freq: "weekly", weekday: 2 }, "2026-01-06")).toBe("2026-01-06");
  });
});
