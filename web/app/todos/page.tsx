import Link from "next/link";
import { requireHousehold } from "@/lib/auth";
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
    <main>
      <p>
        <Link href="/">← Home</Link>
      </p>

      <h1>To-dos</h1>

      <form action={addTodo}>
        <input name="text" placeholder="Add a to-do" />
        <button type="submit">Add</button>
      </form>

      <CheckableList
        items={items}
        toggleAction={toggleTodo}
        deleteAction={deleteTodo}
        checkedField="done"
      />
    </main>
  );
}
