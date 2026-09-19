"use client";

import { useState } from "react";
import { deleteOccurrence } from "@/app/calendar/actions";

const LABELS: Record<string, string> = {
  occurrence: "just this occurrence",
  future: "this and all future occurrences",
  series: "the entire series",
};

export function DeleteOccurrenceControls({
  seriesId,
  occurrenceKey,
  seriesVersion,
  exceptionVersion,
}: {
  seriesId: string;
  occurrenceKey: string;
  seriesVersion: number;
  exceptionVersion: number | null;
}) {
  const [scope, setScope] = useState<"occurrence" | "future" | "series">("occurrence");

  return (
    <form
      action={deleteOccurrence}
      onSubmit={(event) => {
        if (!window.confirm(`Delete ${LABELS[scope]}? This cannot be undone.`)) {
          event.preventDefault();
        }
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="series_id" value={seriesId} />
      <input type="hidden" name="occurrence" value={occurrenceKey} />
      <input type="hidden" name="series_version" value={seriesVersion} />
      {exceptionVersion !== null && (
        <input type="hidden" name="exception_version" value={exceptionVersion} />
      )}
      <input type="hidden" name="scope" value={scope} />
      <label className="text-sm text-stone-600">
        Delete
        <select
          value={scope}
          onChange={(event) => setScope(event.target.value as typeof scope)}
          className="field ml-2 inline-block w-auto"
        >
          <option value="occurrence">just this occurrence</option>
          <option value="future">this and future</option>
          <option value="series">the entire series</option>
        </select>
      </label>
      <button type="submit" className="btn-ghost text-red-700 hover:bg-red-50 hover:text-red-800">
        Delete
      </button>
    </form>
  );
}
