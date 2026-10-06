import Link from "next/link";
import { EventForm } from "@/components/EventForm";
import { requireHousehold } from "@/lib/auth";
import {
  calendarEventFromRow,
  effectiveOccurrence,
  type EventOccurrenceException,
  type EventRow,
  todayInTimeZone,
} from "@/lib/calendar";
import { saveOccurrence, updateEvent } from "@/app/calendar/actions";

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ occurrence?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { supabase, householdId, householdTimeZone } = await requireHousehold();
  const { data: row } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("household_id", householdId)
    .maybeSingle();
  if (!row) {
    return (
      <>
        <section className="empty-state">
          <h1 className="text-xl font-semibold text-stone-800">This Event is unavailable</h1>
          <Link href="/calendar" className="btn-primary">Return to Calendar</Link>
        </section>
      </>
    );
  }
  const series = calendarEventFromRow(row as EventRow);
  const timeZone = series.recurrenceTimeZone || householdTimeZone;

  // Editing a single occurrence of a recurring series.
  const occurrenceKey =
    query.occurrence && series.recurrenceFrequency ? query.occurrence : null;
  if (occurrenceKey) {
    const { data: exceptionRow } = await supabase
      .from("event_occurrence_exceptions")
      .select("*")
      .eq("household_id", householdId)
      .eq("series_id", id)
      .eq("original_occurrence_key", occurrenceKey)
      .maybeSingle();
    const exception = (exceptionRow as EventOccurrenceException | null) ?? null;
    const occurrence = effectiveOccurrence(series, occurrenceKey, exception);
    if (!occurrence) {
      return (
        <>
          <section className="empty-state">
            <h1 className="text-xl font-semibold text-stone-800">This occurrence is unavailable</h1>
            <Link href={`/calendar/${id}`} className="btn-primary">Back to the series</Link>
          </section>
        </>
      );
    }
    return (
      <>
        <header>
          <Link href={`/calendar/${id}?occurrence=${encodeURIComponent(occurrenceKey)}`} className="mb-4 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-900">← Occurrence</Link>
          <p className="page-kicker">Adjust one occurrence</p>
          <h1 className="page-title">Edit occurrence</h1>
          <p className="page-description">Times are entered in {timeZone}, this series&rsquo; fixed timezone. To change how the Event repeats, <Link href={`/calendar/${id}/edit`} className="font-semibold text-emerald-700 hover:text-emerald-900">edit the entire series</Link>.</p>
        </header>
        <EventForm
          action={saveOccurrence}
          timeZone={timeZone}
          initialDate={todayInTimeZone(timeZone)}
          event={occurrence}
          occurrence={{
            key: occurrenceKey,
            seriesId: id,
            seriesVersion: series.version,
            exceptionVersion: exception ? exception.version : null,
          }}
        />
      </>
    );
  }

  return (
    <>
      <header>
        <Link href={`/calendar/${id}`} className="mb-4 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-900">← Event details</Link>
        <p className="page-kicker">Adjust the plan</p>
        <h1 className="page-title">Edit Event</h1>
        <p className="page-description">Times are entered in {timeZone}{series.recurrenceTimeZone ? ", this series' fixed timezone" : ", your Household timezone"}.</p>
      </header>
      <EventForm
        action={updateEvent}
        timeZone={timeZone}
        initialDate={todayInTimeZone(timeZone)}
        event={series}
      />
    </>
  );
}
