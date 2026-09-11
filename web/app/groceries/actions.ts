"use server";

import { revalidatePath } from "next/cache";
import { requireHousehold } from "@/lib/auth";

export async function addGroceryItem(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const { supabase, householdId } = await requireHousehold();
  await supabase.from("grocery_items").insert({ name, household_id: householdId });
  revalidatePath("/groceries");
}

export async function toggleGroceryItem(formData: FormData) {
  const id = String(formData.get("id"));
  const bought = formData.get("bought") === "true";
  const { supabase } = await requireHousehold();
  await supabase.from("grocery_items").update({ bought: !bought }).eq("id", id);
  revalidatePath("/groceries");
}

export async function deleteGroceryItem(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase } = await requireHousehold();
  await supabase.from("grocery_items").delete().eq("id", id);
  revalidatePath("/groceries");
}

export async function clearBought() {
  const { supabase } = await requireHousehold();
  await supabase.from("grocery_items").delete().eq("bought", true);
  revalidatePath("/groceries");
}
