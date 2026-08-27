"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export async function addGroceryItem(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await supabase.from("grocery_items").insert({ name });
  revalidatePath("/groceries");
}

export async function toggleGroceryItem(formData: FormData) {
  const id = String(formData.get("id"));
  const bought = formData.get("bought") === "true";
  await supabase.from("grocery_items").update({ bought: !bought }).eq("id", id);
  revalidatePath("/groceries");
}

export async function deleteGroceryItem(formData: FormData) {
  const id = String(formData.get("id"));
  await supabase.from("grocery_items").delete().eq("id", id);
  revalidatePath("/groceries");
}

export async function clearBought() {
  await supabase.from("grocery_items").delete().eq("bought", true);
  revalidatePath("/groceries");
}
