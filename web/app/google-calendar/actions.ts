"use server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireHousehold } from "@/lib/auth";
import {
  requestHouseholdGoogleSync,
  selectGoogleCalendars,
  syncAuthorizedGoogleSource,
} from "@/lib/google-calendar-server";

export async function saveCalendarVisibility(data: FormData) {
  const { supabase, householdId, membershipId } = await requireHousehold();
  const calendarKey = String(data.get("calendar_key") || "");
  if (
    calendarKey !== "hearth" &&
    (!calendarKey.startsWith("google:") || calendarKey.length > 1100)
  )
    throw new Error("Invalid calendar.");
  const { error } = await supabase
    .from("calendar_visibility")
    .upsert(
      {
        household_id: householdId,
        membership_id: membershipId,
        calendar_key: calendarKey,
        visible: data.get("visible") === "true",
      },
      { onConflict: "membership_id,calendar_key" },
    );
  if (error) throw new Error("Could not save calendar visibility. Try again.");
  revalidatePath("/calendar");
  revalidatePath("/");
}
export async function syncCalendarNow(data: FormData) {
  await requestHouseholdGoogleSync(String(data.get("source_id") || ""));
  revalidatePath("/calendar");
  revalidatePath("/");
}
export async function expandCalendarRange(data: FormData) {
  const start = String(data.get("start") || ""),
    end = String(data.get("end") || "");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(end) ||
    start >= end
  )
    throw new Error("Invalid calendar range.");
  await requestHouseholdGoogleSync(String(data.get("source_id") || ""), {
    start,
    end,
  });
  revalidatePath("/calendar");
}
export async function saveGoogleCalendarSelection(data: FormData) {
  const id = String(data.get("connection_id") || "");
  await selectGoogleCalendars(id, data.getAll("calendar").map(String));
  const { supabase, householdId } = await requireHousehold();
  const { data: sources } = await supabase
    .from("google_calendar_sources")
    .select("id")
    .eq("household_id", householdId)
    .eq("connection_id", id);
  const sourceIds = (sources || []).map((source) => source.id as string);
  after(async () => {
    for (const sourceId of sourceIds) {
      await syncAuthorizedGoogleSource(householdId, sourceId).catch(() =>
        console.error("Initial Google Calendar synchronization failed"),
      );
    }
  });
  revalidatePath("/calendar");
  revalidatePath("/people/calendars");
  redirect("/calendar");
}
export async function disconnectGoogleAccount(data: FormData) {
  const { supabase, householdId, user } = await requireHousehold();
  const { error } = await supabase
    .from("google_connections")
    .delete()
    .eq("household_id", householdId)
    .eq("user_id", user.id)
    .eq("id", String(data.get("connection_id") || ""));
  if (error) throw new Error("Could not disconnect. Try again.");
  revalidatePath("/calendar");
  revalidatePath("/people/calendars");
  redirect("/people/calendars");
}
