"use server";

import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { clearPendingInvite } from "@/lib/pending-invite";
import { isValidTimeZone } from "@/lib/calendar";

export async function createHousehold(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();
  const { supabase } = await requireProfile();
  if (!name) redirect("/onboarding?error=" + encodeURIComponent("Enter a household name."));
  if (!isValidTimeZone(timezone)) {
    redirect("/onboarding?error=" + encodeURIComponent("Choose a valid Household timezone."));
  }

  const { error } = await supabase.rpc("create_household_with_owner", {
    household_name: name,
    household_timezone: timezone,
  });
  if (error)
    redirect("/onboarding?error=" + encodeURIComponent("Could not create household."));
  await clearPendingInvite();
  redirect("/");
}

export async function joinHousehold(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const { supabase } = await requireProfile();
  if (!code) redirect("/onboarding?error=" + encodeURIComponent("Enter an invite code."));

  const { data: result, error } = await supabase.rpc("join_household_with_invite", {
    input_code: code,
  });
  if (error || result === "invalid_code") {
    redirect("/onboarding?error=" + encodeURIComponent("That Invite Code isn't valid."));
  }
  if (result === "throttled") {
    redirect("/onboarding?error=" + encodeURIComponent("Too many tries. Wait 15 minutes and try again."));
  }
  if (result !== "joined") {
    redirect("/onboarding?error=" + encodeURIComponent("You already belong to a Household."));
  }
  await clearPendingInvite();
  redirect("/");
}
