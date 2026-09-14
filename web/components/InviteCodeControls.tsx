"use client";

import { useState } from "react";
import { rotateInviteCode } from "@/app/people/actions";

export function InviteCodeControls({ code, householdName, owner }: {
  code: string;
  householdName: string;
  owner: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const inviteText = `Join the ${householdName} Household in Hearth with Invite Code ${code}`;

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: "Join my Household in Hearth", text: inviteText });
    } else {
      await navigator.clipboard.writeText(inviteText);
      setCopied(true);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-emerald-100 bg-white/70 px-4 py-4 text-center">
        <span className="block text-xs font-bold uppercase tracking-[0.16em] text-stone-400">Invite Code</span>
        <strong className="mt-1 block font-mono text-2xl tracking-[0.2em] text-emerald-800">{code}</strong>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void copy()} className="btn-primary flex-1">
          {copied ? "Copied" : "Copy code"}
        </button>
        <button type="button" onClick={() => void share()} className="btn-ghost flex-1 border border-emerald-200 bg-white/60">
          Share
        </button>
      </div>
      {owner && (
        <form
          action={rotateInviteCode}
          onSubmit={(event) => {
            if (!window.confirm("Rotate this Invite Code? The current code will stop working immediately.")) {
              event.preventDefault();
            }
          }}
        >
          <button type="submit" className="btn-ghost w-full text-stone-500">Rotate Invite Code</button>
        </form>
      )}
    </div>
  );
}
