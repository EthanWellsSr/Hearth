import Link from "next/link";
import { PendingLink } from "./PendingLink";
import { completeChore } from "@/app/chores/actions";
import {
  type CalendarItem,
  calendarItemDateRange,
  calendarItemsForDate,
  formatCalendarItemTime,
  monthGrid,
  shiftMonth,
} from "@/lib/calendar";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarMonth({
  items,
  month,
  today,
  timeZone,
  view,
}: {
  items: CalendarItem[];
  month: string;
  today: string;
  timeZone: string;
  view: "month" | "upcoming";
}) {
  const grid = monthGrid(month);
  const viewSuffix = view === "month" ? "&view=month" : "";

  return (
    <section aria-labelledby="month-heading" className="card overflow-hidden bg-white/85">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2">
          <PendingLink href={`/calendar?month=${today.slice(0, 7)}${viewSuffix}`} className="btn-ghost min-h-9 border border-emerald-100 bg-white px-3 text-xs">
            Today
          </PendingLink>
          <PendingLink aria-label="Previous month" href={`/calendar?month=${shiftMonth(month, -1)}${viewSuffix}`} className="icon-btn border border-emerald-100 bg-white">←</PendingLink>
          <PendingLink aria-label="Next month" href={`/calendar?month=${shiftMonth(month, 1)}${viewSuffix}`} className="icon-btn border border-emerald-100 bg-white">→</PendingLink>
        </div>
        <h2 id="month-heading" className="text-xl font-semibold tracking-tight text-stone-800">
          {grid.label}
        </h2>
        <Link href={`/calendar/new?date=${month}-01`} className="btn-primary min-h-10 px-4 text-xs">
          Add Event
        </Link>
      </div>

      <div className="calendar-month-grid" role="grid" aria-label={grid.label}>
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} role="columnheader" className="calendar-weekday">
            {weekday}
          </div>
        ))}
        {grid.weeks.flat().map((date) => {
          const dayItems = calendarItemsForDate(items, date, timeZone);
          const inMonth = date.slice(0, 7) === month;
          const isToday = date === today;
          const desktopMore = Math.max(0, dayItems.length - 4);
          const phoneMore = Math.max(0, dayItems.length - 3);

          return (
            <div
              key={date}
              role="gridcell"
              aria-label={date}
              className={`calendar-day ${inMonth ? "" : "calendar-day-outside"} ${isToday ? "calendar-day-today" : ""}`}
            >
              <div className="mb-1 flex items-center justify-between gap-1">
                <Link
                  href={`/calendar/new?date=${date}`}
                  prefetch={false}
                  aria-label={`Add Event on ${date}`}
                  className="calendar-day-number"
                >
                  {Number(date.slice(-2))}
                </Link>
              </div>
              <div className="calendar-day-events">
                {dayItems.slice(0, 4).map((item, index) => {
                  const range = calendarItemDateRange(item, timeZone);
                  const spansDays = range.start !== range.end;
                  const eventClass = `calendar-event ${item.source === "chore" ? "calendar-chore" : item.allDay || spansDays ? "calendar-event-bar" : "calendar-event-time"} ${index === 3 ? "calendar-event-fourth" : ""} ${range.start < date ? "calendar-event-continues-before" : ""} ${range.end > date ? "calendar-event-continues-after" : ""}`;
                  if (item.source === "chore") {
                    return (
                      <div key={item.key} className={eventClass}>
                        <Link
                          href={item.href}
                          title={`Due · ${item.title}`}
                          className="min-w-0 flex-1 truncate"
                        >
                          <span aria-hidden className="mr-1">✓</span>
                          {item.title}
                        </Link>
                        <form action={completeChore} className="calendar-chore-action">
                          <input type="hidden" name="id" value={item.sourceId} />
                          <button type="submit" aria-label={`Complete Chore: ${item.title}`}>Done</button>
                        </form>
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      title={`${formatCalendarItemTime(item, timeZone)} · ${item.title}`}
                      className={eventClass}
                    >
                      {!item.allDay && !spansDays && (
                        <span className="calendar-event-clock">{formatCalendarItemTime(item, timeZone).split("–")[0]}</span>
                      )}
                      <span className="truncate">{item.title}</span>
                    </Link>
                  );
                })}
                {desktopMore > 0 && (
                  <span className="calendar-more calendar-more-desktop">+{desktopMore} more</span>
                )}
                {phoneMore > 0 && (
                  <span className="calendar-more calendar-more-phone">+{phoneMore} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
