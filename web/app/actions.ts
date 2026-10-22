"use server";

import { revalidatePath } from "next/cache";
import { requireHousehold } from "@/lib/auth";
import { todoFields } from "@/lib/todos";

export async function addTodo(formData: FormData) {
  const fields = todoFields(formData);
  const assigneeId = String(formData.get("assignee_id") ?? "");
  const { supabase, householdId } = await requireHousehold();
  const safeAssigneeId = await householdAssigneeId(
    supabase,
    householdId,
    assigneeId
  );
  const { error } = await supabase.from("todos").insert({
    ...fields,
    household_id: householdId,
    assignee_id: safeAssigneeId,
  });
  if (error) throw new Error("The To-do could not be added.");
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
    .eq("household_id", householdId)
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
  const { data, error } = await supabase
    .from("memberships")
    .select("id")
    .eq("id", assigneeId)
    .eq("household_id", householdId)
    .maybeSingle();
  if (error || !data) throw new Error("Choose a Member of this Household.");
  return data.id;
}

export async function toggleTodo(formData: FormData) {
  const id = String(formData.get("id"));
  const done = formData.get("done") === "true";
  const { supabase, householdId } = await requireHousehold();
  const { data, error } = await supabase.from("todos").update({ done: !done }).eq("id", id).eq("household_id", householdId).select("id");
  if (error || !data?.length) throw new Error("The To-do could not be updated.");
  revalidatePath("/todos");
}

export async function deleteTodo(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase, householdId } = await requireHousehold();
  const { data, error } = await supabase.from("todos").delete().eq("id", id).eq("household_id", householdId).select("id");
  if (error || !data?.length) throw new Error("The To-do could not be deleted.");
  revalidatePath("/todos");
}

export async function editTodo(formData: FormData) {
  const fields = todoFields(formData);
  const id = String(formData.get("id") ?? "");
  const { supabase, householdId } = await requireHousehold();
  const assigneeId = await householdAssigneeId(supabase, householdId, String(formData.get("assignee_id") ?? ""));
  const { data, error } = await supabase.from("todos")
    .update({ ...fields, assignee_id: assigneeId })
    .eq("id", id).eq("household_id", householdId).select("id");
  if (error || !data?.length) throw new Error("The To-do could not be saved.");
  revalidatePath("/todos");
}

export async function reorderTodo(formData: FormData) {
  const { supabase, householdId } = await requireHousehold();
  const { error } = await supabase.rpc("move_todo", {
    p_household_id: householdId,
    p_id: String(formData.get("id") ?? ""),
    p_target_id: String(formData.get("target_id") ?? ""),
    p_after: formData.get("after") === "true",
  });
  if (error) throw new Error("The order could not be saved. Refresh and try again.");
  revalidatePath("/todos");
}
