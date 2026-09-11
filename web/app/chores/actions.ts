"use server";

import { revalidatePath } from "next/cache";
import { requireHousehold } from "@/lib/auth";
import {
  computeNextDue,
  firstDue,
  todayInChicago,
  type Recurrence,
} from "@/lib/recurrence";

export async function addChore(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const freq = String(formData.get("freq"));
  const { supabase, householdId } = await requireHousehold();

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
    next_due: firstDue(rule, todayInChicago()),
    household_id: householdId,
  });
  revalidatePath("/chores");
}

export async function completeChore(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase } = await requireHousehold();

  const { data: chore } = await supabase
    .from("chores")
    .select()
    .eq("id", id)
    .maybeSingle();
  if (!chore) return;

  const rule: Recurrence =
    chore.freq === "weekly"
      ? { freq: "weekly", weekday: chore.weekday }
      : { freq: "every_n_days", intervalDays: chore.interval_days };

  const next_due = computeNextDue(rule, chore.next_due, todayInChicago());
  await supabase.from("chores").update({ next_due }).eq("id", id);
  revalidatePath("/chores");
}

export async function deleteChore(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase } = await requireHousehold();
  await supabase.from("chores").delete().eq("id", id);
  revalidatePath("/chores");
}
