import { redirect } from "next/navigation";
import { cache } from "react";
import { invitePath, loginPath } from "./invite";
import { pendingInviteCode } from "./pending-invite";
import { createSupabaseServerClient } from "./supabase-server";

export const requireUser = cache(async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) {
    redirect(loginPath({ invite: await pendingInviteCode() }));
  }
  const user = {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : undefined,
  };

  return { supabase, user };
});

export const requireProfile = cache(async function requireProfile() {
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
});

// Gate for per-user pages and actions. Returns a user-scoped Supabase client
// (RLS applies), the logged-in user, and their household_id. Bounces to /login
// if there's no session or no membership.
export const requireHousehold = cache(async function requireHousehold() {
  const { supabase, user } = await requireUser();
  const profilePromise = requireProfile();
  const membershipPromise = supabase
    .from("memberships")
    .select("id, household_id, role, household:households(timezone)")
    .eq("user_id", user.id)
    .maybeSingle();
  const [{ profile }, { data: membership }] = await Promise.all([
    profilePromise,
    membershipPromise,
  ]);
  if (!membership) {
    redirect(invitePath((await pendingInviteCode()) ?? "") ?? "/onboarding");
  }
  const household = Array.isArray(membership.household)
    ? membership.household[0]
    : membership.household;
  if (!household?.timezone) {
    throw new Error("Membership is missing its Household timezone.");
  }

  return {
    supabase,
    user,
    profile,
    membershipId: membership.id as string,
    membershipRole: membership.role as "owner" | "member",
    householdId: membership.household_id as string,
    householdTimeZone: household.timezone as string,
  };
});
