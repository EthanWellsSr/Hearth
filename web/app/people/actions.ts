"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireHousehold } from "@/lib/auth";

export async function rotateInviteCode() {
  const { supabase } = await requireHousehold();
  const { error } = await supabase.rpc("rotate_household_invite");
  if (error) redirect("/people?error=" + encodeURIComponent("The Invite Code could not be rotated."));
  revalidatePath("/people");
  redirect("/people?rotated=1");
}

export async function removeMember(formData: FormData) {
  const membershipId = String(formData.get("membership_id") ?? "");
  if (!membershipId) return;

  const { supabase } = await requireHousehold();
  const { data: removed, error } = await supabase.rpc("remove_household_member", {
    target_membership_id: membershipId,
  });
  if (error || !removed) {
    redirect("/people?error=" + encodeURIComponent("That Member could not be removed."));
  }
  revalidatePath("/", "layout");
  redirect("/people?removed=1");
}
