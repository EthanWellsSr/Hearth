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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-8">
      <AppHeader />

      <h1 className="text-2xl font-semibold tracking-tight text-stone-800 dark:text-stone-50">
        To-dos
      </h1>

      <form action={addTodo} className="flex gap-2">
        <input name="text" placeholder="Add a to-do" className="field flex-1" />
        <button type="submit" className="btn-primary">
          Add
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
