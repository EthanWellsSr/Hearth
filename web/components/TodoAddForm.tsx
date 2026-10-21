"use client";

import { useRef, useState, useTransition } from "react";
import { addTodo } from "@/app/actions";
import { type AssigneeOption } from "./AssigneePicker";

export function TodoAddForm({ members }: { members: AssigneeOption[] }) {
  const form = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <form ref={form} onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      setError(null);
      startTransition(async () => {
        try { await addTodo(data); form.current?.reset(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn’t add the To-do. Try again."); }
      });
    }} className="card botanical-card grid gap-4 overflow-visible p-4 sm:grid-cols-2 sm:items-end sm:p-5">
      <label><span className="subtle-label">What needs doing?</span><input name="text" placeholder="What needs doing?" aria-label="New To-do" className="field w-full" required disabled={pending} /></label>
      <label><span className="subtle-label">Assignee</span><select aria-label="Assignee" name="assignee_id" className="field w-full" disabled={pending}><option value="">Unassigned</option>{members.map((member) => <option key={member.membershipId} value={member.membershipId}>{member.name}</option>)}</select></label>
      <label><span className="subtle-label">Due date (optional)</span><input type="date" name="due_date" aria-label="New To-do due date" className="field w-full" disabled={pending} /></label>
      <button disabled={pending} aria-busy={pending} className="btn-primary">{pending ? "Adding…" : "Add to list"}</button>
      {error && <p role="alert" className="text-sm text-rose-700 sm:col-span-2">{error}</p>}
    </form>
  );
}
