// Recurrence math for Chores. Pure functions over calendar dates (YYYY-MM-DD
// strings, no time/zone) so they're easy to reason about and test. The only
// impure helper is todayInChicago(), kept separate.

export type Recurrence =
  | { freq: "every_n_days"; intervalDays: number }
  | { freq: "weekly"; weekday: number }; // 0 = Sunday .. 6 = Saturday

// Next due date when a chore is completed: advance from its current due date by
// one period, then skip forward until strictly after today (so an overdue chore
// lands on the next *future* occurrence instead of a past one). Advancing from
// the due date keeps "every Tuesday" on Tuesdays even if done early or late.
export function computeNextDue(
  rule: Recurrence,
  fromDue: string,
  today: string
): string {
  const step = rule.freq === "weekly" ? 7 : rule.intervalDays;
  let next = addDays(fromDue, step);
  while (next <= today) next = addDays(next, step);
  return next;
}

// The first due date at creation: today for interval chores; the nearest upcoming
// occurrence of the chosen weekday (today included) for weekly chores.
export function firstDue(rule: Recurrence, today: string): string {
  if (rule.freq === "every_n_days") return today;
  let d = today;
  while (dayOfWeek(d) !== rule.weekday) d = addDays(d, 1);
  return d;
}

export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

export function dayOfWeek(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// Today's calendar date in the household timezone (America/Chicago). en-CA
// formats as YYYY-MM-DD. Impure (reads the clock) — kept out of the math above.
export function todayInChicago(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}
