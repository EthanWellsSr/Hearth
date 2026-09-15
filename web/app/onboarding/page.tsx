import Image from "next/image";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { MeadowSprig, TinyLeaf } from "@/components/MeadowSprig";
import { createHousehold, joinHousehold } from "./actions";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireProfile();

  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (membership) redirect("/");

  return (
    <main className="app-shell max-w-4xl">
      <div className="flex items-center gap-3 text-stone-800">
        <span className="logo-frame h-11 w-11">
          <Image src="/logo-meadow.png" alt="" width={44} height={44} priority />
        </span>
        <span className="text-xl font-semibold tracking-[-0.035em]">Hearth</span>
      </div>

      <header className="relative overflow-hidden py-3 sm:py-6">
        <p className="page-kicker">Make yourself at home</p>
        <h1 className="page-title">Where are you settling in?</h1>
        <p className="page-description">Start a new household space, or join one that is already growing.</p>
        <MeadowSprig className="absolute -right-4 top-0 hidden w-48 text-emerald-500/30 sm:block" />
      </header>

      {params.error && (
        <p className="status-message bg-red-500/10 text-red-700">
          {params.error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <form action={createHousehold} className="card botanical-card flex flex-col gap-5 p-6 sm:p-7">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <TinyLeaf className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-stone-800">Begin a household</h2>
            <p className="mt-1 text-sm leading-6 text-stone-500">Create the shared space and invite someone afterward.</p>
          </div>
          <label>
            <span className="subtle-label">Household name</span>
            <input name="name" placeholder="For example, Wells" maxLength={50} className="field w-full" required />
          </label>
          <button type="submit" className="btn-primary">Create our space</button>
        </form>

        <form action={joinHousehold} className="card botanical-card flex flex-col gap-5 p-6 sm:p-7">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e2eff1] text-[#5c8790]">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M4 11.5 12 5l8 6.5V20H4v-8.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M9.5 20v-5h5v5" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          </span>
          <div>
            <h2 className="text-lg font-semibold text-stone-800">Join your household</h2>
            <p className="mt-1 text-sm leading-6 text-stone-500">Use the eight-character invitation shared with you.</p>
          </div>
          <label>
            <span className="subtle-label">Invite code</span>
            <input name="code" placeholder="HEARTH42" maxLength={8} pattern="[A-HJ-NP-Z2-9]{8}" className="field w-full uppercase tracking-[0.18em]" required />
          </label>
          <button type="submit" className="btn-primary">Join the space</button>
        </form>
      </div>
    </main>
  );
}
