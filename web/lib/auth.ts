import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase-server";

// Gate for per-user pages and actions. Returns a user-scoped Supabase client
// (RLS applies), the logged-in user, and their household_id. Bounces to /login
// if there's no session or no membership.
export async function requireHousehold() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("memberships")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) redirect("/login?error=No+household+for+this+account");

  return { supabase, user, householdId: membership.household_id as string };
}
