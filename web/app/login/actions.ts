"use server";

import { redirect } from "next/navigation";
import { invitePath, loginPath, normalizeInviteCode } from "@/lib/invite";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const invite = normalizeInviteCode(formData.get("invite"));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(loginPath({ invite, error: error.message }));
  redirect(invitePath(invite ?? "") ?? "/");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const invite = normalizeInviteCode(formData.get("invite"));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) redirect(loginPath({ invite, error: error.message }));
  redirect(
    loginPath({
      invite,
      message:
        "Check your email for a confirmation link, then sign in. Your invitation will be waiting.",
    })
  );
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
