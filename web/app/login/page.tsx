import { PlantMark } from "@/components/PlantMark";
import { signIn, signUp } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="auth">
      <h1 className="wordmark">
        <PlantMark />
        Hearth
      </h1>
      <p className="muted">Sign in to your household.</p>

      {params.error && <p className="error">{params.error}</p>}
      {params.message && <p className="muted">{params.message}</p>}

      <form className="auth-form">
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Password" required />
        <div className="buttons">
          <button className="btn-primary" formAction={signIn}>
            Sign in
          </button>
          <button className="btn-ghost" formAction={signUp}>
            Sign up
          </button>
        </div>
      </form>
    </main>
  );
}
