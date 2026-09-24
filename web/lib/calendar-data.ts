import type { SupabaseClient } from "@supabase/supabase-js";
import { Temporal } from "@js-temporal/polyfill";
import {
  calendarEventFromRow,
  calendarItemFromChore,
  calendarItemFromEvent,
  calendarRangeInstants,
  expandRecurringEvent,
  type CalendarItem,
  type ChoreCalendarRow,
  type EventOccurrenceException,
  type EventRow,
} from "./calendar";

const EVENT_COLUMNS =
  "id,title,details,all_day,start_date,end_date,starts_at,ends_at,created_by_membership_id,version,created_at,updated_at,recurrence_frequency,recurrence_interval,recurrence_weekdays,recurrence_end_date,recurrence_count,recurrence_timezone";

const EXCEPTION_COLUMNS =
  "id,series_id,original_occurrence_key,cancelled,title,details,all_day,start_date,end_date,starts_at,ends_at,version";

export type CalendarWindowPayload = {
  events: EventRow[];
  chores: ChoreCalendarRow[];
  exceptions: EventOccurrenceException[];
};

export async function loadCalendarItems(
  supabase: SupabaseClient,
  householdId: string,
  range: { start: string; end: string },
  timeZone: string,
  today: string
): Promise<CalendarItem[]> {
  const instants = calendarRangeInstants(range.start, range.end, timeZone);
  const { data, error } = await supabase.rpc("get_calendar_window", {
    target_household_id: householdId,
    window_start: range.start,
    window_end: range.end,
    window_start_instant: instants.start,
    window_end_exclusive: instants.endExclusive,
    local_today: today,
  });

  if (!error && data) {
    return calendarItemsFromWindow(data as CalendarWindowPayload, range);
  }
  if (error?.code !== "PGRST202") throw error;

  const legacyPayload = await loadCalendarWindowLegacy(
    supabase,
    householdId,
    range,
    timeZone,
    today
  );
  return calendarItemsFromWindow(legacyPayload, range);
}

export function calendarItemsFromWindow(
  payload: CalendarWindowPayload,
  range: { start: string; end: string }
): CalendarItem[] {
  const events = new Map(payload.events.map((row) => [row.id, row]));
  const chores = new Map(payload.chores.map((row) => [row.id, row]));
  const exceptionsBySeries = new Map<string, EventOccurrenceException[]>();

  for (const row of payload.exceptions) {
    const list = exceptionsBySeries.get(row.series_id) ?? [];
    list.push(row);
    exceptionsBySeries.set(row.series_id, list);
  }

  const recurringItems = Array.from(events.values())
    .filter((row) => row.recurrence_frequency)
    .flatMap((row) =>
      expandRecurringEvent(
        calendarEventFromRow(row),
        range,
        exceptionsBySeries.get(row.id) ?? []
      )
    );

  return [
    ...Array.from(events.values())
      .filter((row) => !row.recurrence_frequency)
      .map((row) => calendarItemFromEvent(calendarEventFromRow(row))),
    ...Array.from(chores.values(), calendarItemFromChore),
    ...recurringItems,
  ];
}

