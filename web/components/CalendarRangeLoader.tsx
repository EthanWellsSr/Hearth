"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { expandCalendarRange } from "@/app/google-calendar/actions";

export function CalendarRangeLoader({
  sourceId,
  start,
  end,
}: {
  sourceId: string;
  start: string;
  end: string;
}) {
  const attempted = useRef("");
  const [error, setError] = useState(false),
    [pending, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => {
    const key = `${sourceId}:${start}:${end}`;
    if (attempted.current === key) return;
    attempted.current = key;
    startTransition(async () => {
      try {
        const data = new FormData();
        data.set("source_id", sourceId);
        data.set("start", start);
        data.set("end", end);
        await expandCalendarRange(data);
        router.refresh();
      } catch {
        setError(true);
      }
    });
  }, [sourceId, start, end, router]);
  return (
    <span role="status" className="text-xs text-stone-500">
      {error
        ? "Could not load these dates. Use Load Events to retry."
        : pending
          ? "Loading Google Events for these dates…"
          : ""}
    </span>
  );
}
