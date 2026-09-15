"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { normalizeAvatarUpload } from "@/lib/avatar-image-server";
import { invitePath, normalizeInviteCode } from "@/lib/invite";
import { pendingInviteCode } from "@/lib/pending-invite";
import { supabase as admin } from "@/lib/supabase";
import {
  displayNameError,
  normalizeDisplayName,
} from "@/lib/profile";

export type ProfileActionState = { error: string | null };

export async function saveProfile(
  _previousState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const { supabase, user } = await requireUser();
  const displayName = normalizeDisplayName(formData.get("display_name"));
  const nameError = displayNameError(displayName);
  if (nameError) return { error: nameError };

  const { data: existing } = await supabase
    .from("user_profiles")
    .select("avatar_path")
    .eq("user_id", user.id)
    .maybeSingle();

  const removeAvatar = formData.get("remove_avatar") === "true";
  const avatar = formData.get("avatar");
  let avatarPath = removeAvatar ? null : existing?.avatar_path ?? null;

  if (avatar instanceof File && avatar.size > 0) {
    let normalizedAvatar: Buffer;
    try {
      normalizedAvatar = await normalizeAvatarUpload(avatar);
    } catch {
      return { error: "The edited Avatar could not be saved. Please choose the photo again." };
    }

    avatarPath = `${user.id}/avatar.webp`;
    const { error: uploadError } = await admin.storage
      .from("avatars")
      .upload(avatarPath, normalizedAvatar, {
        contentType: "image/webp",
        cacheControl: "3600",
        upsert: true,
      });
    if (uploadError) return { error: "Hearth could not upload that Avatar." };
  }

  const { error } = await supabase.from("user_profiles").upsert({
    user_id: user.id,
    display_name: displayName,
    avatar_path: avatarPath,
    setup_completed: true,
  });
  if (error) return { error: "Hearth could not save your profile." };

  if (removeAvatar && existing?.avatar_path) {
    await admin.storage.from("avatars").remove([existing.avatar_path]);
  }

  revalidatePath("/", "layout");
  if (formData.get("destination") === "profile") redirect("/profile?saved=1");

  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  const invitation =
    normalizeInviteCode(formData.get("invite")) ?? (await pendingInviteCode());
  redirect(membership ? "/" : invitePath(invitation ?? "") ?? "/onboarding");
}
