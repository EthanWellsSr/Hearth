import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { CalendarMonth } from "@/components/CalendarMonth";
import { UpcomingEvents } from "@/components/UpcomingEvents";
import { requireHousehold } from "@/lib/auth";
import {
  calendarEventFromRow,
  type EventRow,
  normalizeMonth,
  todayInTimeZone,
  upcomingEvents,
} from "@/lib/calendar";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string; deleted?: string }>;
}) {
  const params = await searchParams;
  const { supabase, householdId } = await requireHousehold();
  const [{ data: household }, { data: rows }] = await Promise.all([
    supabase.from("households").select("timezone").eq("id", householdId).single(),
    supabase.from("events").select("*").order("created_at", { ascending: true }),
  ]);
  const timeZone = household?.timezone || "America/Chicago";
  const today = todayInTimeZone(timeZone);
  const month = normalizeMonth(params.month, today);
  const view = params.view === "month" ? "month" : "upcoming";
  const events = ((rows ?? []) as EventRow[]).map(calendarEventFromRow);
  const upcoming = upcomingEvents(events, today, timeZone);

  return (
    <main className="app-shell max-w-6xl">
      <AppHeader />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="page-kicker">The shape of your days</p>
          <h1 className="page-title">Calendar</h1>
          <p className="page-description">
            Everyone in your Household can add and tend to what is happening.
          </p>
        </div>
        <p className="rounded-full bg-white/65 px-3 py-1.5 text-xs font-medium text-stone-500">
          Household time · {timeZone}
        </p>
      </header>

      {params.deleted && (
        <p className="status-message bg-emerald-100/80 text-emerald-800">Event deleted.</p>
      )}

      <nav aria-label="Calendar view" className="grid grid-cols-2 rounded-full border border-emerald-100 bg-white/70 p-1 md:hidden">
        <Link href={`/calendar?month=${month}`} className={`rounded-full px-4 py-2 text-center text-sm font-semibold ${view === "upcoming" ? "bg-emerald-600 text-white" : "text-stone-500"}`}>
          Upcoming
        </Link>
        <Link href={`/calendar?month=${month}&view=month`} className={`rounded-full px-4 py-2 text-center text-sm font-semibold ${view === "month" ? "bg-emerald-600 text-white" : "text-stone-500"}`}>
          Month
        </Link>
      </nav>

      <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_19rem]">
        <div className={`${view === "month" ? "block" : "hidden"} min-w-0 md:block`}>
          <CalendarMonth events={events} month={month} today={today} timeZone={timeZone} view={view} />
        </div>
        <div className={`${view === "upcoming" ? "block" : "hidden"} md:block`}>
          <UpcomingEvents events={upcoming} timeZone={timeZone} />
        </div>
      </div>
    </main>
  );
}

