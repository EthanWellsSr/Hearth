import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DeleteEventButton } from "@/components/DeleteEventButton";
import { MemberAvatar } from "@/components/MemberAvatar";
import { requireHousehold } from "@/lib/auth";
import { signedAvatarUrl } from "@/lib/avatar-server";
import {
  calendarEventFromRow,
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
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { supabase, householdId } = await requireHousehold();
  const [{ data: household }, { data: row }] = await Promise.all([
    supabase.from("households").select("timezone").eq("id", householdId).single(),
    supabase.from("events").select("*").eq("id", id).maybeSingle(),
  ]);
  if (!row) {
    return (
      <main className="app-shell max-w-3xl">
        <AppHeader />
        <section className="empty-state">
          <h1 className="text-xl font-semibold text-stone-800">This Event is unavailable</h1>
          <p>It may have been deleted, or it belongs to another Household.</p>
          <Link href="/calendar" className="btn-primary">Return to Calendar</Link>
        </section>
      </main>
    );
  }

  const event = calendarEventFromRow(row as EventRow);
  const timeZone = household?.timezone || "America/Chicago";
  let creator: { name: string; avatarUrl: string } | null = null;
  if (event.createdByMembershipId) {
    const { data: membership } = await supabase
      .from("memberships")
      .select("user_id")
      .eq("id", event.createdByMembershipId)
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
    <main className="app-shell max-w-3xl">
      <AppHeader />
      <header>
        <Link href="/calendar" className="mb-4 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-900">← Calendar</Link>
        <p className="page-kicker">Event details</p>
        <h1 className="page-title">{event.title}</h1>
      </header>
      {query.error && <p className="status-message bg-red-500/10 text-red-700">{query.error}</p>}
      <article className="card botanical-card flex flex-col gap-6 p-5 sm:p-7">
        <div className="rounded-2xl bg-[#e9f4f6] p-4">
          <p className="font-semibold text-[#416f79]">{formatEventDateRange(event, timeZone)}</p>
          <p className="mt-1 text-sm text-stone-600">{formatEventTime(event, timeZone)} · {timeZone}</p>
        </div>
        {event.details && (
          <div>
            <h2 className="subtle-label">Details</h2>
            <p className="whitespace-pre-wrap text-sm leading-6 text-stone-700">{event.details}</p>
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
        <div className="flex flex-wrap gap-2">
          <Link href={`/calendar/${event.id}/edit`} className="btn-primary">Edit Event</Link>
          <DeleteEventButton id={event.id} title={event.title} />
        </div>
      </article>
    </main>
  );
}

