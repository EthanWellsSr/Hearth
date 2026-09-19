import Link from "next/link";
import { completeChore } from "@/app/chores/actions";
import { TinyLeaf } from "./MeadowSprig";
import {
  type CalendarItem,
  calendarItemDateRange,
  formatCalendarItemDateRange,
  formatCalendarItemTime,
} from "@/lib/calendar";

export function UpcomingEvents({
  items,
  timeZone,
  today,
}: {
  items: CalendarItem[];
  timeZone: string;
  today: string;
}) {
  const overdue = items.filter(
    (item) => item.source === "chore" && item.dueDate < today
  );
  const upcoming = items.filter(
    (item) => item.source !== "chore" || item.dueDate >= today
  );

  const renderItem = (item: CalendarItem) => {
    const range = calendarItemDateRange(item, timeZone);
    return (
      <li key={item.key} className={`flex gap-2 rounded-2xl border p-3 transition hover:-translate-y-0.5 hover:shadow-sm ${item.source === "chore" ? "border-amber-200 bg-amber-50/75" : "border-sky-100 bg-[#edf6f7]/75"}`}>
        <Link href={item.href} className="group flex min-w-0 flex-1 gap-3">
          <span className={`mt-1 h-10 w-1 shrink-0 rounded-full ${item.source === "chore" ? "bg-amber-500" : "bg-[#78aeb9]"}`} />
          <span className="min-w-0 flex-1">
            <span className={`block text-xs font-semibold uppercase tracking-[0.08em] ${item.source === "chore" ? "text-amber-700" : "text-[#5b8992]"}`}>
              {formatCalendarItemDateRange(item, timeZone)}
            </span>
            <span className="mt-1 block truncate font-semibold text-stone-800 group-hover:text-emerald-800">
              {item.source === "chore" && <span aria-hidden className="mr-1">✓</span>}
              {item.title}
            </span>
            <span className="mt-1 block text-sm text-stone-500">
              {formatCalendarItemTime(item, timeZone)}
              {range.start !== range.end && !item.allDay ? " · spans multiple days" : ""}
            </span>
          </span>
          <span aria-hidden className="self-center text-stone-300">→</span>
        </Link>
        {item.source === "chore" && (
          <form action={completeChore} className="self-center">
            <input type="hidden" name="id" value={item.sourceId} />
            <button type="submit" className="btn-ghost min-h-9 border border-amber-200 bg-white px-3 text-xs" aria-label={`Complete Chore: ${item.title}`}>
              Done
            </button>
          </form>
        )}
      </li>
    );
  };

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

      {items.length ? (
        <div className="grid gap-5">
          {overdue.length > 0 && (
            <section aria-labelledby="overdue-chores-heading">
              <h3 id="overdue-chores-heading" className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">Overdue Chores</h3>
              <ol className="flex flex-col gap-3">{overdue.map(renderItem)}</ol>
            </section>
          )}
          {upcoming.length > 0 && (
            <ol className="flex flex-col gap-3">{upcoming.map(renderItem)}</ol>
          )}
        </div>
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
