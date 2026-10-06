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
  const { data: context, error } = await supabase.rpc("get_my_household_context");

  if (error?.code === "PGRST202") {
    return requireHouseholdLegacy(supabase, user);
  }
  if (error) throw error;

  const row = context as HouseholdContextRow | null;
  if (!row?.setup_completed) {
    const invite = await pendingInviteCode();
    redirect(invite ? `/profile/setup?invite=${invite}` : "/profile/setup");
  }
  if (!row.membership_id || !row.household_id || !row.membership_role || !row.household_timezone) {
    redirect(invitePath((await pendingInviteCode()) ?? "") ?? "/onboarding");
  }

  return {
    supabase,
    user,
    profile: {
      user_id: row.user_id,
      display_name: row.display_name,
      avatar_path: row.avatar_path,
      setup_completed: row.setup_completed,
    },
    membershipId: row.membership_id,
    membershipRole: row.membership_role,
    householdId: row.household_id,
    householdTimeZone: row.household_timezone,
  };
});

type HouseholdContextRow = {
  user_id: string;
  display_name: string;
  avatar_path: string | null;
  setup_completed: boolean;
  membership_id: string | null;
  household_id: string | null;
  membership_role: "owner" | "member" | null;
  household_timezone: string | null;
};

async function requireHouseholdLegacy(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  user: { id: string; email?: string }
) {
  const profilePromise = requireProfile();
  // tenant-scope: the caller's own Membership, looked up before the Household is known.
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
}
