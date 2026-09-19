import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { CalendarMonth } from "@/components/CalendarMonth";
import { CalendarWeek } from "@/components/CalendarWeek";
import { UpcomingEvents } from "@/components/UpcomingEvents";
import { requireHousehold } from "@/lib/auth";
import {
  calendarQueryWindow,
  normalizeMonth,
  todayInTimeZone,
  upcomingCalendarItems,
  weekRange,
} from "@/lib/calendar";
import { Temporal } from "@js-temporal/polyfill";
import { loadCalendarItems } from "@/lib/calendar-data";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; week?: string; view?: string; deleted?: string }>;
}) {
  const params = await searchParams;
  const { supabase, householdId, householdTimeZone } = await requireHousehold();
  const timeZone = householdTimeZone;
  const today = todayInTimeZone(timeZone);
  const month = normalizeMonth(params.month, today);
  const view = params.view === "week" ? "week" : params.view === "month" ? "month" : "upcoming";
  const week = weekRange(params.week, today);
  const monthWindow = calendarQueryWindow(month, today);
  const upcomingEnd = Temporal.PlainDate.from(today).add({ days: 6 }).toString();
  const range = view === "week"
    ? {
        start: week.start < today ? week.start : today,
        end: week.end > upcomingEnd ? week.end : upcomingEnd,
      }
    : monthWindow;
  const items = await loadCalendarItems(
    supabase,
    householdId,
    range,
    timeZone,
    today
  );
  const upcoming = upcomingCalendarItems(items, today, timeZone);

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
        <div className="flex flex-wrap items-center justify-end gap-2">
          <p className="rounded-full bg-white/65 px-3 py-1.5 text-xs font-medium text-stone-500">
            Household time · {timeZone}
          </p>
        </div>
      </header>

      {params.deleted && (
        <p className="status-message bg-emerald-100/80 text-emerald-800">Event deleted.</p>
      )}

      <nav aria-label="Calendar view" className="grid grid-cols-3 rounded-full border border-emerald-100 bg-white/70 p-1">
        <Link href={`/calendar?month=${month}`} className={`rounded-full px-4 py-2 text-center text-sm font-semibold ${view === "upcoming" ? "bg-emerald-600 text-white" : "text-stone-500"}`}>
          Upcoming
        </Link>
        <Link href={`/calendar?month=${month}&view=month`} className={`rounded-full px-4 py-2 text-center text-sm font-semibold ${view === "month" ? "bg-emerald-600 text-white" : "text-stone-500"}`}>
          Month
        </Link>
        <Link href={`/calendar?view=week&week=${week.start}`} className={`rounded-full px-4 py-2 text-center text-sm font-semibold ${view === "week" ? "bg-emerald-600 text-white" : "text-stone-500"}`}>
          Week
        </Link>
      </nav>

      {view === "week" ? (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="min-w-0">
            <CalendarWeek items={items} dates={week.dates} today={today} timeZone={timeZone} />
          </div>
          <div className="hidden xl:block">
            <UpcomingEvents items={upcoming} timeZone={timeZone} today={today} />
          </div>
        </div>
      ) : (
        <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_19rem]">
          <div className={`${view === "month" ? "block" : "hidden"} min-w-0 md:block`}>
            <CalendarMonth items={items} month={month} today={today} timeZone={timeZone} view={view} />
          </div>
          <div className={`${view === "upcoming" ? "block" : "hidden"} md:block`}>
            <UpcomingEvents items={upcoming} timeZone={timeZone} today={today} />
          </div>
        </div>
      )}
    </main>
  );
}
