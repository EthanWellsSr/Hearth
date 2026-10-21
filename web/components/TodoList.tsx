"use client";

import { useRef, useState, useTransition, type PointerEvent } from "react";
import { deleteTodo, editTodo, reorderTodo, toggleTodo } from "@/app/actions";
import { moveTodo, type TodoItem } from "@/lib/todos";
import { type AssigneeOption } from "./AssigneePicker";
import { MemberAvatar } from "./MemberAvatar";
import { TinyLeaf } from "./MeadowSprig";

export function TodoList({ items, members }: { items: TodoItem[]; members: AssigneeOption[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const drag = useRef<{ id: string; targetId: string; after: boolean; startY: number } | null>(null);

  function run(action: () => Promise<void>, success?: () => void) {
    setError(null);
    startTransition(async () => {
      try { await action(); success?.(); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn’t save. Try again."); }
    });
  }

  function move(id: string, targetId: string, after: boolean) {
    const moved = moveTodo(items, id, targetId, after);
    if (moved === items) return;
    const data = new FormData();
    data.set("id", id);
    data.set("target_id", targetId);
    data.set("after", String(after));
    run(() => reorderTodo(data), () => {
      setAnnouncement(`Moved ${items.find((item) => item.id === id)?.text}.`);
    });
  }

  function dragStart(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (pending || editing || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id, targetId: id, after: false, startY: event.clientY };
    setDragging(id);
  }

  function dragMove(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || Math.abs(event.clientY - current.startY) < 5) return;
    const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-todo-id]");
    const targetId = row?.dataset.todoId;
    const source = items.find((item) => item.id === current.id);
    const target = items.find((item) => item.id === targetId);
    if (!row || !target || source?.done !== target.done || target.id === current.id) {
      current.targetId = current.id;
      setOver(null);
      return;
    }
    current.targetId = target.id;
    current.after = event.clientY > row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2;
    setOver(`${target.id}:${current.after ? "after" : "before"}`);
    if (event.clientY < 80) window.scrollBy(0, -16);
    else if (event.clientY > window.innerHeight - 80) window.scrollBy(0, 16);
  }

  function endDrag(save: boolean) {
    const current = drag.current;
    drag.current = null;
    setDragging(null);
    setOver(null);
    if (save && current && current.id !== current.targetId) move(current.id, current.targetId, current.after);
  }

  if (!items.length) return <div className="empty-state"><TinyLeaf className="h-6 w-6" /><p>No To-dos yet—add your first above.</p></div>;

  return (
    <div aria-busy={pending}>
      {error && <p role="alert" className="mb-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <p className="sr-only" role="status">{pending ? "Saving…" : announcement}</p>
      <p className="mb-3 text-sm text-stone-500">Drag a handle or use the arrows to change the order.</p>
      <ul className="flex flex-col gap-3">
        {items.map((item, index) => {
          const assignee = members.find((member) => member.membershipId === item.assigneeId);
          const previous = items[index - 1];
          const next = items[index + 1];
          const disabled = pending || dragging !== null || editing !== null;
          return (
            <li key={item.id} data-todo-id={item.id} className={`card p-3.5 sm:p-4 ${dragging === item.id ? "opacity-60" : ""} ${over === `${item.id}:before` ? "border-t-4 border-t-emerald-600" : ""} ${over === `${item.id}:after` ? "border-b-4 border-b-emerald-600" : ""}`}>
              {item.done && !previous?.done && <h2 className="mb-3 text-sm font-semibold text-stone-500">Completed</h2>}
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex shrink-0 flex-col items-center">
                  <button type="button" aria-label={`Drag ${item.text} to reorder`} aria-describedby="todo-drag-help" disabled={pending || editing !== null} className="icon-btn touch-none cursor-grab disabled:opacity-30" onPointerDown={(event) => dragStart(event, item.id)} onPointerMove={dragMove} onPointerUp={() => endDrag(true)} onPointerCancel={() => endDrag(false)} onLostPointerCapture={() => endDrag(false)} onKeyDown={(event) => { if (event.key === "Escape") endDrag(false); }}>⠿</button>
                  <button type="button" aria-label={`Move ${item.text} up`} disabled={disabled || !previous || previous.done !== item.done} onClick={() => move(item.id, previous.id, false)} className="icon-btn disabled:opacity-25">↑</button>
                  <button type="button" aria-label={`Move ${item.text} down`} disabled={disabled || !next || next.done !== item.done} onClick={() => move(item.id, next.id, true)} className="icon-btn disabled:opacity-25">↓</button>
                </div>
                <form action={(data) => run(() => toggleTodo(data))}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="done" value={String(item.done)} />
                  <button disabled={disabled} aria-label={`${item.done ? "Reopen" : "Complete"} ${item.text}`} className={`flex h-9 w-9 items-center justify-center rounded-full border ${item.done ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-300 text-stone-500"}`}>{item.done ? "✓" : "○"}</button>
                </form>
                <div className="min-w-0 flex-1">
                  {editing === item.id ? (
                    <form onSubmit={(event) => {
                      event.preventDefault();
                      const data = new FormData(event.currentTarget);
                      run(() => editTodo(data), () => setEditing(null));
                    }} className="grid gap-3">
                      <input type="hidden" name="id" value={item.id} />
                      <label className="block"><span className="subtle-label">To-do text</span><input name="text" defaultValue={item.text} required disabled={pending} autoFocus className="field w-full" /></label>
                      <label className="block"><span className="subtle-label">Due date (optional)</span><input type="date" name="due_date" disabled={pending} defaultValue={item.dueDate || ""} className="field w-full" /></label>
                      <label className="block"><span className="subtle-label">Assignee</span><select aria-label="Assignee" name="assignee_id" disabled={pending} defaultValue={item.assigneeId || ""} className="field w-full"><option value="">Unassigned</option>{members.map((member) => <option key={member.membershipId} value={member.membershipId}>{member.name}</option>)}</select></label>
                      <div className="flex flex-wrap gap-2"><button disabled={pending} className="btn-primary">{pending ? "Saving…" : "Save"}</button><button type="button" disabled={pending} onClick={() => setEditing(null)} className="btn-ghost">Cancel</button></div>
                    </form>
                  ) : (
                    <>
                      <p className={`break-words ${item.done ? "text-stone-400 line-through" : "font-medium text-stone-700"}`}>{item.text}</p>
                      {item.dueDate && <p className="mt-1 text-sm text-stone-500">Due <time dateTime={item.dueDate}>{item.dueDate}</time></p>}
                      <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-2 py-1 text-xs text-emerald-700">{assignee && <MemberAvatar src={assignee.avatarUrl} name={assignee.name} size={24} />}{assignee?.name || "Unassigned"}</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" aria-label={`Edit ${item.text}`} disabled={disabled} onClick={() => { setError(null); setEditing(item.id); }} className="btn-ghost">Edit</button>
                        <form action={(data) => run(() => deleteTodo(data))}><input type="hidden" name="id" value={item.id} /><button aria-label={`Delete ${item.text}`} disabled={disabled} className="btn-ghost">Delete</button></form>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p id="todo-drag-help" className="sr-only">Drag to another To-do in the same section. Keyboard users can use the move up and down buttons.</p>
    </div>
  );
}
