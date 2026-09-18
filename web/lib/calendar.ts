import { Temporal } from "@js-temporal/polyfill";

export type CalendarEvent = {
  id: string;
  title: string;
  details: string | null;
  allDay: boolean;
  startDate: string | null;
  endDate: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdByMembershipId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type EventRow = {
  id: string;
  title: string;
  details: string | null;
  all_day: boolean;
  start_date: string | null;
  end_date: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_by_membership_id: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};

export type LocalTimeChoice = {
  value: "earlier" | "later";
  instant: string;
  label: string;
};

export type LocalTimeResolution =
  | { status: "valid"; instant: string }
  | { status: "ambiguous"; choices: LocalTimeChoice[] }
  | { status: "nonexistent" };

export type EventTimeInput = {
  allDay: boolean;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  startDisambiguation?: "earlier" | "later";
  endDisambiguation?: "earlier" | "later";
};

export type EventTimeFields = {
  all_day: boolean;
  start_date: string | null;
  end_date: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

export type EventTimeValidation =
  | { status: "valid"; fields: EventTimeFields }
  | { status: "invalid"; message: string }
  | {
      status: "ambiguous";
      fields: Array<{ field: "start" | "end"; choices: LocalTimeChoice[] }>;
    };

export function calendarEventFromRow(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    details: row.details,
    allDay: row.all_day,
    startDate: row.start_date,
    endDate: row.end_date,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdByMembershipId: row.created_by_membership_id,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function todayInTimeZone(timeZone: string, now = Temporal.Now.instant()) {
  return now.toZonedDateTimeISO(timeZone).toPlainDate().toString();
}

export function resolveLocalDateTime(
  date: string,
  time: string,
  timeZone: string,
  disambiguation?: "earlier" | "later"
): LocalTimeResolution {
  if (!isValidTimeZone(timeZone)) throw new Error("Invalid timezone");

  let plain: Temporal.PlainDateTime;
  try {
    plain = Temporal.PlainDateTime.from(`${date}T${time}`);
  } catch {
    return { status: "nonexistent" };
  }

  const earlier = plain.toZonedDateTime(timeZone, { disambiguation: "earlier" });
  const later = plain.toZonedDateTime(timeZone, { disambiguation: "later" });
  const earlierMatches = earlier.toPlainDateTime().equals(plain);
  const laterMatches = later.toPlainDateTime().equals(plain);

  if (!earlierMatches && !laterMatches) return { status: "nonexistent" };

  if (earlier.epochNanoseconds !== later.epochNanoseconds) {
    const choices = [
      localTimeChoice("earlier", earlier),
      localTimeChoice("later", later),
    ];
    if (disambiguation) {
      const selected = choices.find((choice) => choice.value === disambiguation);
      if (selected) return { status: "valid", instant: selected.instant };
    }
    return { status: "ambiguous", choices };
  }

  return { status: "valid", instant: earlier.toInstant().toString() };
}

export function validateEventTimes(
  input: EventTimeInput,
  timeZone: string
): EventTimeValidation {
  let startDate: Temporal.PlainDate;
  try {
    startDate = Temporal.PlainDate.from(input.startDate);
  } catch {
    return { status: "invalid", message: "Choose a valid start date." };
  }

  if (input.allDay) {
    let endDate: Temporal.PlainDate | null = null;
    if (input.endDate) {
      try {
        endDate = Temporal.PlainDate.from(input.endDate);
      } catch {
        return { status: "invalid", message: "Choose a valid ending date." };
      }
      if (Temporal.PlainDate.compare(endDate, startDate) < 0) {
        return {
          status: "invalid",
          message: "The ending date must be the same as or after the start date.",
        };
      }
    }
    return {
      status: "valid",
      fields: {
        all_day: true,
        start_date: startDate.toString(),
        end_date: endDate?.toString() || null,
        starts_at: null,
        ends_at: null,
      },
    };
  }

  if (!input.startTime) {
    return { status: "invalid", message: "Choose a start time." };
  }

  const start = resolveLocalDateTime(
    startDate.toString(),
    input.startTime,
    timeZone,
    input.startDisambiguation
  );
  if (start.status === "nonexistent") {
    return {
      status: "invalid",
      message: `That start time does not exist in ${timeZone} because the clocks change. Choose another time.`,
    };
  }

  const ambiguous: Array<{
    field: "start" | "end";
    choices: LocalTimeChoice[];
  }> = [];
  if (start.status === "ambiguous") {
    ambiguous.push({ field: "start", choices: start.choices });
  }

  let endInstant: string | null = null;
  if (input.endTime) {
    let endDate = startDate;
    if (input.endDate) {
      try {
        endDate = Temporal.PlainDate.from(input.endDate);
      } catch {
        return { status: "invalid", message: "Choose a valid ending date." };
      }
    }
    const end = resolveLocalDateTime(
      endDate.toString(),
      input.endTime,
      timeZone,
      input.endDisambiguation
    );
    if (end.status === "nonexistent") {
      return {
        status: "invalid",
        message: `That end time does not exist in ${timeZone} because the clocks change. Choose another time.`,
      };
    }
    if (end.status === "ambiguous") {
      ambiguous.push({ field: "end", choices: end.choices });
    } else {
      endInstant = end.instant;
    }
  }

  if (ambiguous.length) return { status: "ambiguous", fields: ambiguous };
  if (start.status !== "valid") {
    return { status: "invalid", message: "Choose which repeated start time you mean." };
  }
  if (
    endInstant &&
    Temporal.Instant.compare(
      Temporal.Instant.from(endInstant),
      Temporal.Instant.from(start.instant)
    ) <= 0
  ) {
    return { status: "invalid", message: "The end must be after the start." };
  }

  return {
    status: "valid",
    fields: {
      all_day: false,
      start_date: null,
      end_date: null,
      starts_at: start.instant,
      ends_at: endInstant,
    },
  };
}

export function eventFormDates(event: CalendarEvent, timeZone: string) {
  if (event.allDay) {
    return {
      startDate: event.startDate!,
      endDate: event.endDate || "",
      startTime: "09:00",
      endTime: "",
    };
  }
  const start = Temporal.Instant.from(event.startsAt!).toZonedDateTimeISO(timeZone);
  const end = event.endsAt
    ? Temporal.Instant.from(event.endsAt).toZonedDateTimeISO(timeZone)
    : null;
  return {
    startDate: start.toPlainDate().toString(),
    endDate: end?.toPlainDate().toString() || start.toPlainDate().toString(),
    startTime: start.toPlainTime().toString({ smallestUnit: "minute" }),
    endTime: end?.toPlainTime().toString({ smallestUnit: "minute" }) || "",
  };
}

function localTimeChoice(
  value: "earlier" | "later",
  zoned: Temporal.ZonedDateTime
): LocalTimeChoice {
  const instant = zoned.toInstant().toString();
  const abbreviation = new Intl.DateTimeFormat("en-US", {
    timeZone: zoned.timeZoneId,
    timeZoneName: "short",
  })
    .formatToParts(new Date(instant))
    .find((part) => part.type === "timeZoneName")?.value;
  return {
    value,
    instant,
    label: `${abbreviation || zoned.timeZoneId} (${zoned.offset})`,
  };
}

export function normalizeMonth(value: string | null | undefined, fallbackDate: string) {
  try {
    return Temporal.PlainYearMonth.from(value || fallbackDate.slice(0, 7)).toString();
  } catch {
    return fallbackDate.slice(0, 7);
  }
}

export function shiftMonth(month: string, months: number) {
  return Temporal.PlainYearMonth.from(month).add({ months }).toString();
}

export function monthGrid(month: string) {
  const yearMonth = Temporal.PlainYearMonth.from(month);
  const first = yearMonth.toPlainDate({ day: 1 });
  const sundayOffset = first.dayOfWeek % 7;
  const start = first.subtract({ days: sundayOffset });
  const dates = Array.from({ length: 42 }, (_, index) =>
    start.add({ days: index }).toString()
  );
  return {
    month: yearMonth.toString(),
    label: new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${yearMonth.toString()}-01T00:00:00Z`)),
    start: dates[0],
    end: dates[dates.length - 1],
    weeks: Array.from({ length: 6 }, (_, index) =>
      dates.slice(index * 7, index * 7 + 7)
    ),
  };
}

export function eventDateRange(event: CalendarEvent, timeZone: string) {
  if (event.allDay) {
    const start = event.startDate!;
    return { start, end: event.endDate || start };
  }
  const start = Temporal.Instant.from(event.startsAt!)
    .toZonedDateTimeISO(timeZone)
    .toPlainDate()
    .toString();
  // Timed Events use a half-open interval. An Event ending exactly at midnight
  // belongs to the day that just ended, not to the new day.
  const endInstant = Temporal.Instant.from(event.endsAt || event.startsAt!);
  const displayEnd = event.endsAt
    ? endInstant.subtract({ nanoseconds: 1 })
    : endInstant;
  const end = displayEnd
    .toZonedDateTimeISO(timeZone)
    .toPlainDate()
    .toString();
  return { start, end };
}

export function eventOverlapsDate(
  event: CalendarEvent,
  date: string,
  timeZone: string
) {
  const range = eventDateRange(event, timeZone);
  return range.start <= date && range.end >= date;
}

export function eventsForDate(
  events: CalendarEvent[],
  date: string,
  timeZone: string
) {
  return events
    .filter((event) => eventOverlapsDate(event, date, timeZone))
    .sort((left, right) => compareEvents(left, right, timeZone));
}

export function upcomingEvents(
  events: CalendarEvent[],
  today: string,
  timeZone: string
) {
  const end = Temporal.PlainDate.from(today).add({ days: 6 }).toString();
  const withinWeek = events
    .filter((event) => {
      const range = eventDateRange(event, timeZone);
      return range.end >= today && range.start <= end;
    })
    .sort((left, right) => compareEventsByStart(left, right, timeZone));
  if (withinWeek.length) return withinWeek;

  const future = events
    .filter((event) => eventDateRange(event, timeZone).start > end)
    .sort((left, right) => compareEventsByStart(left, right, timeZone));
  return future.length ? [future[0]] : [];
}

export function formatEventTime(event: CalendarEvent, timeZone: string) {
  if (event.allDay) return "All day";
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
  const start = formatter.format(new Date(event.startsAt!));
  if (!event.endsAt) return start;
  return `${start}–${formatter.format(new Date(event.endsAt))}`;
}

export function formatEventDateRange(event: CalendarEvent, timeZone: string) {
  const { start, end } = eventDateRange(event, timeZone);
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const startLabel = formatter.format(new Date(`${start}T00:00:00Z`));
  if (end === start) return startLabel;
  return `${startLabel} – ${formatter.format(new Date(`${end}T00:00:00Z`))}`;
}

function compareEvents(
  left: CalendarEvent,
  right: CalendarEvent,
  timeZone: string
) {
  const leftRange = eventDateRange(left, timeZone);
  const rightRange = eventDateRange(right, timeZone);
  const leftIsBar = left.allDay || leftRange.start !== leftRange.end;
  const rightIsBar = right.allDay || rightRange.start !== rightRange.end;
  if (leftIsBar !== rightIsBar) return leftIsBar ? -1 : 1;
  return compareEventsByStart(left, right, timeZone);
}

function compareEventsByStart(
  left: CalendarEvent,
  right: CalendarEvent,
  timeZone: string
) {
  const leftKey = left.allDay
    ? `${eventDateRange(left, timeZone).start}T00:00:00`
    : Temporal.Instant.from(left.startsAt!)
        .toZonedDateTimeISO(timeZone)
        .toPlainDateTime()
        .toString();
  const rightKey = right.allDay
    ? `${eventDateRange(right, timeZone).start}T00:00:00`
    : Temporal.Instant.from(right.startsAt!)
        .toZonedDateTimeISO(timeZone)
        .toPlainDateTime()
        .toString();
  return leftKey.localeCompare(rightKey) || left.title.localeCompare(right.title);
}
