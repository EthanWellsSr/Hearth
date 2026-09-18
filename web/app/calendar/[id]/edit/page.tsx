import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { EventForm } from "@/components/EventForm";
import { requireHousehold } from "@/lib/auth";
import { calendarEventFromRow, type EventRow, todayInTimeZone } from "@/lib/calendar";
import { updateEvent } from "../../actions";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
          <Link href="/calendar" className="btn-primary">Return to Calendar</Link>
        </section>
      </main>
    );
  }
  const event = calendarEventFromRow(row as EventRow);
  const timeZone = household?.timezone || "America/Chicago";

  return (
    <main className="app-shell max-w-3xl">
      <AppHeader />
      <header>
        <Link href={`/calendar/${id}`} className="mb-4 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-900">← Event details</Link>
        <p className="page-kicker">Adjust the plan</p>
        <h1 className="page-title">Edit Event</h1>
        <p className="page-description">Times are entered in your Household timezone: {timeZone}.</p>
      </header>
      <EventForm
        action={updateEvent}
        timeZone={timeZone}
        initialDate={todayInTimeZone(timeZone)}
        event={event}
      />
    </main>
  );
}

