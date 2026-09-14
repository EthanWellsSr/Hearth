import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { requireProfile } from "@/lib/auth";
import { signedAvatarUrl } from "@/lib/avatar-server";
import { MemberAvatar } from "./MemberAvatar";

export async function AppHeader() {
  const { profile } = await requireProfile();
  const avatarUrl = await signedAvatarUrl(profile.avatar_path);

  return (
    <header className="card relative z-40 flex items-center justify-between overflow-visible rounded-full px-3 py-2.5 sm:px-4">
      <Link
        href="/"
        className="group flex items-center gap-2.5 text-stone-800"
      >
        <span className="logo-frame h-9 w-9 transition-transform duration-300 group-hover:rotate-[-3deg]">
          <Image src="/logo-meadow.png" alt="" width={36} height={36} priority />
        </span>
        <span className="text-lg font-semibold tracking-[-0.035em]">Hearth</span>
      </Link>
      <details className="avatar-menu relative">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full py-0.5 pl-2 text-sm font-semibold text-stone-600 outline-none transition hover:bg-emerald-50 focus-visible:ring-4 focus-visible:ring-emerald-100">
          <span className="hidden max-w-36 truncate sm:block">{profile.display_name}</span>
          <MemberAvatar src={avatarUrl} name={profile.display_name} size={38} />
        </summary>
        <nav className="absolute right-0 top-[calc(100%+0.65rem)] z-30 w-52 rounded-2xl border border-emerald-100 bg-[#fffdf8] p-2 shadow-xl">
          <Link href="/profile" className="block rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-emerald-50">
            My profile
          </Link>
          <Link href="/people" className="block rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-emerald-50">
            Household people
          </Link>
          <div className="my-1 h-px bg-emerald-100" />
          <form action={signOut}>
            <button type="submit" className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-stone-600 hover:bg-emerald-50">
              Sign out
            </button>
          </form>
        </nav>
      </details>
    </header>
  );
}
