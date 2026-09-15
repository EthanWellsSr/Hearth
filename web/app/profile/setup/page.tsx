import Image from "next/image";
import { redirect } from "next/navigation";
import { ProfileEditor } from "@/components/ProfileEditor";
import { MeadowSprig } from "@/components/MeadowSprig";
import { requireUser } from "@/lib/auth";
import { signedAvatarUrl } from "@/lib/avatar-server";
import { invitePath, normalizeInviteCode } from "@/lib/invite";
import { pendingInviteCode } from "@/lib/pending-invite";
import { defaultDisplayName } from "@/lib/profile";

export default async function ProfileSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const params = await searchParams;
  const invite = normalizeInviteCode(params.invite) ?? (await pendingInviteCode());
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, avatar_path, setup_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.setup_completed) {
    const { data: membership } = await supabase
      .from("memberships")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    redirect(membership ? "/" : invitePath(invite ?? "") ?? "/onboarding");
  }

  const avatarUrl = await signedAvatarUrl(profile?.avatar_path);

  return (
    <main className="app-shell max-w-2xl">
      <div className="flex items-center gap-3 text-stone-800">
        <span className="logo-frame h-11 w-11">
          <Image src="/logo-meadow.png" alt="" width={44} height={44} priority />
        </span>
        <span className="text-xl font-semibold tracking-[-0.035em]">Hearth</span>
      </div>
      <header className="relative overflow-hidden py-3 sm:py-6">
        <p className="page-kicker">First, make it yours</p>
        <h1 className="page-title">How should your Household know you?</h1>
        <p className="page-description">Choose the name and photo people at home will see.</p>
        <MeadowSprig className="absolute -right-4 top-0 hidden w-44 text-emerald-500/30 sm:block" />
      </header>
      <ProfileEditor
        initialName={profile?.display_name || defaultDisplayName(user.email)}
        initialAvatarUrl={avatarUrl}
        inviteCode={invite}
        setup
      />
    </main>
  );
}
