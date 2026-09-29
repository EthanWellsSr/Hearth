import Link from "next/link";
import { DeleteEventButton } from "@/components/DeleteEventButton";
import { DeleteOccurrenceControls } from "@/components/DeleteOccurrenceControls";
import { MemberAvatar } from "@/components/MemberAvatar";
import { requireHousehold } from "@/lib/auth";
import { signedAvatarUrl } from "@/lib/avatar-server";
import {
  calendarEventFromRow,
  describeEventRecurrence,
  effectiveOccurrence,
  type EventOccurrenceException,
  type EventRow,
  formatEventDateRange,
  formatEventTime,
} from "@/lib/calendar";
import { DEFAULT_AVATAR_URL } from "@/lib/profile";

export default async function EventDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; occurrence?: string }>;
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
          <p>It may have been deleted, or it belongs to another Household.</p>
          <Link href="/calendar" className="btn-primary">Return to Calendar</Link>
        </section>
      </>
    );
  }

  const series = calendarEventFromRow(row as EventRow);
  const timeZone = series.recurrenceTimeZone || householdTimeZone;
  const recurrence = describeEventRecurrence(series);

  // Occurrence-scoped view of a recurring series.
  const occurrenceKey =
    query.occurrence && series.recurrenceFrequency ? query.occurrence : null;
  let exception: EventOccurrenceException | null = null;
  if (occurrenceKey) {
    const { data: exceptionRow } = await supabase
      .from("event_occurrence_exceptions")
      .select("*")
      .eq("household_id", householdId)
      .eq("series_id", id)
      .eq("original_occurrence_key", occurrenceKey)
      .maybeSingle();
    exception = (exceptionRow as EventOccurrenceException | null) ?? null;
  }
  const occurrence = occurrenceKey
    ? effectiveOccurrence(series, occurrenceKey, exception)
    : null;
  const cancelled = Boolean(exception?.cancelled);
  const shown = occurrence ?? series;

  let creator: { name: string; avatarUrl: string } | null = null;
  if (series.createdByMembershipId) {
    const { data: membership } = await supabase
      .from("memberships")
      .select("user_id")
      .eq("id", series.createdByMembershipId)
      .eq("household_id", householdId)
      .maybeSingle();
    if (membership) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("display_name, avatar_path")
        .eq("user_id", membership.user_id)
        .maybeSingle();
      if (profile) {
        creator = {
          name: profile.display_name,
          avatarUrl: profile.avatar_path
            ? (await signedAvatarUrl(profile.avatar_path)) || DEFAULT_AVATAR_URL
            : DEFAULT_AVATAR_URL,
        };
      }
    }
  }

  return (
    <>
      <header>
        <Link href="/calendar" className="mb-4 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-900">← Calendar</Link>
        <p className="page-kicker">{occurrenceKey ? "One occurrence" : "Event details"}</p>
        <h1 className="page-title">{shown.title}</h1>
      </header>
      {query.error && <p className="status-message bg-red-500/10 text-red-700">{query.error}</p>}
      {occurrenceKey && (
        <p className="status-message bg-[#e9f4f6] text-[#416f79]">
          {cancelled
            ? "This occurrence was removed from the series."
            : "This is one occurrence of a repeating Event."}
        </p>
      )}
      <article className="card botanical-card flex flex-col gap-6 p-5 sm:p-7">
        <div className="rounded-2xl bg-[#e9f4f6] p-4">
          <p className="font-semibold text-[#416f79]">{formatEventDateRange(shown, timeZone)}</p>
          <p className="mt-1 text-sm text-stone-600">{formatEventTime(shown, timeZone)} · {timeZone}</p>
        </div>
        {recurrence && (
          <div>
            <h2 className="subtle-label">Repeats</h2>
            <p className="text-sm text-stone-700">{recurrence} · {timeZone}</p>
          </div>
        )}
        {shown.details && (
          <div>
            <h2 className="subtle-label">Details</h2>
            <p className="whitespace-pre-wrap text-sm leading-6 text-stone-700">{shown.details}</p>
          </div>
        )}
        <div className="flex items-center gap-3 text-sm text-stone-500">
          {creator ? (
            <>
              <MemberAvatar src={creator.avatarUrl} name={creator.name} size={36} />
              <span>Added by <strong className="font-semibold text-stone-700">{creator.name}</strong></span>
            </>
          ) : (
            <span>Added by Former Member</span>
          )}
        </div>
        <div className="soft-divider" />
        {occurrenceKey ? (
          cancelled ? (
            <div className="flex flex-wrap gap-2">
              <Link href={`/calendar/${id}`} className="btn-primary">View the series</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <Link href={`/calendar/${id}/edit?occurrence=${encodeURIComponent(occurrenceKey)}`} className="btn-primary">Edit occurrence</Link>
                <Link href={`/calendar/${id}`} className="btn-ghost">View the series</Link>
              </div>
              <DeleteOccurrenceControls
                seriesId={id}
                occurrenceKey={occurrenceKey}
                seriesVersion={series.version}
                exceptionVersion={exception ? exception.version : null}
              />
            </div>
          )
        ) : (
          <div className="flex flex-wrap gap-2">
            <Link href={`/calendar/${series.id}/edit`} className="btn-primary">Edit Event</Link>
            <DeleteEventButton id={series.id} title={series.title} />
          </div>
        )}
      </article>
    </>
  );
}
