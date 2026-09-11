import Link from "next/link";
import { requireHousehold } from "@/lib/auth";
import {
  addGroceryItem,
  toggleGroceryItem,
  deleteGroceryItem,
  clearBought,
} from "./actions";

export default async function GroceriesPage() {
  const { supabase } = await requireHousehold();
  const { data: items } = await supabase
    .from("grocery_items")
    .select()
    .order("bought", { ascending: true }) // unbought (false) before bought (true)
    .order("created_at", { ascending: true }); // oldest → newest within each group

  return (
    <main>
      <p>
        <Link href="/">← Home</Link>
      </p>

      <h1>Grocery List</h1>

      <form action={addGroceryItem}>
        <input name="name" placeholder="Add an item" />
        <button type="submit">Add</button>
      </form>

      <ul>
        {items?.map((item) => (
          <li key={item.id}>
            <form action={toggleGroceryItem}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="bought" value={String(item.bought)} />
              <button type="submit">{item.bought ? "☑" : "☐"}</button>
            </form>
            {item.name}
            <form action={deleteGroceryItem}>
              <input type="hidden" name="id" value={item.id} />
              <button type="submit">✕</button>
            </form>
          </li>
        ))}
      </ul>

      <form action={clearBought}>
        <button type="submit">Clear bought</button>
      </form>
    </main>
  );
}