async function loadCalendarWindowLegacy(
  supabase: SupabaseClient,
  householdId: string,
  range: { start: string; end: string },
  timeZone: string,
  today: string
): Promise<CalendarWindowPayload> {
  const instants = calendarRangeInstants(range.start, range.end, timeZone);
  const eventBase = () =>
    supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("household_id", householdId);

  const [
    singleDayEvents,
    spanningAllDayEvents,
    pointEvents,
    rangedTimedEvents,
    visibleChores,
    overdueChores,
    nextAllDayEvent,
    nextTimedEvent,
    nextChore,
    recurringAllDayEvents,
    recurringTimedEvents,
  ] = await Promise.all([
    eventBase().eq("all_day", true).is("recurrence_frequency", null).is("end_date", null).gte("start_date", range.start).lte("start_date", range.end),
    eventBase().eq("all_day", true).is("recurrence_frequency", null).not("end_date", "is", null).lte("start_date", range.end).gte("end_date", range.start),
    eventBase().eq("all_day", false).is("recurrence_frequency", null).is("ends_at", null).gte("starts_at", instants.start).lt("starts_at", instants.endExclusive),
    eventBase().eq("all_day", false).is("recurrence_frequency", null).not("ends_at", "is", null).lt("starts_at", instants.endExclusive).gt("ends_at", instants.start),
    supabase.from("chores").select("id,title,next_due").eq("household_id", householdId).gte("next_due", range.start).lte("next_due", range.end),
    supabase.from("chores").select("id,title,next_due").eq("household_id", householdId).lt("next_due", today),
    eventBase().eq("all_day", true).is("recurrence_frequency", null).gt("start_date", range.end).order("start_date", { ascending: true }).limit(1),
    eventBase().eq("all_day", false).is("recurrence_frequency", null).gte("starts_at", instants.endExclusive).order("starts_at", { ascending: true }).limit(1),
    supabase.from("chores").select("id,title,next_due").eq("household_id", householdId).gt("next_due", range.end).order("next_due", { ascending: true }).limit(1),
    eventBase().eq("all_day", true).not("recurrence_frequency", "is", null).lte("start_date", range.end).or(`recurrence_end_date.is.null,recurrence_end_date.gte.${range.start}`),
    eventBase().eq("all_day", false).not("recurrence_frequency", "is", null).lt("starts_at", instants.endExclusive).or(`recurrence_end_date.is.null,recurrence_end_date.gte.${range.start}`),
  ]);

  const errors = [
    singleDayEvents.error,
    spanningAllDayEvents.error,
    pointEvents.error,
    rangedTimedEvents.error,
    visibleChores.error,
    overdueChores.error,
    nextAllDayEvent.error,
    nextTimedEvent.error,
    nextChore.error,
    recurringAllDayEvents.error,
    recurringTimedEvents.error,
  ].filter(Boolean);
  if (errors.length) throw errors[0];

  const events = new Map<string, EventRow>();
  for (const result of [
    singleDayEvents,
    spanningAllDayEvents,
    pointEvents,
    rangedTimedEvents,
    nextAllDayEvent,
    nextTimedEvent,
    recurringAllDayEvents,
    recurringTimedEvents,
  ]) {
    for (const row of (result.data ?? []) as EventRow[]) events.set(row.id, row);
  }

  const chores = new Map<string, ChoreCalendarRow>();
  for (const result of [visibleChores, overdueChores, nextChore]) {
    for (const row of (result.data ?? []) as ChoreCalendarRow[]) chores.set(row.id, row);
  }

  const recurringSeriesIds = Array.from(events.values())
    .filter((row) => row.recurrence_frequency)
    .map((row) => row.id);
  let exceptions: EventOccurrenceException[] = [];

  if (recurringSeriesIds.length) {
    const endExclusiveDate = Temporal.PlainDate.from(range.end).add({ days: 1 }).toString();
    const { data: exceptionRows, error: exceptionsError } = await supabase
      .from("event_occurrence_exceptions")
      .select(EXCEPTION_COLUMNS)
      .eq("household_id", householdId)
      .in("series_id", recurringSeriesIds)
      .or(
        [
          `and(original_occurrence_key.gte.${range.start},original_occurrence_key.lt.${endExclusiveDate})`,
          `and(start_date.gte.${range.start},start_date.lte.${range.end})`,
          `and(starts_at.gte.${instants.start},starts_at.lt.${instants.endExclusive})`,
        ].join(",")
      );
    if (exceptionsError) throw exceptionsError;
    exceptions = (exceptionRows ?? []) as EventOccurrenceException[];
  }

  return {
    events: Array.from(events.values()),
    chores: Array.from(chores.values()),
    exceptions,
  };
}
