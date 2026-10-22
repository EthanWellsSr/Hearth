export type TodoItem = {
  id: string;
  text: string;
  done: boolean;
  assigneeId: string | null;
  dueDate: string | null;
};

export function todoFields(formData: FormData) {
  const text = String(formData.get("text") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "");
  if (!text) throw new Error("Enter text for the To-do.");
  if (dueDate && (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
    !Number.isFinite(Date.parse(`${dueDate}T00:00:00Z`)) ||
    new Date(`${dueDate}T00:00:00Z`).toISOString().slice(0, 10) !== dueDate ||
    dueDate.startsWith("0000"))) {
    throw new Error("Enter a valid due date.");
  }
  return { text, due_date: dueDate || null };
}

// Keep completion sections separate while previewing a move. The database
// independently validates this and applies the move against its current order.
export function moveTodo(items: TodoItem[], id: string, targetId: string, after: boolean) {
  const item = items.find((item) => item.id === id);
  const target = items.find((item) => item.id === targetId);
  if (!item || !target || item.id === target.id || item.done !== target.done) return items;
  const rest = items.filter((item) => item.id !== id);
  rest.splice(rest.findIndex((item) => item.id === targetId) + Number(after), 0, item);
  return rest;
}
