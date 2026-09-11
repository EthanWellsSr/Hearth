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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-8">
      <AppHeader />

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-800 dark:text-stone-50">
          Grocery List
        </h1>
        {hasBought && (
          <form action={clearBought}>
            <button type="submit" className="btn-ghost">
              Clear bought
            </button>
          </form>
        )}
      </div>

      <form action={addGroceryItem} className="flex gap-2">
        <input name="name" placeholder="Add an item" className="field flex-1" />
        <button type="submit" className="btn-primary">
          Add
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
