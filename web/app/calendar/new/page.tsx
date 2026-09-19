import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { EventForm } from "@/components/EventForm";
import { requireHousehold } from "@/lib/auth";
import { todayInTimeZone } from "@/lib/calendar";
import { createEvent } from "../actions";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; time?: string }>;
}) {
  const params = await searchParams;
  const { householdTimeZone } = await requireHousehold();
  const timeZone = householdTimeZone;
  const today = todayInTimeZone(timeZone);
  const initialDate = /^\d{4}-\d{2}-\d{2}$/.test(params.date || "") ? params.date! : today;
  const initialTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(params.time || "")
    ? params.time
    : undefined;

  return (
    <main className="app-shell max-w-3xl">
      <AppHeader />
      <header>
        <Link href="/calendar" className="mb-4 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-900">← Calendar</Link>
        <p className="page-kicker">Something to look forward to</p>
        <h1 className="page-title">Add an Event</h1>
        <p className="page-description">Times are entered in your Household timezone: {timeZone}.</p>
      </header>
      <EventForm action={createEvent} timeZone={timeZone} initialDate={initialDate} initialTime={initialTime} />
    </main>
  );
}
