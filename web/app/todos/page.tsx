import { requireHousehold } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { CheckableList } from "@/components/CheckableList";
import { addTodo, toggleTodo, deleteTodo } from "@/app/actions";

export default async function TodosPage() {
  const { supabase } = await requireHousehold();
  const { data: todos } = await supabase
    .from("todos")
    .select()
    .order("created_at", { ascending: true });

  const items = (todos ?? []).map((t) => ({
    id: t.id,
    label: t.text,
    checked: t.done,
  }));

  return (
    <main className="app-shell">
      <AppHeader />

      <header>
        <p className="page-kicker">A clearer mind</p>
        <h1 className="page-title">To-dos</h1>
        <p className="page-description">Set something down here, then enjoy the calm of knowing it has a place.</p>
      </header>

      <form action={addTodo} className="form-panel">
        <input name="text" placeholder="What needs doing?" aria-label="New to-do" className="field flex-1" />
        <button type="submit" className="btn-primary">
          Add to list
        </button>
      </form>

      <CheckableList
        items={items}
        toggleAction={toggleTodo}
        deleteAction={deleteTodo}
        checkedField="done"
        emptyText="No to-dos yet — add your first above."
      />
    </main>
  );
}
