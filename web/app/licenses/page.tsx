import type { Metadata } from "next";
import Link from "next/link";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseThirdPartyNotices } from "@/lib/third-party-notices";

export const metadata: Metadata = { title: "Licenses · Hearth" };

// The generated text file stays the source of truth; this page only formats it.
const notices = parseThirdPartyNotices(
  readFileSync(path.join(process.cwd(), "public", "legal", "THIRD_PARTY_NOTICES.txt"), "utf8"),
);

export default function LicensesPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10">
      <div className="rounded-[1.4rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-10">
        <Link href="/" className="text-sm text-emerald-700 underline-offset-4 hover:underline">
          ← Back to Hearth
        </Link>
        <h1 className="mt-4 text-3xl font-semibold text-stone-900">Third-party licenses</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Hearth is built on open-source software. These are the production packages it ships
          with and the license terms that apply to them.{" "}
          <a
            className="underline decoration-stone-300 underline-offset-4 hover:text-stone-900"
            href="/legal/THIRD_PARTY_NOTICES.txt"
          >
            Plain-text version
          </a>
        </p>

        <h2 className="mt-10 text-lg font-semibold text-stone-900">
          Packages <span className="font-normal text-stone-500">({notices.packages.length})</span>
        </h2>
        <ul className="mt-3 divide-y divide-stone-100 border-y border-stone-100">
          {notices.packages.map((pkg) => (
            <li key={pkg.name} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
              <span className="break-all font-mono text-sm text-stone-800">{pkg.name}</span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                {pkg.license}
              </span>
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-lg font-semibold text-stone-900">License and notice texts</h2>
        <div className="mt-3 space-y-2">
          {notices.texts.map((notice, index) => (
            <details key={index} className="group rounded-xl border border-stone-200">
              <summary className="cursor-pointer px-4 py-3 text-sm text-stone-800 marker:text-stone-400">
                <span className="break-all font-mono">{notice.appliesTo.join(", ")}</span>
              </summary>
              <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words border-t border-stone-100 bg-stone-50 px-4 py-3 font-mono text-xs leading-5 text-stone-700">
                {notice.text}
              </pre>
            </details>
          ))}
        </div>
      </div>
    </main>
  );
}
