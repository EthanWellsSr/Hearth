"use client";

import { useEffect, useId, useState } from "react";
import { TIME_ZONE_OPTIONS } from "@/lib/timezones";

export function TimezoneField({
  initialTimeZone,
  label = "Household timezone",
}: {
  initialTimeZone?: string | null;
  label?: string;
}) {
  const [timeZone, setTimeZone] = useState(initialTimeZone || "America/Chicago");
  const listId = useId();

  useEffect(() => {
    if (initialTimeZone) return;
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!detected) return;
    const frame = requestAnimationFrame(() => setTimeZone(detected));
    return () => cancelAnimationFrame(frame);
  }, [initialTimeZone]);

  return (
    <label>
      <span className="subtle-label">{label}</span>
      <input
        name="timezone"
        value={timeZone}
        onChange={(event) => setTimeZone(event.target.value)}
        list={listId}
        className="field w-full"
        required
        autoComplete="off"
      />
      <datalist id={listId}>
        {TIME_ZONE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </datalist>
      <span className="mt-1.5 block text-xs leading-5 text-stone-400">
        Event times always use your home’s timezone, even while a Member is traveling.
      </span>
    </label>
  );
}
