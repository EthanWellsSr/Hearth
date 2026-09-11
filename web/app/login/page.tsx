import { PlantMark } from "@/components/PlantMark";
import { signIn, signUp } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="card flex w-full max-w-sm flex-col gap-5 p-7">
        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
          <span className="h-8 w-8">
            <PlantMark />
          </span>
          <span className="text-xl font-semibold tracking-tight">Hearth</span>
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-stone-800 dark:text-stone-100">
            Sign in to your household
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Your home, organized together.
          </p>
        </div>

        {params.error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {params.error}
          </p>
        )}
        {params.message && (
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
            {params.message}
          </p>
        )}

        <form className="flex flex-col gap-3">
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="field"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className="field"
          />
          <div className="flex gap-2 pt-1">
            <button className="btn-primary flex-1" formAction={signIn}>
              Sign in
            </button>
            <button className="btn-ghost flex-1" formAction={signUp}>
              Sign up
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
