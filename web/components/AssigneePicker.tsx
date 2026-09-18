"use client";

import { useRef, useState, useTransition } from "react";
import { reassignChore } from "@/app/chores/actions";
import { reassignTodo } from "@/app/actions";
import { MemberAvatar } from "./MemberAvatar";

export type AssigneeOption = {
  membershipId: string;
  name: string;
  avatarUrl: string;
};

function UnassignedAvatar() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-stone-300 bg-stone-50 text-stone-400">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c.7-3.3 3.2-5 7-5s6.3 1.7 7 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function AssigneePicker({
  members,
  initialValue = "",
  target,
}: {
  members: AssigneeOption[];
  initialValue?: string;
  target?: { kind: "chore" | "todo"; id: string };
}) {
  const [selectedId, setSelectedId] = useState(initialValue);
  const [pending, startTransition] = useTransition();
  const details = useRef<HTMLDetailsElement>(null);
  const selected = members.find((member) => member.membershipId === selectedId);

  function choose(nextId: string) {
    setSelectedId(nextId);
    details.current?.removeAttribute("open");
    if (target) {
      const formData = new FormData();
      formData.set("id", target.id);
      formData.set("assignee_id", nextId);
      startTransition(() => {
        if (target.kind === "chore") void reassignChore(formData);
        else void reassignTodo(formData);
      });
    }
  }

  return (
    <details ref={details} className="assignee-picker relative">
      {!target && <input type="hidden" name="assignee_id" value={selectedId} />}
      <summary className="field flex cursor-pointer list-none items-center gap-2 py-1.5 pr-10">
        {selected ? <MemberAvatar src={selected.avatarUrl} name={selected.name} size={32} /> : <UnassignedAvatar />}
        <span className="min-w-0 flex-1 truncate">{pending ? "Saving…" : selected?.name || "Unassigned"}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="absolute right-3 h-4 w-4 text-stone-400">
          <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="absolute left-0 top-[calc(100%+0.4rem)] z-30 max-h-64 w-full min-w-56 overflow-auto rounded-2xl border border-emerald-100 bg-[#fffdf8] p-2 shadow-xl">
        <button type="button" onClick={() => choose("")} className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm text-stone-600 hover:bg-emerald-50">
          <UnassignedAvatar />
          Unassigned
        </button>
        {members.map((member) => (
          <button
            key={member.membershipId}
            type="button"
            onClick={() => choose(member.membershipId)}
            className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-medium text-stone-700 hover:bg-emerald-50"
          >
            <MemberAvatar src={member.avatarUrl} name={member.name} size={32} />
            <span className="truncate">{member.name}</span>
          </button>
        ))}
      </div>
    </details>
  );
}
