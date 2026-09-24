import { ProfileEditor } from "@/components/ProfileEditor";
import { requireHousehold } from "@/lib/auth";
import { signedAvatarUrl } from "@/lib/avatar-server";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const params = await searchParams;
  const { profile } = await requireHousehold();
  const avatarUrl = await signedAvatarUrl(profile.avatar_path);

  return (
    <>
      <header>
        <p className="page-kicker">Your place at home</p>
        <h1 className="page-title">My profile</h1>
        <p className="page-description">Update the name and Avatar your Household sees.</p>
      </header>
      {params.saved && (
        <p className="status-message bg-emerald-100/80 text-emerald-800">Your profile is saved.</p>
      )}
      <ProfileEditor initialName={profile.display_name} initialAvatarUrl={avatarUrl} />
    </>
  );
}
