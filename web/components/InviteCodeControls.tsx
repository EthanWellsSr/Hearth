"use client";

import { useEffect, useRef, useState } from "react";
import { rotateInviteCode } from "@/app/people/actions";
import { inviteShareContent, inviteUrl } from "@/lib/invite";

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.readOnly = true;
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } finally {
    field.remove();
  }
  if (!copied) throw new Error("Clipboard is unavailable");
}

type ManualFallback = {
  label: "Invitation link" | "Invite Code";
  value: string;
  share?: ReturnType<typeof inviteShareContent>;
};

export function InviteCodeControls({ code, householdName, owner }: {
  code: string;
  householdName: string;
  owner: boolean;
}) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [manualFallback, setManualFallback] = useState<ManualFallback | null>(null);
  const fallbackField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (manualFallback) fallbackField.current?.select();
  }, [manualFallback]);

  async function copy(value: string, kind: "code" | "link") {
    setManualFallback(null);
    try {
      await copyText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setManualFallback({
        label: kind === "code" ? "Invite Code" : "Invitation link",
        value,
      });
    }
  }

  async function share() {
    const content = inviteShareContent(householdName, code, window.location.origin);
    setManualFallback(null);
    try {
      if (navigator.share) {
        await navigator.share(content);
      } else {
        setManualFallback({ label: "Invitation link", value: content.url, share: content });
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setManualFallback({ label: "Invitation link", value: content.url, share: content });
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-emerald-100 bg-white/70 px-4 py-4 text-center">
        <span className="block text-xs font-bold uppercase tracking-[0.16em] text-stone-400">Invite Code</span>
        <strong className="mt-1 block font-mono text-2xl tracking-[0.2em] text-emerald-800">{code}</strong>
        <button
          type="button"
          onClick={() => void copy(code, "code")}
          className="mt-2 text-xs font-semibold text-stone-500 underline decoration-emerald-200 underline-offset-4"
        >
          {copied === "code" ? "Code copied" : "Copy code only"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            const url = inviteUrl(code, window.location.origin);
            if (url) void copy(url, "link");
          }}
          className="btn-primary flex-1"
        >
          {copied === "link" ? "Link copied" : "Copy invitation link"}
        </button>
        <button type="button" onClick={() => void share()} className="btn-ghost flex-1 border border-emerald-200 bg-white/60">
          Share invitation
        </button>
      </div>
      {manualFallback && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4">
          <p className="text-sm font-semibold text-stone-700">
            {manualFallback.share ? "Share another way" : "Copy manually"}
          </p>
          <label className="mt-3 block">
            <span className="subtle-label">{manualFallback.label}</span>
            <input
              ref={fallbackField}
              aria-label={manualFallback.label}
              readOnly
              value={manualFallback.value}
              onFocus={(event) => event.currentTarget.select()}
              className="field w-full font-mono text-xs"
            />
          </label>
          <p className="mt-2 text-xs leading-5 text-stone-500">
            Press and hold the field to copy it.
          </p>
          {manualFallback.share && (
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={`sms:?body=${encodeURIComponent(`${manualFallback.share.text}\n${manualFallback.share.url}`)}`}
                className="btn-primary flex-1"
              >
                Send by text
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(manualFallback.share.title)}&body=${encodeURIComponent(`${manualFallback.share.text}\n${manualFallback.share.url}`)}`}
                className="btn-ghost flex-1 border border-sky-200 bg-white/70"
              >
                Send by email
              </a>
            </div>
          )}
        </div>
      )}
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
