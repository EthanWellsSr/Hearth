import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { MeadowSprig } from "@/components/MeadowSprig";
import { loginPath, normalizeInviteCode } from "@/lib/invite";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabase as admin } from "@/lib/supabase";
import { dismissInvitation, joinInvitation } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Household invitation · Hearth",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

function InvitationShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell max-w-2xl">
      <section className="card botanical-card relative w-full overflow-hidden p-6 sm:p-10">
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex items-center gap-3 text-stone-800">
            <span className="logo-frame h-12 w-12">
              <Image src="/logo-meadow.png" alt="" width={48} height={48} priority />
            </span>
            <span className="text-2xl font-semibold tracking-[-0.04em]">Hearth</span>
          </div>
          {children}
        </div>
        <MeadowSprig className="absolute -bottom-5 -right-6 w-64 text-emerald-500/25" />
      </section>
    </main>
  );
}

function InvalidInvitation({ message }: { message?: string }) {
  return (
    <InvitationShell>
      <div>
        <p className="page-kicker">Invitation unavailable</p>
        <h1 className="page-title">This invitation cannot be used</h1>
        <p className="page-description">
          {message || "The link may be incomplete or its Invite Code may have been rotated."}
        </p>
      </div>
      <form action={dismissInvitation}>
        <button type="submit" className="btn-primary w-full sm:w-auto">
          Continue to Hearth
        </button>
      </form>
    </InvitationShell>
  );
}

export default async function InvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ code: rawCode }, query] = await Promise.all([params, searchParams]);
  const code = normalizeInviteCode(rawCode);
  if (!code) return <InvalidInvitation message={query.error} />;

  // tenant-scope: resolves an Invite Code to its Household before the User joins.
  const { data: household } = await admin
    .from("households")
    .select("id, name")
    .eq("invite_code", code)
    .maybeSingle();
  if (!household) return <InvalidInvitation message={query.error} />;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <InvitationShell>
        <div>
          <p className="page-kicker">A place is waiting</p>
          <h1 className="page-title">You’re invited to the {household.name} Household</h1>
          <p className="page-description">
            Open Hearth in this browser, then sign in with an existing account. You do not need to install anything.
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white/70 px-4 py-4 text-center">
          <span className="block text-xs font-bold uppercase tracking-[0.16em] text-stone-400">Invite Code</span>
          <strong className="mt-1 block font-mono text-2xl tracking-[0.2em] text-emerald-800">{code}</strong>
        </div>
        <Link href={loginPath({ invite: code })} className="btn-primary w-full sm:w-auto">
          Continue to Hearth
        </Link>
      </InvitationShell>
    );
  }

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("setup_completed")
      .eq("user_id", user.id)
      .maybeSingle(),
    // tenant-scope: the caller's own Membership, looked up before the Household is known.
    supabase
      .from("memberships")
      .select("household_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!profile?.setup_completed) {
    redirect(`/profile/setup?invite=${code}`);
  }

  if (membership) {
    const sameHousehold = membership.household_id === household.id;
    return (
      <InvitationShell>
        <div>
          <p className="page-kicker">Already settled in</p>
          <h1 className="page-title">
            {sameHousehold
              ? `You already belong to the ${household.name} Household`
              : "This sign-in already belongs to a Household"}
          </h1>
          <p className="page-description">
            {sameHousehold
              ? "There is nothing else to accept. You can continue directly to your Household."
              : "Hearth currently supports one Household per User. Sign out if this invitation is for a different person."}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <form action={dismissInvitation}>
            <button type="submit" className="btn-primary w-full">Open Hearth</button>
          </form>
          {!sameHousehold && (
            <form action={signOut}>
              <button type="submit" className="btn-ghost w-full">Sign out</button>
            </form>
          )}
        </div>
      </InvitationShell>
    );
  }

  return (
    <InvitationShell>
      <div>
        <p className="page-kicker">Your invitation</p>
        <h1 className="page-title">Join the {household.name} Household?</h1>
        <p className="page-description">
          Joining adds you as a Member so everyone in this Household can coordinate in Hearth together.
        </p>
      </div>
      {query.error && (
        <p role="alert" className="status-message bg-red-500/10 text-red-700">{query.error}</p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <form action={joinInvitation}>
          <input type="hidden" name="code" value={code} />
          <button type="submit" className="btn-primary w-full">Join Household</button>
        </form>
        <form action={dismissInvitation}>
          <button type="submit" className="btn-ghost w-full">Not now</button>
        </form>
      </div>
    </InvitationShell>
  );
}
