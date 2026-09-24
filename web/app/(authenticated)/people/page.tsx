import { InviteCodeControls } from "@/components/InviteCodeControls";
import { MemberAvatar } from "@/components/MemberAvatar";
import { RemoveMemberButton } from "@/components/RemoveMemberButton";
import { requireHousehold } from "@/lib/auth";
import { DEFAULT_AVATAR_URL } from "@/lib/profile";
import { signedAvatarUrls } from "@/lib/avatar-server";
import {
  MemberHouseholdManagement,
  OwnerHouseholdManagement,
} from "@/components/HouseholdManagement";

type Membership = {
  id: string;
  user_id: string;
  role: "owner" | "member";
  created_at: string;
};

type UserProfile = {
  user_id: string;
  display_name: string;
  avatar_path: string | null;
};

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    removed?: string;
    rotated?: string;
    timezone?: string;
    transferred?: string;
  }>;
}) {
  const params = await searchParams;
  const { supabase, user, householdId } = await requireHousehold();
  const [{ data: household }, { data: membershipRows }] = await Promise.all([
    supabase.from("households").select("name, invite_code, timezone").eq("id", householdId).single(),
    supabase.from("memberships").select("id, user_id, role, created_at").eq("household_id", householdId),
  ]);

  const memberships = (membershipRows ?? []) as Membership[];
  const userIds = memberships.map((membership) => membership.user_id);
  const { data: profileRows } = userIds.length
    ? await supabase.from("user_profiles").select("user_id, display_name, avatar_path").in("user_id", userIds)
    : { data: [] };
  const profiles = (profileRows ?? []) as UserProfile[];
  const profileByUser = new Map(profiles.map((profile) => [profile.user_id, profile]));
  const avatarUrls = await signedAvatarUrls(profiles.map((profile) => profile.avatar_path));
  const currentMembership = memberships.find((membership) => membership.user_id === user.id);
  const isOwner = currentMembership?.role === "owner";
  const people = memberships
    .map((membership) => ({ membership, profile: profileByUser.get(membership.user_id) }))
    .filter((person): person is { membership: Membership; profile: UserProfile } => Boolean(person.profile))
    .sort((a, b) => {
      if (a.membership.role !== b.membership.role) return a.membership.role === "owner" ? -1 : 1;
      return a.profile.display_name.localeCompare(b.profile.display_name);
    });

  return (
    <>
      <header>
        <p className="page-kicker">The people at home</p>
        <h1 className="page-title">Household people</h1>
        <p className="page-description">See who shares this space and invite someone new.</p>
      </header>

      {params.error && <p className="status-message bg-red-500/10 text-red-700">{params.error}</p>}
      {params.removed && <p className="status-message bg-emerald-100/80 text-emerald-800">Member removed. A new Invite Code is ready.</p>}
      {params.rotated && <p className="status-message bg-emerald-100/80 text-emerald-800">Your new Invite Code is ready.</p>}
      {params.timezone && <p className="status-message bg-emerald-100/80 text-emerald-800">Household timezone updated.</p>}
      {params.transferred && <p className="status-message bg-emerald-100/80 text-emerald-800">Ownership transferred.</p>}

      <section className="grid gap-5 md:grid-cols-[1.15fr_0.85fr]">
        <div>
          <h2 className="mb-3 text-lg font-semibold text-stone-800">{people.length} {people.length === 1 ? "person" : "people"}</h2>
          <ul className="flex flex-col gap-3">
            {people.map(({ membership, profile }) => {
              const avatarUrl = profile.avatar_path
                ? avatarUrls.get(profile.avatar_path) || DEFAULT_AVATAR_URL
                : DEFAULT_AVATAR_URL;
              const isSelf = membership.user_id === user.id;
              return (
                <li key={membership.id} className="card flex items-center gap-3 p-4">
                  <MemberAvatar src={avatarUrl} name={profile.display_name} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-stone-800">
                      {profile.display_name}{isSelf ? " · You" : ""}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                      {membership.role === "owner" ? "Owner" : "Member"}
                    </p>
                  </div>
                  {isOwner && !isSelf && membership.role !== "owner" && (
                    <RemoveMemberButton membershipId={membership.id} name={profile.display_name} />
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {household && (
          <aside className="card botanical-card self-start p-5 sm:p-6">
            <p className="page-kicker">Invite someone</p>
            <h2 className="text-lg font-semibold text-stone-800">Grow the {household.name} Household</h2>
            <p className="mb-5 mt-1 text-sm leading-6 text-stone-500">
              Share the invitation link with someone you trust. The Invite Code remains available as a backup.
            </p>
            <InviteCodeControls code={household.invite_code} householdName={household.name} owner={isOwner} />
          </aside>
        )}
      </section>

      {household && (
        isOwner ? (
          <OwnerHouseholdManagement
            currentTimeZone={household.timezone || "America/Chicago"}
            transferOptions={people
              .filter(({ membership }) => membership.user_id !== user.id && membership.role === "member")
              .map(({ membership, profile }) => ({
                membershipId: membership.id,
                name: profile.display_name,
              }))}
          />
        ) : (
          <MemberHouseholdManagement />
        )
      )}
    </>
  );
}
