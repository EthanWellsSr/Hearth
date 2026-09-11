import Link from "next/link";
import { requireHousehold } from "@/lib/auth";
import { CheckableList } from "@/components/CheckableList";
import {
  addGroceryItem,
  toggleGroceryItem,
  deleteGroceryItem,
  clearBought,
} from "./actions";

export default async function GroceriesPage() {
  const { supabase } = await requireHousehold();
  const { data: groceries } = await supabase
    .from("grocery_items")
    .select()
    .order("bought", { ascending: true }) // unbought (false) before bought (true)
    .order("created_at", { ascending: true }); // oldest → newest within each group

  const items = (groceries ?? []).map((g) => ({
    id: g.id,
    label: g.name,
    checked: g.bought,
  }));

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

      <CheckableList
        items={items}
        toggleAction={toggleGroceryItem}
        deleteAction={deleteGroceryItem}
        checkedField="bought"
      />

      <form action={clearBought}>
        <button type="submit">Clear bought</button>
      </form>
    </main>
  );
}
