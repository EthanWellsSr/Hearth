import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { addTodo, toggleTodo } from "@/app/actions";

export default async function TodosPage() {
  const { data: todos } = await supabase
    .from("todos")
    .select()
    .order("created_at", { ascending: true });

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

      <ul>
        {todos?.map((todo) => (
          <li key={todo.id}>
            <form action={toggleTodo}>
              <input type="hidden" name="id" value={todo.id} />
              <input type="hidden" name="done" value={String(todo.done)} />
              <button type="submit">{todo.done ? "☑" : "☐"}</button>
            </form>
            {todo.text}
          </li>
        ))}
      </ul>
    </main>
  );
}
