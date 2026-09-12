import Link from "next/link";
import { requireHousehold } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";

const FEATURES = [
  {
    href: "/todos",
    title: "To-dos",
    desc: "One-off tasks for the household.",
    icon: (
      <path d="M4 6h16M4 12h16M4 18h10" />
    ),
  },
  {
    href: "/groceries",
    title: "Grocery List",
    desc: "What to pick up on the next run.",
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
    desc: "Recurring tasks, on a schedule.",
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
  const { data: household } = await supabase
    .from("households")
    .select("name, invite_code")
    .eq("id", householdId)
    .maybeSingle();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 py-8">
      <AppHeader />

      <section className="flex flex-col gap-1 pt-2">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-800 dark:text-stone-50">
          Welcome home
        </h1>
        {household && (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            The {household.name} household · invite code{" "}
            <span className="rounded bg-stone-500/10 px-1.5 py-0.5 font-mono text-stone-700 dark:text-stone-200">
              {household.invite_code}
            </span>
          </p>
        )}
      </section>

      <nav className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="card flex flex-col gap-3 p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
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
            <span className="font-semibold text-stone-800 dark:text-stone-100">
              {f.title}
            </span>
            <span className="text-sm text-stone-500 dark:text-stone-400">
              {f.desc}
            </span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
