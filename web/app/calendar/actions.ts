"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireHousehold } from "@/lib/auth";
import {
  type LocalTimeChoice,
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

  const { supabase, householdId, membershipId } = await requireHousehold();
  const { data: household } = await supabase
    .from("households")
    .select("timezone")
    .eq("id", householdId)
    .single();
  if (!household?.timezone) {
    return { ok: false, state: { error: "Hearth could not determine the Household timezone." } } as const;
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
    household.timezone
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

  return {
    ok: true,
    supabase,
    householdId,
    membershipId,
    payload: {
      title,
      details: details || null,
      ...times.fields,
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
