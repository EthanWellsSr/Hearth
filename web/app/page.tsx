import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Sprout } from "@/components/Sprout";
import { signOut } from "./login/actions";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main>
      <h1 className="wordmark">
        <Sprout />
        Hearth
      </h1>

      <nav>
        <ul className="tiles">
          <li>
            <Link href="/todos" className="tile">
              To-dos
            </Link>
          </li>
          <li>
            <Link href="/groceries" className="tile">
              Grocery List
            </Link>
          </li>
          <li>
            <Link href="/chores" className="tile">
              Chores
            </Link>
          </li>
        </ul>
      </nav>

      <form action={signOut}>
        <button type="submit" className="btn-ghost">
          Sign out
        </button>
      </form>
    </main>
  );
}
