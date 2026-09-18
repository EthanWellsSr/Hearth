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

export async function setHouseholdTimezone(formData: FormData) {
  const timezone = String(formData.get("timezone") ?? "").trim();
  const { supabase } = await requireHousehold();
  const { error } = await supabase.rpc("set_household_timezone", {
    input_timezone: timezone,
  });
  if (error) {
    redirect("/people?error=" + encodeURIComponent("The Household timezone could not be changed."));
  }
  revalidatePath("/", "layout");
  redirect("/people?timezone=1");
}

export async function transferOwnership(formData: FormData) {
  const membershipId = String(formData.get("membership_id") ?? "");
  if (!membershipId) return;
  const { supabase } = await requireHousehold();
  const { data: transferred, error } = await supabase.rpc(
    "transfer_household_ownership",
    { target_membership_id: membershipId }
  );
  if (error || !transferred) {
    redirect("/people?error=" + encodeURIComponent("Ownership could not be transferred."));
  }
  revalidatePath("/", "layout");
  redirect("/people?transferred=1");
}

export async function leaveHousehold() {
  const { supabase } = await requireHousehold();
  const { data: left, error } = await supabase.rpc("leave_household");
  if (error || !left) {
    redirect("/people?error=" + encodeURIComponent("The Household could not be left."));
  }
  revalidatePath("/", "layout");
  redirect("/onboarding?left=1");
}
