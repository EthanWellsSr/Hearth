import Link from "next/link";
import { PlantMark } from "./PlantMark";
import { signOut } from "@/app/login/actions";

export function AppHeader() {
  return (
    <header className="flex items-center justify-between">
      <Link
        href="/"
        className="flex items-center gap-2 text-emerald-800 transition-colors hover:text-emerald-600 dark:text-emerald-300 dark:hover:text-emerald-200"
      >
        <span className="h-7 w-7">
          <PlantMark />
        </span>
        <span className="text-lg font-semibold tracking-tight">Hearth</span>
      </Link>
      <form action={signOut}>
        <button type="submit" className="btn-ghost">
          Sign out
        </button>
      </form>
    </header>
  );
}
