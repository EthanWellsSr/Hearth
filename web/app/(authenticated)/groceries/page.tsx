import { requireHousehold } from "@/lib/auth";
import { CheckableList } from "@/components/CheckableList";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import {
  addGroceryItem,
  toggleGroceryItem,
  deleteGroceryItem,
  clearBought,
} from "@/app/groceries/actions";

export default async function GroceriesPage() {
  const { supabase, householdId } = await requireHousehold();
  const { data: groceries } = await supabase
    .from("grocery_items")
    .select()
    .eq("household_id", householdId)
    .order("bought", { ascending: true }) // unbought (false) before bought (true)
    .order("created_at", { ascending: true }); // oldest → newest within each group

  const items = (groceries ?? []).map((g) => ({
    id: g.id,
    label: g.name,
    checked: g.bought,
  }));
  const hasBought = items.some((i) => i.checked);

  return (
    <>
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="page-kicker">For the kitchen</p>
          <h1 className="page-title">Grocery List</h1>
          <p className="page-description">Keep the next market run simple and shared.</p>
        </div>
        {hasBought && (
          <form action={clearBought}>
            <FormSubmitButton pendingChildren="Clearing…" className="btn-ghost whitespace-nowrap">
              Clear bought
            </FormSubmitButton>
          </form>
        )}
      </header>

      <form action={addGroceryItem} className="form-panel">
        <input name="name" placeholder="What do you need?" aria-label="New grocery item" className="field flex-1" />
        <FormSubmitButton pendingChildren="Adding…" className="btn-primary">
          Add item
        </FormSubmitButton>
      </form>

      <CheckableList
        items={items}
        toggleAction={toggleGroceryItem}
        deleteAction={deleteGroceryItem}
        checkedField="bought"
        emptyText="List is empty — add what you need above."
      />
    </>
  );
}
