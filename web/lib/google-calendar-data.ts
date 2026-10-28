import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calendarEventFromRow,
  calendarItemFromEvent,
  calendarRangeInstants,
  type CalendarItem,
} from "./calendar";
import {
  groupGoogleCalendars,
  type GoogleCalendarSource,
  type ImportedGoogleEvent,
} from "./google-calendar";

export type VisibleGoogleSource = GoogleCalendarSource & {
  connection_id: string;
  status: string;
  last_error: string | null;
  range_start: string;
  range_end: string;
  cached_range_start: string | null;
  cached_range_end: string | null;
};
export async function loadSharedGoogleCalendars(
  supabase: SupabaseClient,
  householdId: string,
  membershipId: string,
  range?: { start: string; end: string },
) {
  const [sources, preferences] = await Promise.all([
    supabase
      .from("google_calendar_sources")
      .select(
        "id,connection_id,google_calendar_id,name,color,status,last_synced_at,last_error,range_start,range_end,cached_range_start,cached_range_end",
      )
      .eq("household_id", householdId),
    supabase
      .from("calendar_visibility")
      .select("calendar_key,visible")
      .eq("household_id", householdId)
      .eq("membership_id", membershipId),
  ]);
  if (sources.error || preferences.error) {
    if (
      [sources.error?.code, preferences.error?.code].some(
        (c) => c === "PGRST205" || c === "42P01",
      )
    )
      return {
        sources: [] as VisibleGoogleSource[],
        hidden: new Set<string>(),
        available: false,
      };
    throw new Error("Could not load calendar visibility. Try again.");
  }
  return {
    sources: groupGoogleCalendars(
      (sources.data || []) as VisibleGoogleSource[],
      range,
    ),
    hidden: new Set<string>(
      (preferences.data || [])
        .filter((p) => !p.visible)
        .map((p) => p.calendar_key),
    ),
    available: true,
  };
}
export async function loadImportedGoogleItems(
  supabase: SupabaseClient,
  householdId: string,
  sources: VisibleGoogleSource[],
  range: { start: string; end: string },
  timeZone: string,
): Promise<CalendarItem[]> {
  if (!sources.length) return [];
  const instants = calendarRangeInstants(range.start, range.end, timeZone);
  const byId = new Map(sources.map((source) => [source.id, source]));
  const rows: (ImportedGoogleEvent & { id: string; source_id: string })[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from("google_calendar_events")
      .select("*")
      .eq("household_id", householdId)
      .in(
        "source_id",
        sources.map((s) => s.id),
      )
      .or(
        `and(all_day.eq.true,start_date.lte.${range.end},end_date.gte.${range.start}),and(all_day.eq.false,starts_at.lt.${instants.endExclusive},ends_at.gt.${instants.start})`,
      )
      .order("id")
      .range(offset, offset + 999);
    if (error) throw new Error("Could not load imported Events. Try again.");
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows.map((row) => {
    const source = byId.get(row.source_id)!;
    const event = calendarEventFromRow({
      id: row.id,
      title: row.title,
      details: row.details,
      all_day: row.all_day,
      start_date: row.start_date,
      end_date: row.end_date,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      created_by_membership_id: null,
      version: 1,
      created_at: "",
      updated_at: "",
    });
    return {
      ...calendarItemFromEvent(event),
      key: `google:${source.google_calendar_id}:${row.google_id}`,
      href: `/calendar/google/event?${new URLSearchParams({ calendar: source.google_calendar_id, event: row.google_id })}`,
      calendarKey: "google:" + source.google_calendar_id,
      calendarName: source.name,
      calendarColor: source.color,
    };
  });
}
