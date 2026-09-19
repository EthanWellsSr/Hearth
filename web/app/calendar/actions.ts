"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireHousehold } from "@/lib/auth";
import {
  calendarEventFromRow,
  type EventRow,
  type LocalTimeChoice,
  occurrenceKeyDate,
  remainingRecurrenceCount,
  validateEventTimes,
} from "@/lib/calendar";

export type EventFormState = {
  error: string | null;
  ambiguities?: Array<{
    field: "start" | "end";
    choices: LocalTimeChoice[];
  }>;
};

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function disambiguation(formData: FormData, key: string) {
  const choice = value(formData, key);
  return choice === "earlier" || choice === "later" ? choice : undefined;
}

async function eventPayload(formData: FormData) {
  const title = value(formData, "title");
  const details = value(formData, "details");
  if (!title || title.length > 100) {
    return { ok: false, state: { error: "Enter an Event title between 1 and 100 characters." } } as const;
  }
  if (details.length > 2000) {
    return { ok: false, state: { error: "Event details must be 2,000 characters or fewer." } } as const;
  }

  const { supabase, householdId, membershipId, householdTimeZone } = await requireHousehold();

  const times = validateEventTimes(
    {
      allDay: formData.get("all_day") === "true",
      startDate: value(formData, "start_date"),
      endDate: value(formData, "end_date") || undefined,
      startTime: value(formData, "start_time") || undefined,
      endTime: value(formData, "end_time") || undefined,
      startDisambiguation: disambiguation(formData, "start_disambiguation"),
      endDisambiguation: disambiguation(formData, "end_disambiguation"),
    },
    householdTimeZone
  );
  if (times.status === "invalid") {
    return { ok: false, state: { error: times.message } } as const;
  }
  if (times.status === "ambiguous") {
    return {
      ok: false,
      state: {
        error: "That time happens twice because the clocks change. Choose which one you mean.",
        ambiguities: times.fields,
      },
    } as const;
  }

  const frequencyValue = value(formData, "recurrence_frequency");
  const recurrenceFrequency = ["daily", "weekly", "monthly", "yearly"].includes(
    frequencyValue
  )
    ? frequencyValue
    : null;
  let recurrenceInterval: number | null = null;
  let recurrenceWeekdays: number[] | null = null;
  let recurrenceEndDate: string | null = null;
  let recurrenceCount: number | null = null;
  let recurrenceTimeZone: string | null = null;
  if (recurrenceFrequency) {
    recurrenceInterval = Number(value(formData, "recurrence_interval"));
    if (!Number.isInteger(recurrenceInterval) || recurrenceInterval < 1 || recurrenceInterval > 99) {
      return { ok: false, state: { error: "Choose a repeat interval between 1 and 99." } } as const;
    }
    if (recurrenceFrequency === "weekly") {
      recurrenceWeekdays = Array.from(
        new Set(
          formData
            .getAll("recurrence_weekday")
            .map(Number)
            .filter((weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6)
        )
      ).sort();
      if (!recurrenceWeekdays.length) {
        return { ok: false, state: { error: "Choose at least one weekday." } } as const;
      }
    }
    const endMode = value(formData, "recurrence_end");
    if (endMode === "date") {
      recurrenceEndDate = value(formData, "recurrence_end_date");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(recurrenceEndDate) || recurrenceEndDate < value(formData, "start_date")) {
        return { ok: false, state: { error: "The recurrence end date must be on or after the Event starts." } } as const;
      }
    } else if (endMode === "count") {
      recurrenceCount = Number(value(formData, "recurrence_count"));
      if (!Number.isInteger(recurrenceCount) || recurrenceCount < 1 || recurrenceCount > 999) {
        return { ok: false, state: { error: "Choose between 1 and 999 occurrences." } } as const;
      }
    }
    recurrenceTimeZone = value(formData, "recurrence_timezone") || householdTimeZone;
  }

  return {
    ok: true,
    supabase,
    householdId,
    membershipId,
    payload: {
      title,
      details: details || null,
      ...times.fields,
      recurrence_frequency: recurrenceFrequency,
      recurrence_interval: recurrenceInterval,
      recurrence_weekdays: recurrenceWeekdays,
      recurrence_end_date: recurrenceEndDate,
      recurrence_count: recurrenceCount,
      recurrence_timezone: recurrenceTimeZone,
    },
  } as const;
}

