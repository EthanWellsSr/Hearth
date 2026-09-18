import Link from "next/link";
import { requireHousehold } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { MemberAvatar } from "@/components/MemberAvatar";
import { MeadowSprig } from "@/components/MeadowSprig";
import { signedAvatarUrls } from "@/lib/avatar-server";
import { DEFAULT_AVATAR_URL } from "@/lib/profile";

const FEATURES = [
  {
    href: "/calendar",
    title: "Calendar",
    desc: "See what is happening around your home.",
    accent: "bg-[#e3f0f2] text-[#557f88]",
    icon: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4m8-4v4M4 10h16" />
      </>
    ),
  },
  {
    href: "/todos",
    title: "To-dos",
    desc: "Keep the little things from getting lost.",
    accent: "bg-[#dfeeda] text-emerald-700",
    icon: (
      <path d="M4 6h16M4 12h16M4 18h10" />
    ),
  },
  {
    href: "/groceries",
    title: "Grocery List",
    desc: "A shared list for the next market run.",
    accent: "bg-[#e3f0f2] text-[#557f88]",
    icon: (
      <>
        <path d="M6 6h15l-1.5 9h-12z" />
        <path d="M6 6 5 3H2" />
        <circle cx="9" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </>
    ),
  },
  {
    href: "/chores",
    title: "Chores",
    desc: "Gentle rhythms that keep home cared for.",
    accent: "bg-[#f8ebc9] text-[#9a7022]",
    icon: (
      <>
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
        <path d="M3 21v-5h5" />
      </>
    ),
  },
];

export default async function Home() {
  const { supabase, householdId } = await requireHousehold();
  const [{ data: household }, { data: memberships }] = await Promise.all([
    supabase.from("households").select("name").eq("id", householdId).maybeSingle(),
    supabase.from("memberships").select("user_id").eq("household_id", householdId),
  ]);
  const userIds = (memberships ?? []).map((membership) => membership.user_id);
  const { data: profiles } = userIds.length
    ? await supabase.from("user_profiles").select("user_id, display_name, avatar_path").in("user_id", userIds)
    : { data: [] };
  const avatarUrls = await signedAvatarUrls((profiles ?? []).map((profile) => profile.avatar_path));

  return (
    <main className="app-shell">
      <AppHeader />

      <section className="card botanical-card relative overflow-hidden px-6 py-8 sm:px-9 sm:py-10">
        <div className="relative z-10 max-w-lg">
          <p className="page-kicker">Your household</p>
          <h1 className="text-4xl font-semibold tracking-[-0.045em] text-stone-800 sm:text-5xl">
            Welcome home
          </h1>
          <p className="mt-3 text-base leading-7 text-stone-500">
            A calm place for everything that keeps life moving.
          </p>
          {household && (
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-stone-600">
              <span className="rounded-full bg-emerald-100/70 px-3 py-1.5 font-medium text-emerald-800">
                {household.name} household
              </span>
              <Link href="/people" className="group flex items-center rounded-full bg-[#e7f1f3] py-1 pl-1 pr-3 text-[#55737a] transition hover:bg-[#dcebee]">
                <span className="flex -space-x-2">
                  {(profiles ?? []).slice(0, 4).map((profile) => (
                    <MemberAvatar
                      key={profile.user_id}
                      src={profile.avatar_path ? avatarUrls.get(profile.avatar_path) || DEFAULT_AVATAR_URL : DEFAULT_AVATAR_URL}
                      name={profile.display_name}
                      size={28}
                      className="transition-transform group-hover:-translate-y-0.5"
                    />
                  ))}
                </span>
                <span className="ml-2 font-medium">{userIds.length} {userIds.length === 1 ? "person" : "people"}</span>
              </Link>
            </div>
          )}
        </div>
        <MeadowSprig className="absolute -bottom-2 -right-5 w-52 text-emerald-500/40 sm:w-64" />
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="page-kicker">Around the home</p>
            <h2 className="text-xl font-semibold tracking-tight text-stone-700">What needs tending?</h2>
          </div>
          <span className="hidden text-xs text-stone-400 sm:block">Choose a space</span>
        </div>
        <nav className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="card botanical-card group flex min-h-48 flex-col p-5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300/70 hover:shadow-lg"
          >
            <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${f.accent}`}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                {f.icon}
              </svg>
            </span>
            <span className="mt-5 font-semibold text-stone-800">
              {f.title}
            </span>
            <span className="mt-1 text-sm leading-5 text-stone-500">
              {f.desc}
            </span>
            <span className="mt-auto flex items-center gap-1.5 pt-4 text-xs font-semibold text-emerald-700 opacity-70 transition group-hover:opacity-100">
              Open
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </span>
          </Link>
        ))}
        </nav>
      </section>
    </main>
  );
}
