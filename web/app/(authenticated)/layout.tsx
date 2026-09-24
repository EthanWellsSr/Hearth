import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import { requireHousehold } from "@/lib/auth";
import { signedAvatarUrl } from "@/lib/avatar-server";

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireHousehold();
  const avatarUrl = await signedAvatarUrl(profile.avatar_path);

  return (
    <main className="app-shell">
      <AppHeader profile={profile} avatarUrl={avatarUrl} />
      {children}
    </main>
  );
}
