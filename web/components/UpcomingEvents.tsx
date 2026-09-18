import Link from "next/link";
import { TinyLeaf } from "./MeadowSprig";
import {
  type CalendarEvent,
  eventDateRange,
  formatEventDateRange,
  formatEventTime,
} from "@/lib/calendar";

export function UpcomingEvents({
  events,
  timeZone,
}: {
  events: CalendarEvent[];
  timeZone: string;
}) {
  return (
    <section aria-labelledby="upcoming-heading" className="card botanical-card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="page-kicker">The next seven days</p>
          <h2 id="upcoming-heading" className="text-xl font-semibold tracking-tight text-stone-800">
            Coming up
          </h2>
        </div>
        <Link href="/calendar/new" className="btn-primary min-h-10 px-4 text-xs md:hidden">
          Add Event
        </Link>
      </div>

      {events.length ? (
        <ol className="flex flex-col gap-3">
          {events.map((event) => {
            const range = eventDateRange(event, timeZone);
            return (
              <li key={event.id}>
                <Link href={`/calendar/${event.id}`} className="group flex gap-3 rounded-2xl border border-sky-100 bg-[#edf6f7]/75 p-3 transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-sm">
                  <span className="mt-1 h-10 w-1 shrink-0 rounded-full bg-[#78aeb9]" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-[#5b8992]">
                      {formatEventDateRange(event, timeZone)}
                    </span>
                    <span className="mt-1 block truncate font-semibold text-stone-800 group-hover:text-emerald-800">
                      {event.title}
                    </span>
                    <span className="mt-1 block text-sm text-stone-500">
                      {event.allDay ? "All day" : formatEventTime(event, timeZone)}
                      {range.start !== range.end && !event.allDay ? " · spans multiple days" : ""}
                    </span>
                  </span>
                  <span aria-hidden className="self-center text-stone-300">→</span>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="empty-state py-9">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100/70 text-emerald-600">
            <TinyLeaf className="h-6 w-6" />
          </span>
          <p>Nothing is scheduled yet.</p>
          <Link href="/calendar/new" className="btn-primary">Add the first Event</Link>
        </div>
      )}
    </section>
  );
}

