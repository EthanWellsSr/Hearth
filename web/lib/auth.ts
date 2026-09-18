import { redirect } from "next/navigation";
import { invitePath, loginPath } from "./invite";
import { pendingInviteCode } from "./pending-invite";
import { createSupabaseServerClient } from "./supabase-server";

export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(loginPath({ invite: await pendingInviteCode() }));

  return { supabase, user };
}

export async function requireProfile() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, avatar_path, setup_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.setup_completed) {
    const invite = await pendingInviteCode();
    redirect(invite ? `/profile/setup?invite=${invite}` : "/profile/setup");
  }
  return { supabase, user, profile };
}

// Gate for per-user pages and actions. Returns a user-scoped Supabase client
// (RLS applies), the logged-in user, and their household_id. Bounces to /login
// if there's no session or no membership.
export async function requireHousehold() {
  const { supabase, user, profile } = await requireProfile();

  const { data: membership } = await supabase
    .from("memberships")
    .select("id, household_id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) {
    redirect(invitePath((await pendingInviteCode()) ?? "") ?? "/onboarding");
  }

  return {
    supabase,
    user,
    profile,
    membershipId: membership.id as string,
    membershipRole: membership.role as "owner" | "member",
    householdId: membership.household_id as string,
  };
}
