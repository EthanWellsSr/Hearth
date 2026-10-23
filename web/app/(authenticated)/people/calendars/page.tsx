import Link from "next/link";
import { requireHousehold } from "@/lib/auth";
import {
  googleCalendarConfigured,
  listAvailableGoogleCalendars,
} from "@/lib/google-calendar-server";
import {
  disconnectGoogleAccount,
  saveGoogleCalendarSelection,
} from "@/app/google-calendar/actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";

export default async function GoogleCalendarsPage({
  searchParams,
}: {
  searchParams: Promise<{ connection?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { supabase, householdId, user } = await requireHousehold();
  const configured = googleCalendarConfigured();
  const { data: connections, error } = await supabase
    .from("google_connections")
    .select("id,email,needs_reconnect,selection_confirmed")
    .eq("household_id", householdId)
    .eq("user_id", user.id);
  if (error)
    return (
      <div className="card p-5">
        <h1 className="page-title">Google calendars</h1>
        <p className="mt-3">
          Google Calendar setup is not available yet. Your Hearth Calendar still
          works.
        </p>
        <Link href="/calendar" className="btn-ghost">
          Back to Calendar
        </Link>
      </div>
    );
  const selected = connections?.find((c) => c.id === params.connection);
  const { data: sources } = selected
    ? await supabase
        .from("google_calendar_sources")
        .select("google_calendar_id,status")
        .eq("household_id", householdId)
        .eq("connection_id", selected.id)
    : { data: [] };
  let available: Awaited<ReturnType<typeof listAvailableGoogleCalendars>> = [],
    failed = false;
  if (selected && configured) {
    try {
      available = await listAvailableGoogleCalendars(selected.id);
    } catch {
      failed = true;
    }
  }
  const hasSelection = Boolean(selected?.selection_confirmed);
  return (
    <>
      <header>
        <p className="page-kicker">Household settings</p>
        <h1 className="page-title">Google calendars</h1>
        <p className="page-description">
          Connect your Google accounts and choose calendars to share with
          everyone in your Household. Google Events are read-only in Hearth.
        </p>
      </header>
      {params.error && (
        <p role="alert" className="status-message bg-rose-50 text-rose-700">
          Google connection was not completed. Try connecting again and allow
          the requested read-only calendar permissions.
        </p>
      )}
      {!configured ? (
        <p role="status" className="card p-5">
          Google Calendar connection is awaiting administrator setup.
        </p>
      ) : (
        <a
          href="/api/google-calendar/connect"
          className="btn-primary self-start"
        >
          Connect Google account
        </a>
      )}
      <div className="grid gap-3">
        {connections?.map((c) => (
          <section key={c.id} className="card p-5">
            <h2 className="font-semibold">{c.email}</h2>
            {c.needs_reconnect && (
              <p className="text-rose-700">
                Reconnect this account to resume synchronization.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                href={`/people/calendars?connection=${c.id}`}
                className="btn-ghost"
              >
                Choose calendars
              </Link>
              {configured && (
                <a href="/api/google-calendar/connect" className="btn-ghost">
                  Reconnect
                </a>
              )}
              <form action={disconnectGoogleAccount}>
                <input type="hidden" name="connection_id" value={c.id} />
                <FormSubmitButton
                  className="btn-ghost"
                  pendingChildren="Disconnecting…"
                >
                  Disconnect account
                </FormSubmitButton>
              </form>
            </div>
            <p className="mt-2 text-sm text-stone-500">
              Disconnecting removes calendars supplied only by this account from
              Hearth. Nothing is deleted in Google.
            </p>
          </section>
        ))}
      </div>
      {selected && (
        <section className="card p-5">
          <h2 className="text-lg font-semibold">
            Calendars from {selected.email}
          </h2>
          {failed ? (
            <p role="alert">
              Could not load calendars. Reconnect the account or try again.
            </p>
          ) : (
            <form
              action={saveGoogleCalendarSelection}
              className="mt-4 grid gap-3"
            >
              <input type="hidden" name="connection_id" value={selected.id} />
              <p className="text-sm text-stone-600">
                Selected calendars and available Event details will be shared
                with every Household Member. Deselecting removes data supplied
                only through this connection.
              </p>
              {available.map((c) => (
                <label key={c.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="calendar"
                    value={c.id}
                    defaultChecked={
                      hasSelection
                        ? sources?.some((s) => s.google_calendar_id === c.id)
                        : Boolean(c.primary)
                    }
                  />
                  <span>{c.summaryOverride || c.summary}</span>
                </label>
              ))}
              {sources
                ?.filter(
                  (s) => !available.some((c) => c.id === s.google_calendar_id),
                )
                .map((s) => (
                  <p
                    key={s.google_calendar_id}
                    className="text-sm text-rose-700"
                  >
                    Previously selected calendar is unavailable:{" "}
                    {s.google_calendar_id}
                  </p>
                ))}
              <FormSubmitButton
                className="btn-primary justify-self-start"
                pendingChildren="Saving…"
              >
                Save selected calendars
              </FormSubmitButton>
            </form>
          )}
        </section>
      )}
      <Link href="/people" className="btn-ghost self-start">
        Back to Household people
      </Link>
    </>
  );
}
