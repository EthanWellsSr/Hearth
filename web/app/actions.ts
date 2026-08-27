"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export async function addTodo(formData: FormData) {
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  await supabase.from("todos").insert({ text });
  revalidatePath("/todos");
}

export async function toggleTodo(formData: FormData) {
  const id = String(formData.get("id"));
  const done = formData.get("done") === "true";
  await supabase.from("todos").update({ done: !done }).eq("id", id);
  revalidatePath("/todos");
}
