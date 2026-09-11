import { signIn, signUp } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main>
      <h1>Hearth</h1>
      <p>Sign in to your household.</p>

      {params.error && <p style={{ color: "crimson" }}>{params.error}</p>}
      {params.message && <p>{params.message}</p>}

      <form>
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Password" required />
        <button formAction={signIn}>Sign in</button>
        <button formAction={signUp}>Sign up</button>
      </form>
    </main>
  );
}
