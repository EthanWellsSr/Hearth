"use server";

import { revalidatePath } from "next/cache";
import { requireHousehold } from "@/lib/auth";
import {
  computeNextDue,
  firstDue,
  type Recurrence,
} from "@/lib/recurrence";
import { todayInTimeZone } from "@/lib/calendar";

export async function addChore(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const freq = String(formData.get("freq"));
  const assigneeId = String(formData.get("assignee_id") ?? "");
  const { supabase, householdId, householdTimeZone } = await requireHousehold();
  const today = todayInTimeZone(householdTimeZone);
  const safeAssigneeId = await householdAssigneeId(supabase, householdId, assigneeId);

  let rule: Recurrence;
  let cols: { interval_days: number | null; weekday: number | null };
  if (freq === "weekly") {
    const weekday = Number(formData.get("weekday"));
    rule = { freq: "weekly", weekday };
    cols = { interval_days: null, weekday };
  } else {
    const intervalDays = Math.max(1, Number(formData.get("interval_days")) || 1);
    rule = { freq: "every_n_days", intervalDays };
    cols = { interval_days: intervalDays, weekday: null };
  }

  await supabase.from("chores").insert({
    title,
    freq: rule.freq,
    ...cols,
    next_due: firstDue(rule, today),
    household_id: householdId,
    assignee_id: safeAssigneeId,
  });
  revalidatePath("/chores");
  revalidatePath("/calendar");
}

export async function reassignChore(formData: FormData) {
  const id = String(formData.get("id"));
  const assigneeId = String(formData.get("assignee_id") ?? "");
  const { supabase, householdId } = await requireHousehold();
  const safeAssigneeId = await householdAssigneeId(supabase, householdId, assigneeId);
  const { data, error } = await supabase
    .from("chores")
    .update({ assignee_id: safeAssigneeId })
    .eq("id", id)
    .eq("household_id", householdId)
    .select("id");
  // RLS turns an unauthorized update into zero rows rather than an error.
  if (error || !data?.length) throw new Error("The Chore assignee could not be saved.");
  revalidatePath("/chores");
  revalidatePath("/calendar");
}

async function householdAssigneeId(
  supabase: Awaited<ReturnType<typeof requireHousehold>>["supabase"],
  householdId: string,
  assigneeId: string
) {
  if (!assigneeId) return null;
  const { data } = await supabase
    .from("memberships")
    .select("id")
    .eq("id", assigneeId)
    .eq("household_id", householdId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function completeChore(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase, householdId, householdTimeZone } = await requireHousehold();
  const { data: chore } = await supabase
    .from("chores")
    .select()
    .eq("id", id)
    .eq("household_id", householdId)
    .maybeSingle();
  if (!chore) return;

  const rule: Recurrence =
    chore.freq === "weekly"
      ? { freq: "weekly", weekday: chore.weekday }
      : { freq: "every_n_days", intervalDays: chore.interval_days };

  const today = todayInTimeZone(householdTimeZone);
  const next_due = computeNextDue(rule, chore.next_due, today);
  await supabase
    .from("chores")
    .update({ next_due })
    .eq("id", id)
    .eq("household_id", householdId)
    .eq("next_due", chore.next_due);
  revalidatePath("/chores");
  revalidatePath("/calendar");
}

export async function deleteChore(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase, householdId } = await requireHousehold();
  await supabase.from("chores").delete().eq("id", id).eq("household_id", householdId);
  revalidatePath("/chores");
  revalidatePath("/calendar");
}
