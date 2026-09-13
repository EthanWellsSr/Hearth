import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { TinyLeaf } from "./MeadowSprig";

export function AppHeader() {
  return (
    <header className="card flex items-center justify-between rounded-full px-3 py-2.5 sm:px-4">
      <Link
        href="/"
        className="group flex items-center gap-2.5 text-stone-800"
      >
        <span className="logo-frame h-9 w-9 transition-transform duration-300 group-hover:rotate-[-3deg]">
          <Image src="/logo-meadow.png" alt="" width={36} height={36} priority />
        </span>
        <span className="text-lg font-semibold tracking-[-0.035em]">Hearth</span>
      </Link>
      <form action={signOut}>
        <button type="submit" className="btn-ghost min-h-9 px-3">
          <TinyLeaf className="h-4 w-4 text-emerald-500" />
          Sign out
        </button>
      </form>
    </header>
  );
}
