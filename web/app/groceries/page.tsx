import { requireHousehold } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
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
  const hasBought = items.some((i) => i.checked);

  return (
    <main className="app-shell">
      <AppHeader />

      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="page-kicker">For the kitchen</p>
          <h1 className="page-title">Grocery List</h1>
          <p className="page-description">Keep the next market run simple and shared.</p>
        </div>
        {hasBought && (
          <form action={clearBought}>
            <button type="submit" className="btn-ghost whitespace-nowrap">
              Clear bought
            </button>
          </form>
        )}
      </header>

      <form action={addGroceryItem} className="form-panel">
        <input name="name" placeholder="What do you need?" aria-label="New grocery item" className="field flex-1" />
        <button type="submit" className="btn-primary">
          Add item
        </button>
      </form>

      <CheckableList
        items={items}
        toggleAction={toggleGroceryItem}
        deleteAction={deleteGroceryItem}
        checkedField="bought"
        emptyText="List is empty — add what you need above."
      />
    </main>
  );
}
