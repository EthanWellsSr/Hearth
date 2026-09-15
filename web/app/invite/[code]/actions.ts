"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { invitePath, normalizeInviteCode } from "@/lib/invite";
import { clearPendingInvite } from "@/lib/pending-invite";

function invitationErrorPath(code: string, message: string) {
  const path = invitePath(code) ?? "/invite/invalid";
  return `${path}?error=${encodeURIComponent(message)}`;
}

export async function joinInvitation(formData: FormData) {
  const code = normalizeInviteCode(formData.get("code"));
  if (!code) redirect("/invite/invalid");

  const { supabase } = await requireProfile();
  const { data: result, error } = await supabase.rpc("join_household_with_invite", {
    input_code: code,
  });

  if (error || result === "invalid_code") {
    redirect(
      invitationErrorPath(
        code,
        "This invitation is no longer available. Ask a Member for a new link."
      )
    );
  }
  if (result === "throttled") {
    redirect(
      invitationErrorPath(code, "Too many tries. Wait 15 minutes and try again.")
    );
  }
  if (result === "profile_required") {
    redirect(`/profile/setup?invite=${code}`);
  }
  if (result !== "joined") {
    redirect(
      invitationErrorPath(code, "This sign-in already belongs to a Household.")
    );
  }

  await clearPendingInvite();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function dismissInvitation() {
  await clearPendingInvite();
  redirect("/");
}
