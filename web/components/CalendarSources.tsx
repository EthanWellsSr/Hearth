import Link from "next/link";
import {
  expandCalendarRange,
  saveCalendarVisibility,
  syncCalendarNow,
} from "@/app/google-calendar/actions";
import { FormSubmitButton } from "./FormSubmitButton";
import type { VisibleGoogleSource } from "@/lib/google-calendar-data";
import { CalendarRangeLoader } from "./CalendarRangeLoader";

export function CalendarSources({
  sources,
  hidden,
  range,
}: {
  sources: VisibleGoogleSource[];
  hidden: Set<string>;
  range: { start: string; end: string };
}) {
  return (
    <section className="card p-4" aria-label="Calendar sources">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Your calendars</h2>
        <Link
          href="/people/calendars"
          className="text-sm font-semibold text-emerald-800 underline"
        >
          Manage Google connections
        </Link>
      </div>
      <ul className="grid gap-3">
        {[
          { id: "hearth", key: "hearth", name: "Hearth", color: "#557d52" },
          ...sources.map((s) => ({
            ...s,
            key: "google:" + s.google_calendar_id,
          })),
        ].map((source) => (
          <li
            key={source.key}
            className="flex flex-wrap items-center gap-x-4 gap-y-2"
          >
            <form
              action={saveCalendarVisibility}
              className="flex items-center gap-2"
            >
              <input type="hidden" name="calendar_key" value={source.key} />
              <input
                type="hidden"
                name="visible"
                value={String(hidden.has(source.key))}
              />
              <span
                aria-hidden
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: source.color }}
              />
              <FormSubmitButton
                role="switch"
                aria-checked={!hidden.has(source.key)}
                aria-label={`${source.name} calendar`}
                className="flex items-center gap-2 text-sm font-semibold"
                pendingChildren="Saving…"
              >
                <span
                  aria-hidden
                  className="flex h-5 w-5 items-center justify-center border border-stone-400"
                >
                  {!hidden.has(source.key) ? "✓" : ""}
                </span>
                {source.name}
              </FormSubmitButton>
            </form>
            {"status" in source && (
              <>
                <span className="text-xs text-stone-500">
                  {source.status === "importing"
                    ? "Importing…"
                    : source.last_synced_at
                      ? `Last synced ${new Date(source.last_synced_at).toLocaleString("en-US", { timeZone: "UTC" })} UTC`
                      : "Not synchronized yet"}
                </span>
                {source.last_error && (
                  <p role="status" className="text-xs text-rose-700">
                    {source.last_error}
                  </p>
                )}
                <form action={syncCalendarNow}>
                  <input type="hidden" name="source_id" value={source.id} />
                  <FormSubmitButton
                    className="btn-ghost min-h-8 px-2 text-xs"
                    pendingChildren="Syncing…"
                  >
                    Sync now
                  </FormSubmitButton>
                </form>
                {(!source.cached_range_start ||
                  !source.cached_range_end ||
                  range.start < source.cached_range_start ||
                  range.end > source.cached_range_end) && (
                  <form action={expandCalendarRange}>
                    <CalendarRangeLoader
                      sourceId={source.id}
                      start={range.start}
                      end={range.end}
                    />
                    <input type="hidden" name="source_id" value={source.id} />
                    <input type="hidden" name="start" value={range.start} />
                    <input type="hidden" name="end" value={range.end} />
                    <FormSubmitButton
                      className="btn-ghost text-xs"
                      pendingChildren="Loading dates…"
                    >
                      Load Events for these dates
                    </FormSubmitButton>
                  </form>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-stone-500">
        Visibility applies only to your view and is saved across devices. Hearth
        includes Events and due Chores. All imported calendars are shared with
        the Household.
      </p>
    </section>
  );
}
