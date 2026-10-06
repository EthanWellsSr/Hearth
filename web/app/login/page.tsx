import Image from "next/image";
import { signIn } from "./actions";
import { MeadowSprig } from "@/components/MeadowSprig";
import { normalizeInviteCode } from "@/lib/invite";
import { pendingInviteCode } from "@/lib/pending-invite";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; invite?: string }>;
}) {
  const params = await searchParams;
  const invite = normalizeInviteCode(params.invite) ?? (await pendingInviteCode());

  return (
    <main className="auth-shell">
      <section className="card botanical-card grid w-full overflow-hidden md:grid-cols-[0.9fr_1.1fr]">
        <div className="relative hidden min-h-[32rem] overflow-hidden bg-[#dceae0] p-10 md:flex md:flex-col md:justify-between">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#b9d7dc]/75 blur-2xl" />
          <div className="absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-[#e8d18f]/55 blur-3xl" />
          <p className="relative z-10 text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">A softer rhythm for home</p>
          <div className="relative z-10">
            <p className="max-w-xs text-3xl font-semibold leading-tight tracking-[-0.04em] text-emerald-950">
              Care for the everyday, together.
            </p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-emerald-800/70">
              One calm place for the lists, routines, and little things that make a home feel cared for.
            </p>
          </div>
          <MeadowSprig className="absolute -bottom-2 -left-2 w-[24rem] text-emerald-700/50" />
        </div>

        <div className="flex flex-col justify-center gap-6 p-6 sm:p-9 md:p-12">
          <div className="flex items-center gap-3 text-stone-800">
            <span className="logo-frame h-12 w-12">
              <Image src="/logo-meadow.png" alt="" width={48} height={48} priority />
            </span>
            <span className="text-2xl font-semibold tracking-[-0.04em]">Hearth</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="page-kicker">Welcome back</p>
            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-stone-800">
              Come on in
            </h1>
            <p className="text-sm leading-6 text-stone-500">
              {invite
                ? "Sign in to continue your Household invitation."
                : "Sign in to your shared household space."}
            </p>
          </div>

          {params.error && (
            <p className="status-message bg-red-500/10 text-red-700">
              {params.error}
            </p>
          )}
          {params.message && (
            <p className="status-message bg-emerald-100/80 text-emerald-800">
              {params.message}
            </p>
          )}

          <form className="flex flex-col gap-4">
            {invite && <input type="hidden" name="invite" value={invite} />}
            <label>
              <span className="subtle-label">Email</span>
              <input name="email" type="email" placeholder="you@example.com" required className="field w-full" />
            </label>
            <label>
              <span className="subtle-label">Password</span>
              <input name="password" type="password" placeholder="Your password" required className="field w-full" />
            </label>
            <button className="btn-primary mt-1 w-full" formAction={signIn}>
              Enter Hearth
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
