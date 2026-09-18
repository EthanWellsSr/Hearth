"use client";

import { useActionState, useMemo, useState } from "react";
import type { CalendarEvent } from "@/lib/calendar";
import { eventFormDates } from "@/lib/calendar";
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

export function EventForm({
  action,
  timeZone,
  initialDate,
  event,
}: {
  action: EventAction;
  timeZone: string;
  initialDate: string;
  event?: CalendarEvent;
}) {
  const initial = useMemo(
    () =>
      event
        ? eventFormDates(event, timeZone)
        : {
            startDate: initialDate,
            endDate: initialDate,
            startTime: "09:00",
            endTime: "",
          },
    [event, initialDate, timeZone]
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

  return (
    <form action={formAction} className="card botanical-card grid gap-5 overflow-visible p-5 sm:grid-cols-2 sm:p-7">
      {event && (
        <>
          <input type="hidden" name="id" value={event.id} />
          <input type="hidden" name="version" value={event.version} />
        </>
      )}
      <input type="hidden" name="all_day" value={String(allDay)} />

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
        {pending ? "Saving…" : event ? "Save Event" : "Add Event"}
      </button>
    </form>
  );
}
