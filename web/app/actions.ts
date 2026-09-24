"use server";

import { revalidatePath } from "next/cache";
import { requireHousehold } from "@/lib/auth";

export async function addTodo(formData: FormData) {
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  const assigneeId = String(formData.get("assignee_id") ?? "");
  const { supabase, householdId } = await requireHousehold();
  const safeAssigneeId = await householdAssigneeId(
    supabase,
    householdId,
    assigneeId
  );
  await supabase.from("todos").insert({
    text,
    household_id: householdId,
    assignee_id: safeAssigneeId,
  });
  revalidatePath("/todos");
}

export async function reassignTodo(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const assigneeId = String(formData.get("assignee_id") ?? "");
  const { supabase, householdId } = await requireHousehold();
  const safeAssigneeId = await householdAssigneeId(
    supabase,
    householdId,
    assigneeId
  );
  const { data, error } = await supabase
    .from("todos")
    .update({ assignee_id: safeAssigneeId })
    .eq("id", id)
    .select("id");
  // RLS turns an unauthorized update into zero rows rather than an error.
  if (error || !data?.length) throw new Error("The To-do assignee could not be saved.");
  revalidatePath("/todos");
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

export async function toggleTodo(formData: FormData) {
  const id = String(formData.get("id"));
  const done = formData.get("done") === "true";
  const { supabase } = await requireHousehold();
  await supabase.from("todos").update({ done: !done }).eq("id", id);
  revalidatePath("/todos");
}

export async function deleteTodo(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase } = await requireHousehold();
  await supabase.from("todos").delete().eq("id", id);
  revalidatePath("/todos");
}
