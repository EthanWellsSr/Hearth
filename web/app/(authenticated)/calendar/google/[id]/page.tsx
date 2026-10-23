import Link from "next/link";
import { notFound } from "next/navigation";
import { requireHousehold } from "@/lib/auth";
import { safeGoogleUrl, type ImportedGoogleEvent } from "@/lib/google-calendar";

export default async function ImportedEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ calendar?: string; event?: string }>;
}) {
  const { id } = await params;
  const { supabase, householdId, householdTimeZone } = await requireHousehold();
  let event: (ImportedGoogleEvent & { id: string; source_id: string }) | null =
    null;
  if (id === "event") {
    const query = await searchParams;
    if (!query.calendar || !query.event) notFound();
    const { data: candidates, error: sourceError } = await supabase
      .from("google_calendar_sources")
      .select("id,last_synced_at")
      .eq("household_id", householdId)
      .eq("google_calendar_id", query.calendar)
      .order("last_synced_at", { ascending: false, nullsFirst: false });
    if (sourceError || !candidates?.length) notFound();
    const { data: matches, error } = await supabase
      .from("google_calendar_events")
      .select("*")
      .eq("household_id", householdId)
      .in(
        "source_id",
        candidates.map((s) => s.id),
      )
      .eq("google_id", query.event);
    if (error) notFound();
    for (const candidate of candidates) {
      const match = matches?.find((item) => item.source_id === candidate.id);
      if (match) {
        event = match;
        break;
      }
    }
  } else {
    const { data, error } = await supabase
      .from("google_calendar_events")
      .select("*")
      .eq("household_id", householdId)
      .eq("id", id)
      .maybeSingle();
    if (error) notFound();
    event = data;
  }
  if (!event) notFound();
  const { data: source } = await supabase
    .from("google_calendar_sources")
    .select("name,last_synced_at,last_error")
    .eq("household_id", householdId)
    .eq("id", event.source_id)
    .single();
  const time = (value: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: householdTimeZone,
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date(value));
  const googleLink = safeGoogleUrl(event.html_link),
    meetingLink = safeGoogleUrl(event.meeting_link, true);
  return (
    <>
      <header>
        <p className="page-kicker">
          {source?.name || "Google Calendar"} · Read-only
        </p>
        <h1 className="page-title">{event.title}</h1>
      </header>
      <section className="card grid gap-4 p-5 sm:p-6">
        <p>
          {event.all_day
            ? `${event.start_date}${event.end_date !== event.start_date ? ` – ${event.end_date}` : ""} · All day`
            : `${time(event.starts_at!)} – ${time(event.ends_at!)}`}
        </p>
        {!event.all_day && (
          <p className="text-sm text-stone-500">
            Household time · {householdTimeZone}
            {event.source_timezone &&
            event.source_timezone !== householdTimeZone
              ? ` · Source timezone: ${event.source_timezone}`
              : ""}
          </p>
        )}
        {event.limited && (
          <p className="status-message bg-amber-50">
            Google has not provided details for this Event.
          </p>
        )}
        {event.details && (
          <p className="whitespace-pre-wrap break-words">{event.details}</p>
        )}
        {event.location && (
          <p className="break-words">Location: {event.location}</p>
        )}
        {meetingLink && (
          <a
            href={meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-800 underline"
          >
            Join meeting
          </a>
        )}
        {event.response_status && <p>Invitation: {event.response_status}</p>}
        {Array.isArray(event.attendees) && event.attendees.length > 0 && (
          <div>
            <h2 className="font-semibold">Attendees</h2>
            <ul className="list-inside list-disc">
              {event.attendees.map((name: string, index: number) => (
                <li key={index} className="break-words">
                  {name}
                </li>
              ))}
            </ul>
          </div>
        )}
        {source?.last_error && (
          <p role="status" className="text-rose-700">
            {source.last_error}
          </p>
        )}
        <p className="text-sm text-stone-500">
          Edit this Event and manage its reminders in Google Calendar.
        </p>
        {googleLink && (
          <a
            href={googleLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary justify-self-start"
          >
            Open in Google Calendar
          </a>
        )}
      </section>
      <Link href="/calendar" className="btn-ghost self-start">
        Back to Calendar
      </Link>
    </>
  );
}
