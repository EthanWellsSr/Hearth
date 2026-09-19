"use client";

import { useActionState, useMemo, useState } from "react";
import type { CalendarEvent } from "@/lib/calendar";
import { eventFormDates } from "@/lib/calendar";
import type { RecurrenceFrequency } from "@/lib/calendar";
import {
  type EventFormState,
} from "@/app/calendar/actions";

const INITIAL_EVENT_FORM_STATE: EventFormState = { error: null };

type EventAction = (
  previousState: EventFormState,
  formData: FormData
) => Promise<EventFormState>;

const TIME_SUGGESTIONS = Array.from({ length: 96 }, (_, index) => {
  const hours = Math.floor(index / 4).toString().padStart(2, "0");
  const minutes = ((index % 4) * 15).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
});

type OccurrenceContext = {
  key: string;
  seriesId: string;
  seriesVersion: number;
  exceptionVersion: number | null;
};

export function EventForm({
  action,
  timeZone,
  initialDate,
  initialTime,
  event,
  occurrence,
}: {
  action: EventAction;
  timeZone: string;
  initialDate: string;
  initialTime?: string;
  event?: CalendarEvent;
  occurrence?: OccurrenceContext;
}) {
  const initial = useMemo(
    () =>
      event
        ? eventFormDates(event, timeZone)
        : {
            startDate: initialDate,
            endDate: initialDate,
            startTime: initialTime || "09:00",
            endTime: "",
          },
    [event, initialDate, initialTime, timeZone]
  );
  const [state, formAction, pending] = useActionState(
    action,
    INITIAL_EVENT_FORM_STATE
  );
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [endTime, setEndTime] = useState(initial.endTime);
  const [frequency, setFrequency] = useState<RecurrenceFrequency | "none">(
    event?.recurrenceFrequency ?? "none"
  );
  const [recurrenceEnd, setRecurrenceEnd] = useState<"never" | "date" | "count">(
    event?.recurrenceEndDate ? "date" : event?.recurrenceCount ? "count" : "never"
  );
  const [scope, setScope] = useState<"occurrence" | "future">("occurrence");

  return (
    <form action={formAction} className="card botanical-card grid gap-5 overflow-visible p-5 sm:grid-cols-2 sm:p-7">
      {occurrence ? (
        <>
          <input type="hidden" name="series_id" value={occurrence.seriesId} />
          <input type="hidden" name="occurrence" value={occurrence.key} />
          <input type="hidden" name="series_version" value={occurrence.seriesVersion} />
          {occurrence.exceptionVersion !== null && (
            <input type="hidden" name="exception_version" value={occurrence.exceptionVersion} />
          )}
          <input type="hidden" name="scope" value={scope} />
          <fieldset className="sm:col-span-2 rounded-2xl border border-emerald-100 bg-white/60 p-4">
            <legend className="px-1 text-sm font-semibold text-stone-700">Apply changes to</legend>
            <div className="mt-1 flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input type="radio" name="scope_choice" value="occurrence" checked={scope === "occurrence"} onChange={() => setScope("occurrence")} />
                This occurrence only
              </label>
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input type="radio" name="scope_choice" value="future" checked={scope === "future"} onChange={() => setScope("future")} />
                This and all future occurrences
              </label>
            </div>
          </fieldset>
        </>
      ) : (
        event && (
          <>
            <input type="hidden" name="id" value={event.id} />
            <input type="hidden" name="version" value={event.version} />
          </>
        )
      )}
      <input type="hidden" name="all_day" value={String(allDay)} />
      {!occurrence && event?.recurrenceTimeZone && (
        <input type="hidden" name="recurrence_timezone" value={event.recurrenceTimeZone} />
      )}

      <label className="sm:col-span-2">
        <span className="subtle-label">Event title</span>
        <input
          name="title"
          defaultValue={event?.title || ""}
          maxLength={100}
          className="field w-full"
          placeholder="What is happening?"
          required
          autoFocus
        />
      </label>

      <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#e8f2f4]/70 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-stone-700">All-day Event</p>
          <p className="text-xs text-stone-500">Keep it on its selected calendar dates.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={allDay}
          onClick={() => setAllDay((value) => !value)}
          className={`relative h-8 w-14 rounded-full transition ${allDay ? "bg-emerald-600" : "bg-stone-300"}`}
        >
          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${allDay ? "left-7" : "left-1"}`} />
          <span className="sr-only">Toggle all-day Event</span>
        </button>
      </div>

      <label>
        <span className="subtle-label">Starts</span>
        <input
          name="start_date"
          type="date"
          value={startDate}
          onChange={(e) => {
            const next = e.target.value;
            setStartDate(next);
            if (!endDate || endDate < next) setEndDate(next);
          }}
          className="field w-full"
          required
        />
      </label>

      {!allDay && (
        <label>
          <span className="subtle-label">Start time · {timeZone}</span>
          <input
            name="start_time"
            type="time"
            step="60"
            list="quarter-hour-times"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="field w-full"
            required
          />
        </label>
      )}

      <fieldset className={`grid gap-4 rounded-2xl border border-emerald-100 bg-white/60 p-4 sm:col-span-2 sm:grid-cols-2 ${occurrence ? "hidden" : ""}`}>
        <legend className="px-1 text-sm font-semibold text-stone-700">Repeats</legend>
        <label>
          <span className="subtle-label">Frequency</span>
          <select
            name="recurrence_frequency"
            value={frequency}
            onChange={(event) => setFrequency(event.target.value as RecurrenceFrequency | "none")}
            className="field w-full"
          >
            <option value="none">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>

        {frequency !== "none" && (
          <>
            <label>
              <span className="subtle-label">Every</span>
              <span className="flex items-center gap-2">
                <input name="recurrence_interval" type="number" min="1" max="99" defaultValue={event?.recurrenceInterval || 1} className="field w-24" />
                <span className="text-sm text-stone-500">{frequency === "daily" ? "day(s)" : frequency === "weekly" ? "week(s)" : frequency === "monthly" ? "month(s)" : "year(s)"}</span>
              </span>
            </label>

            {frequency === "weekly" && (
              <fieldset className="sm:col-span-2">
                <legend className="subtle-label">On</legend>
                <div className="flex flex-wrap gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, weekday) => {
                    const selected = event?.recurrenceWeekdays?.includes(weekday) ??
                      new Date(`${startDate}T00:00:00Z`).getUTCDay() === weekday;
                    return (
                      <label key={label} className="flex items-center gap-1.5 rounded-full border border-emerald-100 bg-white px-3 py-2 text-xs font-semibold text-stone-600">
                        <input type="checkbox" name="recurrence_weekday" value={weekday} defaultChecked={selected} />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <label>
              <span className="subtle-label">Ends</span>
              <select name="recurrence_end" value={recurrenceEnd} onChange={(event) => setRecurrenceEnd(event.target.value as "never" | "date" | "count")} className="field w-full">
                <option value="never">Never</option>
                <option value="date">On a date</option>
                <option value="count">After a number of occurrences</option>
              </select>
            </label>
            {recurrenceEnd === "date" && (
              <label>
                <span className="subtle-label">Last occurrence date</span>
                <input name="recurrence_end_date" type="date" min={startDate} defaultValue={event?.recurrenceEndDate || startDate} className="field w-full" />
              </label>
            )}
            {recurrenceEnd === "count" && (
              <label>
                <span className="subtle-label">Occurrences</span>
                <input name="recurrence_count" type="number" min="1" max="999" defaultValue={event?.recurrenceCount || 10} className="field w-full" />
              </label>
            )}
          </>
        )}
      </fieldset>

      <label>
        <span className="subtle-label">Ends {allDay ? "(optional)" : "date"}</span>
        <input
          name="end_date"
          type="date"
          min={startDate}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="field w-full"
        />
      </label>

      {!allDay && (
        <label>
          <span className="subtle-label">End time (optional) · {timeZone}</span>
          <input
            name="end_time"
            type="time"
            step="60"
            list="quarter-hour-times"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="field w-full"
          />
        </label>
      )}

      <datalist id="quarter-hour-times">
        {TIME_SUGGESTIONS.map((time) => <option key={time} value={time} />)}
      </datalist>

      {state.ambiguities?.map((ambiguity) => (
        <fieldset key={ambiguity.field} className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:col-span-2">
          <legend className="px-1 text-sm font-semibold text-amber-900">
            Which {ambiguity.field} time did you mean?
          </legend>
          <div className="mt-2 flex flex-col gap-2">
            {ambiguity.choices.map((choice) => (
              <label key={choice.value} className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="radio"
                  name={`${ambiguity.field}_disambiguation`}
                  value={choice.value}
                  required
                />
                {choice.label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <label className="sm:col-span-2">
        <span className="subtle-label">Details (optional)</span>
        <textarea
          name="details"
          defaultValue={event?.details || ""}
          maxLength={2000}
          rows={5}
          className="field w-full resize-y"
          placeholder="Anything your Household should know"
        />
      </label>

      {state.error && (
        <p role="alert" className="status-message bg-red-500/10 text-red-700 sm:col-span-2">
          {state.error}
        </p>
      )}

      <div className="soft-divider sm:col-span-2" />
      <button disabled={pending} type="submit" className="btn-primary sm:col-span-2 sm:justify-self-end">
        {pending ? "Saving…" : occurrence ? "Save changes" : event ? "Save Event" : "Add Event"}
      </button>
    </form>
  );
}
