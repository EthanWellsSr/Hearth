// Provider boundary: Google returns expanded occurrences; never re-expand them
// with Hearth's recurrence engine. Calendar dates remain calendar dates.
export type GoogleEvent = {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  status?: string;
  htmlLink?: string;
  hangoutLink?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  conferenceData?: {
    entryPoints?: { entryPointType?: string; uri?: string }[];
  };
  attendees?: {
    self?: boolean;
    displayName?: string;
    email?: string;
    responseStatus?: string;
  }[];
};
export type ImportedGoogleEvent = {
  google_id: string;
  title: string;
  details: string | null;
  location: string | null;
  all_day: boolean;
  start_date: string | null;
  end_date: string | null;
  starts_at: string | null;
  ends_at: string | null;
  source_timezone: string | null;
  html_link: string | null;
  meeting_link: string | null;
  attendees: string[];
  response_status: string | null;
  limited: boolean;
};
export type GoogleCalendarSource = {
  id: string;
  google_calendar_id: string;
  name: string;
  color: string;
  last_synced_at: string | null;
  cached_range_start?: string | null;
  cached_range_end?: string | null;
};
export function safeGoogleUrl(value?: string | null, meeting = false): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const hosts = meeting
      ? ["meet.google.com"]
      : ["calendar.google.com", "www.google.com"];
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (meeting || hosts.includes(url.hostname))
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function calendarColor(value?: string): string {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#78aeb9";
}
export function normalizeGoogleEvent(
  event: GoogleEvent,
  calendarTimeZone?: string,
): ImportedGoogleEvent | null {
  const self = event.attendees?.find((a) => a.self);
  if (
    !event.id ||
    event.status === "cancelled" ||
    self?.responseStatus === "declined"
  )
    return null;
  const allDay = Boolean(event.start?.date);
  let startDate: string | null = null,
    endDate: string | null = null;
  let startsAt: string | null = null,
    endsAt: string | null = null;
  if (allDay) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(event.start?.date ?? "") ||
      !/^\d{4}-\d{2}-\d{2}$/.test(event.end?.date ?? "")
    )
      return null;
    startDate = event.start!.date!;
    const exclusive = new Date(event.end!.date! + "T00:00:00Z");
    if (!Number.isFinite(exclusive.getTime()) || event.end!.date! <= startDate)
      return null;
    exclusive.setUTCDate(exclusive.getUTCDate() - 1);
    endDate = exclusive.toISOString().slice(0, 10);
  } else {
    const start = Date.parse(event.start?.dateTime ?? ""),
      end = Date.parse(event.end?.dateTime ?? "");
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
      return null;
    startsAt = new Date(start).toISOString();
    endsAt = new Date(end).toISOString();
  }
  return {
    google_id: event.id,
    title: event.summary?.trim() || "Busy",
    limited: !event.summary?.trim(),
    details: event.description ?? null,
    location: event.location ?? null,
    all_day: allDay,
    start_date: startDate,
    end_date: endDate,
    starts_at: startsAt,
    ends_at: endsAt,
    source_timezone: event.start?.timeZone ?? calendarTimeZone ?? null,
    html_link: safeGoogleUrl(event.htmlLink),
    meeting_link: safeGoogleUrl(
      event.hangoutLink ||
        event.conferenceData?.entryPoints?.find(
          (p) => p.entryPointType === "video",
        )?.uri,
      true,
    ),
    attendees: (event.attendees ?? []).map(
      (a) => a.displayName || a.email || "Guest",
    ),
    response_status: self?.responseStatus ?? null,
  };
}
export function groupGoogleCalendars<T extends GoogleCalendarSource>(
  sources: T[],
  range?: { start: string; end: string },
): T[] {
  const groups = new Map<string, T>();
  for (const source of sources) {
    const previous = groups.get(source.google_calendar_id);
    const usable = (s: T) => !("status" in s) || s.status !== "unavailable";
    const covers = (s: T) =>
      Boolean(
        range &&
        s.cached_range_start &&
        s.cached_range_end &&
        s.cached_range_start <= range.start &&
        s.cached_range_end >= range.end,
      );
    if (
      !previous ||
      (usable(source) && !usable(previous)) ||
      (usable(source) === usable(previous) &&
        covers(source) &&
        !covers(previous)) ||
      (usable(source) === usable(previous) &&
        covers(source) === covers(previous) &&
        (source.last_synced_at ?? "") > (previous.last_synced_at ?? ""))
    )
      groups.set(source.google_calendar_id, source);
  }
  return Array.from(groups.values());
}
