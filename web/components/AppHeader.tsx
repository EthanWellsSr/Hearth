import Link from "next/link";
import { signOut } from "@/app/login/actions";

export function AppHeader() {
  return (
    <header className="flex items-center justify-between">
      <Link
        href="/"
        className="flex items-center gap-2 text-stone-800 transition-opacity hover:opacity-80 dark:text-stone-100"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="h-8 w-8 rounded-full" />
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
