import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createHousehold, joinHousehold } from "./actions";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (membership) redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-10">
      <div className="flex items-center gap-2 text-stone-800 dark:text-stone-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="h-10 w-10 rounded-full" />
        <span className="text-xl font-semibold tracking-tight">Hearth</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-800 dark:text-stone-50">
          Set up your household
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Create a new household, or join one with an invite code.
        </p>
      </div>

      {params.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {params.error}
        </p>
      )}

      <form action={createHousehold} className="card flex flex-col gap-3 p-5">
        <h2 className="font-semibold text-stone-800 dark:text-stone-100">
          Create a household
        </h2>
        <input
          name="name"
          placeholder="Household name (e.g. Wells)"
          className="field"
          required
        />
        <button type="submit" className="btn-primary">
          Create
        </button>
      </form>

      <form action={joinHousehold} className="card flex flex-col gap-3 p-5">
        <h2 className="font-semibold text-stone-800 dark:text-stone-100">
          Join a household
        </h2>
        <input
          name="code"
          placeholder="Invite code"
          className="field uppercase"
          required
        />
        <button type="submit" className="btn-ghost">
          Join
        </button>
      </form>
    </main>
  );
}
