"use server";

import { revalidatePath } from "next/cache";
import { requireHousehold } from "@/lib/auth";

export async function addTodo(formData: FormData) {
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  const { supabase, householdId } = await requireHousehold();
  await supabase.from("todos").insert({ text, household_id: householdId });
  revalidatePath("/todos");
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