export async function createEvent(
  _previousState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const parsed = await eventPayload(formData);
  if (!parsed.ok) return parsed.state;

  const { data, error } = await parsed.supabase
    .from("events")
    .insert({
      ...parsed.payload,
      household_id: parsed.householdId,
      created_by_membership_id: parsed.membershipId,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Hearth could not add that Event." };

  revalidatePath("/calendar");
  redirect(`/calendar/${data.id}`);
}

export async function updateEvent(
  _previousState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const id = value(formData, "id");
  const version = Number(value(formData, "version"));
  if (!id || !Number.isInteger(version) || version < 1) {
    return { error: "This Event could not be identified." };
  }

  const parsed = await eventPayload(formData);
  if (!parsed.ok) return parsed.state;

  const { data, error } = await parsed.supabase
    .from("events")
    .update(parsed.payload)
    .eq("id", id)
    .eq("version", version)
    .select("id")
    .maybeSingle();
  if (error) return { error: "Hearth could not save those Event changes." };
  if (!data) {
    return {
      error:
        "Someone changed this Event while you were editing. Your entries are still here—open the latest Event in another tab to review before retrying.",
    };
  }

  revalidatePath("/calendar");
  revalidatePath(`/calendar/${id}`);
  redirect(`/calendar/${id}`);
}

export async function deleteEvent(formData: FormData) {
  const id = value(formData, "id");
  if (!id) return;
  const { supabase } = await requireHousehold();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) redirect(`/calendar/${id}?error=${encodeURIComponent("That Event could not be deleted.")}`);
  revalidatePath("/calendar");
  redirect("/calendar?deleted=1");
}

// Times for a single occurrence are always interpreted in the series' fixed
// recurrence timezone, not the current Household timezone.
async function occurrencePayload(formData: FormData, timeZone: string) {
  const title = value(formData, "title");
  const details = value(formData, "details");
  if (!title || title.length > 100) {
    return { ok: false, state: { error: "Enter an Event title between 1 and 100 characters." } } as const;
  }
  if (details.length > 2000) {
    return { ok: false, state: { error: "Event details must be 2,000 characters or fewer." } } as const;
  }

  const times = validateEventTimes(
    {
      allDay: formData.get("all_day") === "true",
      startDate: value(formData, "start_date"),
      endDate: value(formData, "end_date") || undefined,
      startTime: value(formData, "start_time") || undefined,
      endTime: value(formData, "end_time") || undefined,
      startDisambiguation: disambiguation(formData, "start_disambiguation"),
      endDisambiguation: disambiguation(formData, "end_disambiguation"),
    },
    timeZone
  );
  if (times.status === "invalid") {
    return { ok: false, state: { error: times.message } } as const;
  }
  if (times.status === "ambiguous") {
    return {
      ok: false,
      state: {
        error: "That time happens twice because the clocks change. Choose which one you mean.",
        ambiguities: times.fields,
      },
    } as const;
  }

  return { ok: true, title, details: details || null, fields: times.fields } as const;
}

// Change one occurrence ("occurrence") or split the series so the change applies
// to this occurrence and every later one ("future"). Both paths run in a single
// transactional Postgres function with optimistic concurrency.
export async function saveOccurrence(
  _previousState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const seriesId = value(formData, "series_id");
  const occurrenceKey = value(formData, "occurrence");
  const scope = value(formData, "scope");
  const seriesVersion = Number(value(formData, "series_version"));
  const exceptionVersionRaw = value(formData, "exception_version");
  const exceptionVersion = exceptionVersionRaw ? Number(exceptionVersionRaw) : null;
  if (!seriesId || !occurrenceKey || !Number.isInteger(seriesVersion) || seriesVersion < 1) {
    return { error: "This occurrence could not be identified." };
  }

  const { supabase } = await requireHousehold();
  const { data: row } = await supabase
    .from("events")
    .select("*")
    .eq("id", seriesId)
    .maybeSingle();
  const series = row ? calendarEventFromRow(row as EventRow) : null;
  if (!series?.recurrenceFrequency || !series.recurrenceTimeZone) {
    return { error: "This recurring Event is no longer available." };
  }

  const parsed = await occurrencePayload(formData, series.recurrenceTimeZone);
  if (!parsed.ok) return parsed.state;

  if (scope === "future") {
    const splitDate = occurrenceKeyDate(occurrenceKey);
    const { error } = await supabase.rpc("split_event_series", {
      p_series_id: seriesId,
      p_expected_series_version: seriesVersion,
      p_split_date: splitDate,
      p_title: parsed.title,
      p_details: parsed.details,
      p_all_day: parsed.fields.all_day,
      p_start_date: parsed.fields.start_date,
      p_end_date: parsed.fields.end_date,
      p_starts_at: parsed.fields.starts_at,
      p_ends_at: parsed.fields.ends_at,
      p_recurrence_end_date: series.recurrenceEndDate,
      p_recurrence_count: remainingRecurrenceCount(series, splitDate),
    });
    if (error) return { error: mutationErrorMessage(error.message) };
    revalidatePath("/calendar");
    revalidatePath(`/calendar/${seriesId}`);
    redirect("/calendar");
  }

  const { error } = await supabase.rpc("upsert_event_occurrence_exception", {
    p_series_id: seriesId,
    p_occurrence_key: occurrenceKey,
    p_expected_series_version: seriesVersion,
    p_expected_exception_version: exceptionVersion,
    p_cancelled: false,
    p_title: parsed.title,
    p_details: parsed.details,
    p_all_day: parsed.fields.all_day,
    p_start_date: parsed.fields.start_date,
    p_end_date: parsed.fields.end_date,
    p_starts_at: parsed.fields.starts_at,
    p_ends_at: parsed.fields.ends_at,
  });
  if (error) return { error: mutationErrorMessage(error.message) };
  revalidatePath("/calendar");
  revalidatePath(`/calendar/${seriesId}`);
  redirect(`/calendar/${seriesId}?occurrence=${encodeURIComponent(occurrenceKey)}`);
}

// Remove one occurrence, this occurrence and all later ones, or the whole series.
export async function deleteOccurrence(formData: FormData) {
  const seriesId = value(formData, "series_id");
  const occurrenceKey = value(formData, "occurrence");
  const scope = value(formData, "scope");
  const seriesVersion = Number(value(formData, "series_version"));
  const exceptionVersionRaw = value(formData, "exception_version");
  const exceptionVersion = exceptionVersionRaw ? Number(exceptionVersionRaw) : null;
  if (!seriesId) return;
  const { supabase } = await requireHousehold();
  const back = `/calendar/${seriesId}?occurrence=${encodeURIComponent(occurrenceKey)}`;

  if (scope === "series") {
    const { error } = await supabase.from("events").delete().eq("id", seriesId);
    if (error) redirect(`${back}&error=${encodeURIComponent("That series could not be deleted.")}`);
    revalidatePath("/calendar");
    redirect("/calendar?deleted=1");
  }

  if (scope === "future") {
    const { error } = await supabase.rpc("truncate_event_series", {
      p_series_id: seriesId,
      p_expected_series_version: seriesVersion,
      p_split_date: occurrenceKeyDate(occurrenceKey),
    });
    if (error) redirect(`${back}&error=${encodeURIComponent(mutationErrorMessage(error.message))}`);
    revalidatePath("/calendar");
    redirect("/calendar?deleted=1");
  }

  const { error } = await supabase.rpc("upsert_event_occurrence_exception", {
    p_series_id: seriesId,
    p_occurrence_key: occurrenceKey,
    p_expected_series_version: seriesVersion,
    p_expected_exception_version: exceptionVersion,
    p_cancelled: true,
    p_title: null,
    p_details: null,
    p_all_day: null,
    p_start_date: null,
    p_end_date: null,
    p_starts_at: null,
    p_ends_at: null,
  });
  if (error) redirect(`${back}&error=${encodeURIComponent(mutationErrorMessage(error.message))}`);
  revalidatePath("/calendar");
  revalidatePath(`/calendar/${seriesId}`);
  redirect("/calendar?deleted=1");
}

function mutationErrorMessage(message: string | null | undefined) {
  // A bounded lock wait timing out means another device is mid-edit right now.
  if (message && /lock timeout/i.test(message)) {
    return "Someone is editing this Event right now. Please try again in a moment.";
  }
  // The RPCs raise their own Member-facing messages for stale or missing rows.
  if (message && /editing|available/.test(message)) return message;
  return "Hearth could not save that change. Please reopen the Event and try again.";
}
