import { Temporal } from "@js-temporal/polyfill";
import Link from "next/link";
import { completeChore } from "@/app/chores/actions";
import {
  calendarItemDateRange,
  calendarItemsForDate,
  formatCalendarItemTime,
  shiftWeek,
  type CalendarItem,
} from "@/lib/calendar";

const HOUR_HEIGHT = 48;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

type PositionedItem = {
  item: CalendarItem;
  startMinute: number;
  endMinute: number;
  column: number;
  columns: number;
};

function timedItemsForDate(
  items: CalendarItem[],
  date: string,
  timeZone: string
): PositionedItem[] {
  const timed = calendarItemsForDate(items, date, timeZone)
    .filter((item) => {
      const range = calendarItemDateRange(item, timeZone);
      return item.source === "event" && !item.allDay && range.start === range.end;
    })
    .map((item) => {
      const start = Temporal.Instant.from(item.startsAt!).toZonedDateTimeISO(timeZone);
      const end = item.endsAt
        ? Temporal.Instant.from(item.endsAt).toZonedDateTimeISO(timeZone)
        : start.add({ minutes: 30 });
      return {
        item,
        startMinute: start.hour * 60 + start.minute,
        endMinute: Math.max(start.hour * 60 + start.minute + 30, end.hour * 60 + end.minute),
        column: 0,
        columns: 1,
      };
    })
    .sort((left, right) => left.startMinute - right.startMinute || left.endMinute - right.endMinute);

  let index = 0;
  while (index < timed.length) {
    let end = timed[index].endMinute;
    let clusterEnd = index + 1;
    while (clusterEnd < timed.length && timed[clusterEnd].startMinute < end) {
      end = Math.max(end, timed[clusterEnd].endMinute);
      clusterEnd += 1;
    }
    const columnEnds: number[] = [];
    for (const positioned of timed.slice(index, clusterEnd)) {
      let column = columnEnds.findIndex((columnEnd) => columnEnd <= positioned.startMinute);
      if (column < 0) column = columnEnds.length;
      columnEnds[column] = positioned.endMinute;
      positioned.column = column;
    }
    for (const positioned of timed.slice(index, clusterEnd)) {
      positioned.columns = columnEnds.length;
    }
    index = clusterEnd;
  }
  return timed;
}

function dayLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function timeParam(hour: number) {
  return `${hour.toString().padStart(2, "0")}:00`;
}

export function CalendarWeek({
  items,
  dates,
  today,
  timeZone,
}: {
  items: CalendarItem[];
  dates: string[];
  today: string;
  timeZone: string;
}) {
  const start = dates[0];
  const allDayByDate = dates.map((date) =>
    calendarItemsForDate(items, date, timeZone).filter((item) => {
      const range = calendarItemDateRange(item, timeZone);
      return item.allDay || range.start !== range.end;
    })
  );

  return (
    <section aria-labelledby="week-heading" className="card overflow-hidden bg-white/90">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2">
          <Link href={`/calendar?view=week&week=${today}`} className="btn-ghost min-h-9 border border-emerald-100 bg-white px-3 text-xs">Today</Link>
          <Link aria-label="Previous week" href={`/calendar?view=week&week=${shiftWeek(start, -1)}`} className="icon-btn border border-emerald-100 bg-white">←</Link>
          <Link aria-label="Next week" href={`/calendar?view=week&week=${shiftWeek(start, 1)}`} className="icon-btn border border-emerald-100 bg-white">→</Link>
        </div>
        <h2 id="week-heading" className="text-lg font-semibold tracking-tight text-stone-800">
          {dayLabel(dates[0])} – {dayLabel(dates[6])}
        </h2>
        <Link href={`/calendar/new?date=${today}`} className="btn-primary min-h-10 px-4 text-xs">Add Event</Link>
      </div>

      <div className="calendar-week-scroll">
        <div className="calendar-week-grid">
          <div className="calendar-week-corner">All day</div>
          {dates.map((date) => (
            <div key={date} className={`calendar-week-header ${date === today ? "calendar-week-today" : ""}`}>
              {dayLabel(date)}
            </div>
          ))}

          <div className="calendar-week-all-day-label" />
          {allDayByDate.map((dayItems, dayIndex) => (
            <div key={dates[dayIndex]} className="calendar-week-all-day">
              {dayItems.map((item) => (
                <div key={`${item.key}:${dates[dayIndex]}`} className={`calendar-week-all-day-item ${item.source === "chore" ? "calendar-week-chore" : ""}`}>
                  <Link href={item.href} className="truncate" title={item.title}>{item.source === "chore" ? "✓ " : ""}{item.title}</Link>
                  {item.source === "chore" && (
                    <form action={completeChore}>
                      <input type="hidden" name="id" value={item.sourceId} />
                      <button type="submit" aria-label={`Complete Chore: ${item.title}`}>Done</button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          ))}

          <div className="calendar-week-times">
            {HOURS.map((hour) => <div key={hour} style={{ height: HOUR_HEIGHT }}>{hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}</div>)}
          </div>
          {dates.map((date) => {
            const positioned = timedItemsForDate(items, date, timeZone);
            return (
              <div key={date} className={`calendar-week-day ${date === today ? "calendar-week-day-today" : ""}`} style={{ height: 24 * HOUR_HEIGHT }}>
                {HOURS.map((hour) => (
                  <Link
                    key={hour}
                    aria-label={`Add Event on ${date} at ${timeParam(hour)}`}
                    href={`/calendar/new?date=${date}&time=${timeParam(hour)}`}
                    className="calendar-week-slot"
                    style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                  />
                ))}
                {positioned.map(({ item, startMinute, endMinute, column, columns }) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    title={`${formatCalendarItemTime(item, timeZone)} · ${item.title}`}
                    className="calendar-week-event"
                    style={{
                      top: (startMinute / 60) * HOUR_HEIGHT,
                      height: Math.max(24, ((endMinute - startMinute) / 60) * HOUR_HEIGHT),
                      left: `calc(${(column / columns) * 100}% + 2px)`,
                      width: `calc(${100 / columns}% - 4px)`,
                    }}
                  >
                    <span className="font-semibold">{item.title}</span>
                    <span>{formatCalendarItemTime(item, timeZone)}</span>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
