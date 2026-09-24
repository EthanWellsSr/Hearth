import { deleteTodo, toggleTodo } from "@/app/actions";
import { AssigneePicker, type AssigneeOption } from "./AssigneePicker";
import { FormSubmitButton } from "./FormSubmitButton";
import { MemberAvatar } from "./MemberAvatar";
import { TinyLeaf } from "./MeadowSprig";

type TodoItem = {
  id: string;
  text: string;
  done: boolean;
  assigneeId: string | null;
};

export function TodoList({
  items,
  members,
}: {
  items: TodoItem[];
  members: AssigneeOption[];
}) {
  if (!items.length) {
    return (
      <div className="empty-state">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100/70 text-emerald-600">
          <TinyLeaf className="h-6 w-6" />
        </span>
        <p>No To-dos yet—add your first above.</p>
      </div>
    );
  }

  const memberById = new Map(members.map((member) => [member.membershipId, member]));
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const assignee = item.assigneeId ? memberById.get(item.assigneeId) : undefined;
        return (
          <li key={item.id} className="card group flex items-start gap-3 p-3.5 transition hover:-translate-y-0.5 hover:border-emerald-300/70 hover:shadow-md sm:p-4">
            <form action={toggleTodo} className="flex">
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="done" value={String(item.done)} />
              <FormSubmitButton
                aria-label={item.done ? "Mark not done" : "Mark done"}
                pendingChildren="…"
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition ${item.done ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-200 bg-emerald-50/60 text-transparent hover:border-emerald-500"}`}
              >
                ✓
              </FormSubmitButton>
            </form>

            <div className="min-w-0 flex-1">
              <p className={item.done ? "text-stone-400 line-through" : "font-medium text-stone-700"}>{item.text}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-100/80 py-1 pl-1 pr-2.5 text-xs text-emerald-700">
                  {assignee ? (
                    <MemberAvatar src={assignee.avatarUrl} name={assignee.name} size={24} />
                  ) : (
                    <span className="h-6 w-6 rounded-full border border-dashed border-emerald-300 bg-white/60" />
                  )}
                  {assignee?.name || "Unassigned"}
                </span>
                <div className="w-full max-w-64 sm:w-auto sm:min-w-56">
                  <AssigneePicker
                    members={members}
                    initialValue={item.assigneeId || ""}
                    target={{ kind: "todo", id: item.id }}
                  />
                </div>
              </div>
            </div>

            <form action={deleteTodo} className="flex">
              <input type="hidden" name="id" value={item.id} />
              <FormSubmitButton aria-label="Delete" pendingChildren="…" className="icon-btn opacity-70 group-hover:opacity-100">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path d="m8 8 8 8m0-8-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </FormSubmitButton>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
