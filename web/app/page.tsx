import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { signOut } from "./login/actions";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main>
      <h1>Hearth</h1>

      <nav>
        <ul>
          <li>
            <Link href="/todos">To-dos</Link>
          </li>
          <li>
            <Link href="/groceries">Grocery List</Link>
          </li>
        </ul>
      </nav>

      <form action={signOut}>
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}
